/**
 * Converts raw OpenF1 JSON into columnar typed arrays and reads samples back
 * out by interpolation.
 *
 * Two things matter here:
 *  - The parsed JSON objects are dropped as soon as their numbers are copied
 *    into the typed arrays, so peak heap is bounded by one endpoint response
 *    rather than by the whole race.
 *  - Reads use a per-driver cursor that walks forward, so the common case
 *    (playback advancing a few ms) costs a couple of comparisons instead of a
 *    binary search over ~46k samples.
 */

import type {
  DriverCarData,
  DriverPath,
  DrsState,
  IntervalTrack,
  Of1CarData,
  Of1Interval,
  Of1Location,
  Of1Position,
  PositionTrack,
} from './types';

/**
 * OpenF1 pads sessions with placeholder rows at the origin before the cars are
 * on track. Left in, they drag every car to (0,0) at the start of the replay.
 */
function isOriginPlaceholder(p: Of1Location): boolean {
  return p.x === 0 && p.y === 0 && p.z === 0;
}

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

export function packLocations(rows: Of1Location[], epochMs: number, driverNumber: number): DriverPath {
  const kept: Of1Location[] = [];
  for (const r of rows) {
    if (isOriginPlaceholder(r)) continue;
    if (r.x == null || r.y == null) continue;
    kept.push(r);
  }
  kept.sort((a, b) => a.date.localeCompare(b.date));

  const n = kept.length;
  const t = new Uint32Array(n);
  const x = new Int32Array(n);
  const y = new Int32Array(n);

  let w = 0;
  for (let i = 0; i < n; i++) {
    const ms = Date.parse(kept[i].date) - epochMs;
    if (!Number.isFinite(ms) || ms < 0) continue;
    // Collapse duplicate timestamps; they break interpolation denominators.
    if (w > 0 && t[w - 1] === ms) continue;
    t[w] = ms;
    x[w] = Math.round(kept[i].x);
    y[w] = Math.round(kept[i].y);
    w++;
  }

  return {
    driverNumber,
    n: w,
    t: t.subarray(0, w),
    x: x.subarray(0, w),
    y: y.subarray(0, w),
  };
}

export function packCarData(rows: Of1CarData[], epochMs: number, driverNumber: number): DriverCarData {
  const sorted = rows.slice().sort((a, b) => a.date.localeCompare(b.date));
  const n = sorted.length;

  const t = new Uint32Array(n);
  const speed = new Uint16Array(n);
  const rpm = new Uint16Array(n);
  const gear = new Int8Array(n);
  const throttle = new Uint8Array(n);
  const brake = new Uint8Array(n);
  const drs = new Uint8Array(n);

  let w = 0;
  for (let i = 0; i < n; i++) {
    const r = sorted[i];
    const ms = Date.parse(r.date) - epochMs;
    if (!Number.isFinite(ms) || ms < 0) continue;
    if (w > 0 && t[w - 1] === ms) continue;
    t[w] = ms;
    speed[w] = clamp(r.speed ?? 0, 0, 400);
    rpm[w] = clamp(r.rpm ?? 0, 0, 20000);
    gear[w] = clamp(r.n_gear ?? 0, -1, 8);
    throttle[w] = clamp(r.throttle ?? 0, 0, 100);
    brake[w] = clamp(r.brake ?? 0, 0, 100);
    drs[w] = clamp(r.drs ?? 0, 0, 255);
    w++;
  }

  return {
    driverNumber,
    n: w,
    t: t.subarray(0, w),
    speed: speed.subarray(0, w),
    rpm: rpm.subarray(0, w),
    gear: gear.subarray(0, w),
    throttle: throttle.subarray(0, w),
    brake: brake.subarray(0, w),
    drs: drs.subarray(0, w),
  };
}

/**
 * Step series carry state, not events: a driver's position is only written when
 * it *changes*. OpenF1 stamps the starting grid up to an hour before the green
 * flag, so discarding pre-epoch rows the way `packLocations` does would throw
 * away every driver's starting position and leave the running order wrong until
 * their first overtake. Instead those rows are clamped onto t=0, where the last
 * one before the epoch wins — which is exactly the state the race starts in.
 */
export function packPositions(rows: Of1Position[], epochMs: number, driverNumber: number): PositionTrack {
  const sorted = rows.slice().sort((a, b) => a.date.localeCompare(b.date));
  const t = new Uint32Array(sorted.length);
  const position = new Uint8Array(sorted.length);

  let w = 0;
  for (const r of sorted) {
    const raw = Date.parse(r.date) - epochMs;
    if (!Number.isFinite(raw)) continue;
    const ms = Math.max(0, raw);
    const value = clamp(r.position ?? 0, 0, 30);

    if (w > 0 && t[w - 1] === ms) {
      position[w - 1] = value;
      continue;
    }
    t[w] = ms;
    position[w] = value;
    w++;
  }

  return { driverNumber, n: w, t: t.subarray(0, w), position: position.subarray(0, w) };
}

/** Clamps pre-epoch rows onto t=0 for the same reason as {@link packPositions}. */
export function packIntervals(rows: Of1Interval[], epochMs: number, driverNumber: number): IntervalTrack {
  const sorted = rows.slice().sort((a, b) => a.date.localeCompare(b.date));
  const t = new Uint32Array(sorted.length);
  const interval = new Float32Array(sorted.length);
  const gapToLeader = new Float32Array(sorted.length);

  let w = 0;
  for (const r of sorted) {
    const raw = Date.parse(r.date) - epochMs;
    if (!Number.isFinite(raw)) continue;
    const ms = Math.max(0, raw);
    // OpenF1 sends null for lapped cars; NaN keeps the column numeric while
    // still being distinguishable from a genuine 0.0s gap.
    const iv = typeof r.interval === 'number' ? r.interval : NaN;
    const gl = typeof r.gap_to_leader === 'number' ? r.gap_to_leader : NaN;

    if (w > 0 && t[w - 1] === ms) {
      interval[w - 1] = iv;
      gapToLeader[w - 1] = gl;
      continue;
    }
    t[w] = ms;
    interval[w] = iv;
    gapToLeader[w] = gl;
    w++;
  }

  return {
    driverNumber,
    n: w,
    t: t.subarray(0, w),
    interval: interval.subarray(0, w),
    gapToLeader: gapToLeader.subarray(0, w),
  };
}

/* ------------------------------------------------------------------ */
/* Lookup                                                              */
/* ------------------------------------------------------------------ */

/** Mutable read cursor. One per driver per series, reused across frames. */
export interface Cursor {
  i: number;
}

export const newCursor = (): Cursor => ({ i: 0 });

/**
 * Index of the last sample at or before `time`, or -1 if `time` precedes the
 * first sample. Advances `cursor` in place; falls back to binary search when
 * the caller jumps (scrubbing, rewind).
 */
export function seek(t: Uint32Array, n: number, time: number, cursor: Cursor): number {
  if (n === 0) return -1;
  if (time < t[0]) {
    cursor.i = 0;
    return -1;
  }
  if (time >= t[n - 1]) {
    cursor.i = n - 1;
    return n - 1;
  }

  let i = cursor.i;
  if (i < 0 || i >= n) i = 0;

  if (t[i] <= time) {
    // Forward walk covers normal playback in a handful of steps.
    let steps = 0;
    while (i + 1 < n && t[i + 1] <= time && steps < 64) {
      i++;
      steps++;
    }
    if (i + 1 >= n || t[i + 1] > time) {
      cursor.i = i;
      return i;
    }
  }

  let lo = 0;
  let hi = n - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (t[mid] <= time) lo = mid;
    else hi = mid - 1;
  }
  cursor.i = lo;
  return lo;
}

export interface Point {
  x: number;
  y: number;
}

/**
 * Interpolated position at `time`. Returns null before the driver's first
 * sample or once the trail has gone stale (car retired, sitting in the garage).
 */
export function samplePath(
  path: DriverPath,
  time: number,
  cursor: Cursor,
  maxGapMs = 5000
): Point | null {
  const i = seek(path.t, path.n, time, cursor);
  if (i < 0) return null;
  if (i >= path.n - 1) {
    return time - path.t[path.n - 1] > maxGapMs ? null : { x: path.x[i], y: path.y[i] };
  }

  const t0 = path.t[i];
  const t1 = path.t[i + 1];
  if (t1 - t0 > maxGapMs) return { x: path.x[i], y: path.y[i] };

  const f = (time - t0) / (t1 - t0);
  return {
    x: path.x[i] + (path.x[i + 1] - path.x[i]) * f,
    y: path.y[i] + (path.y[i + 1] - path.y[i]) * f,
  };
}

export interface CarSample {
  speed: number;
  rpm: number;
  gear: number;
  throttle: number;
  brake: number;
  drs: DrsState;
}

/**
 * Telemetry at `time`. Speed and RPM are interpolated because they read as
 * continuous; gear, brake and DRS are held at the last sample because
 * interpolating a discrete state produces values that never occurred.
 */
export function sampleCarData(car: DriverCarData, time: number, cursor: Cursor): CarSample | null {
  const i = seek(car.t, car.n, time, cursor);
  if (i < 0) return null;

  let speed = car.speed[i];
  let rpm = car.rpm[i];

  if (i < car.n - 1) {
    const t0 = car.t[i];
    const t1 = car.t[i + 1];
    if (t1 > t0 && t1 - t0 < 5000) {
      const f = (time - t0) / (t1 - t0);
      speed = car.speed[i] + (car.speed[i + 1] - car.speed[i]) * f;
      rpm = car.rpm[i] + (car.rpm[i + 1] - car.rpm[i]) * f;
    }
  }

  return {
    speed: Math.round(speed),
    rpm: Math.round(rpm),
    gear: car.gear[i],
    throttle: car.throttle[i],
    brake: car.brake[i],
    drs: drsStateFromCode(car.drs[i]),
  };
}

/**
 * OpenF1 forwards the raw F1 DRS byte. Codes 10, 12 and 14 mean the flap is
 * open; 8 means the car is within a second at the detection point and may open
 * it; everything else is closed.
 */
export function drsStateFromCode(code: number): DrsState {
  if (code === 10 || code === 12 || code === 14) return 'on';
  if (code === 8) return 'eligible';
  return 'off';
}
