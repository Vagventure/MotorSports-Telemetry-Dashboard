/**
 * Builds the circuit outline from telemetry.
 *
 * There is no "track shape" endpoint. The racing line *is* the circuit: take
 * one clean flying lap of one driver, resample and smooth its (x, y) trail, and
 * that polyline is the centreline. Offsetting it along its normals produces the
 * two kerb-to-kerb edges the reference renderer draws.
 *
 * Coordinates are OpenF1's tenths of a metre throughout; only the formatting
 * helpers convert to metres.
 */

import type { DriverCarData, DriverPath } from './types';
import { drsStateFromCode } from './packing';

/** Tenths of a metre between resampled centreline points (~2 m). */
const RESAMPLE_SPACING = 20;
/** Half the drawn track width, in tenths of a metre (~8.5 m each side). */
const DEFAULT_HALF_WIDTH = 85;
/** Window size for the moving-average smoother, in points. */
const SMOOTH_WINDOW = 5;

export interface TrackGeometry {
  /** Closed, uniformly spaced centreline. */
  cx: Float32Array;
  cy: Float32Array;
  /** Cumulative arc length at each centreline point. */
  s: Float32Array;
  /** Total lap length in tenths of a metre. */
  length: number;
  n: number;
  /** Half the drawn track width, in tenths of a metre. */
  halfWidth: number;
  bounds: { minX: number; maxX: number; minY: number; maxY: number };
  /** Spatial index over the centreline, for nearest-point queries. */
  grid: TrackGrid;
}

interface TrackGrid {
  cellSize: number;
  minX: number;
  minY: number;
  cols: number;
  rows: number;
  cells: Int32Array[];
}

/** A contiguous stretch of track where DRS is used, as arc-length bounds. */
export interface DrsZone {
  startS: number;
  endS: number;
}

/**
 * Extracts the centreline from the samples of `path` that fall inside
 * [lapStartMs, lapEndMs]. Returns null when the window is too sparse to
 * describe a lap.
 */
export function buildTrack(
  path: DriverPath,
  lapStartMs: number,
  lapEndMs: number,
  halfWidth = DEFAULT_HALF_WIDTH
): TrackGeometry | null {
  const rawX: number[] = [];
  const rawY: number[] = [];

  for (let i = 0; i < path.n; i++) {
    const t = path.t[i];
    if (t < lapStartMs) continue;
    if (t > lapEndMs) break;
    rawX.push(path.x[i]);
    rawY.push(path.y[i]);
  }

  if (rawX.length < 50) return null;

  const [sx, sy] = smoothClosed(rawX, rawY, SMOOTH_WINDOW);
  const [ux, uy] = resampleUniform(sx, sy, RESAMPLE_SPACING);
  if (ux.length < 20) return null;

  const n = ux.length;
  const cx = Float32Array.from(ux);
  const cy = Float32Array.from(uy);

  const s = new Float32Array(n);
  let total = 0;
  for (let i = 1; i < n; i++) {
    total += Math.hypot(cx[i] - cx[i - 1], cy[i] - cy[i - 1]);
    s[i] = total;
  }
  const closingLeg = Math.hypot(cx[0] - cx[n - 1], cy[0] - cy[n - 1]);
  const length = total + closingLeg;

  // The road is drawn by stroking the centreline twice — a wide light stroke
  // for the kerbs, a narrower dark one on top — rather than by building offset
  // polygons. Stroking cannot self-intersect, which offset polygons do on tight
  // hairpins where the inner edge folds back through itself.
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (let i = 0; i < n; i++) {
    if (cx[i] < minX) minX = cx[i];
    if (cx[i] > maxX) maxX = cx[i];
    if (cy[i] < minY) minY = cy[i];
    if (cy[i] > maxY) maxY = cy[i];
  }

  const bounds = {
    minX: minX - halfWidth,
    maxX: maxX + halfWidth,
    minY: minY - halfWidth,
    maxY: maxY + halfWidth,
  };
  const grid = buildGrid(cx, cy, n, bounds);

  return { cx, cy, s, length, n, halfWidth, bounds, grid };
}

/** Moving average that wraps around the loop, to knock the GPS jitter down. */
function smoothClosed(xs: number[], ys: number[], window: number): [number[], number[]] {
  const n = xs.length;
  const half = Math.floor(window / 2);
  const ox = new Array<number>(n);
  const oy = new Array<number>(n);

  for (let i = 0; i < n; i++) {
    let sx = 0;
    let sy = 0;
    for (let k = -half; k <= half; k++) {
      const j = (i + k + n) % n;
      sx += xs[j];
      sy += ys[j];
    }
    ox[i] = sx / window;
    oy[i] = sy / window;
  }
  return [ox, oy];
}

/** Walks the polyline emitting a point every `spacing` units of arc length. */
function resampleUniform(xs: number[], ys: number[], spacing: number): [number[], number[]] {
  const ox: number[] = [xs[0]];
  const oy: number[] = [ys[0]];

  let carry = 0;
  for (let i = 1; i < xs.length; i++) {
    const dx = xs[i] - xs[i - 1];
    const dy = ys[i] - ys[i - 1];
    const segLen = Math.hypot(dx, dy);
    if (segLen === 0) continue;

    let travelled = spacing - carry;
    while (travelled <= segLen) {
      const f = travelled / segLen;
      ox.push(xs[i - 1] + dx * f);
      oy.push(ys[i - 1] + dy * f);
      travelled += spacing;
    }
    carry = segLen - (travelled - spacing);
  }

  // Drop a trailing point that has wrapped back onto the first one.
  if (ox.length > 2 && Math.hypot(ox[ox.length - 1] - ox[0], oy[oy.length - 1] - oy[0]) < spacing) {
    ox.pop();
    oy.pop();
  }
  return [ox, oy];
}

function buildGrid(
  cx: Float32Array,
  cy: Float32Array,
  n: number,
  bounds: { minX: number; maxX: number; minY: number; maxY: number }
): TrackGrid {
  const cellSize = RESAMPLE_SPACING * 20;
  const cols = Math.max(1, Math.ceil((bounds.maxX - bounds.minX) / cellSize) + 1);
  const rows = Math.max(1, Math.ceil((bounds.maxY - bounds.minY) / cellSize) + 1);

  const buckets: number[][] = Array.from({ length: cols * rows }, () => []);
  for (let i = 0; i < n; i++) {
    const c = Math.floor((cx[i] - bounds.minX) / cellSize);
    const r = Math.floor((cy[i] - bounds.minY) / cellSize);
    const idx = r * cols + c;
    if (idx >= 0 && idx < buckets.length) buckets[idx].push(i);
  }

  return {
    cellSize,
    minX: bounds.minX,
    minY: bounds.minY,
    cols,
    rows,
    cells: buckets.map((b) => Int32Array.from(b)),
  };
}

/**
 * Arc-length position of (x, y) projected onto the centreline. Used to turn a
 * pair of car positions into a gap in metres.
 */
export function projectToTrack(track: TrackGeometry, x: number, y: number): number {
  const { grid } = track;
  const c = Math.floor((x - grid.minX) / grid.cellSize);
  const r = Math.floor((y - grid.minY) / grid.cellSize);

  let best = -1;
  let bestDist = Infinity;

  // Widen the search ring until something is found; one ring is almost always
  // enough, but a car in a run-off area can sit outside the populated cells.
  for (let ring = 1; ring <= 3 && best < 0; ring++) {
    for (let dr = -ring; dr <= ring; dr++) {
      for (let dc = -ring; dc <= ring; dc++) {
        const rr = r + dr;
        const cc = c + dc;
        if (rr < 0 || rr >= grid.rows || cc < 0 || cc >= grid.cols) continue;
        const bucket = grid.cells[rr * grid.cols + cc];
        for (let k = 0; k < bucket.length; k++) {
          const i = bucket[k];
          const d = (track.cx[i] - x) ** 2 + (track.cy[i] - y) ** 2;
          if (d < bestDist) {
            bestDist = d;
            best = i;
          }
        }
      }
    }
  }

  if (best < 0) {
    // Fall back to a linear scan rather than reporting a bogus zero.
    for (let i = 0; i < track.n; i++) {
      const d = (track.cx[i] - x) ** 2 + (track.cy[i] - y) ** 2;
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    }
  }

  return track.s[best];
}

/**
 * Signed gap along the track from `behindS` to `aheadS`, always expressed as a
 * forward distance in tenths of a metre.
 */
export function trackGap(track: TrackGeometry, aheadS: number, behindS: number): number {
  let d = aheadS - behindS;
  if (d < 0) d += track.length;
  return d;
}

/**
 * Derives the DRS activation zones by asking where on the track cars actually
 * had the flap open. OpenF1 exposes DRS per car, not per zone, so the zones are
 * inferred: bin every "DRS on" sample by arc length and keep the runs of bins
 * that enough distinct drivers hit.
 */
export function deriveDrsZones(
  track: TrackGeometry,
  carData: Map<number, DriverCarData>,
  paths: Map<number, DriverPath>,
  minDrivers = 2
): DrsZone[] {
  const BIN = 250; // 25 m bins
  const binCount = Math.max(1, Math.ceil(track.length / BIN));
  // Bitmask per bin of which drivers were on DRS there; caps at 30 drivers.
  const hits = new Uint32Array(binCount);
  let driverBit = 0;

  for (const [driverNumber, car] of carData) {
    const path = paths.get(driverNumber);
    if (!path || path.n === 0 || driverBit >= 30) continue;
    const bit = 1 << driverBit;
    driverBit++;

    let pathIdx = 0;
    // Step through car_data coarsely; DRS zones are hundreds of metres long so
    // every 4th sample (~1 s) resolves them comfortably.
    for (let i = 0; i < car.n; i += 4) {
      if (drsStateFromCode(car.drs[i]) !== 'on') continue;
      const t = car.t[i];

      while (pathIdx + 1 < path.n && path.t[pathIdx + 1] <= t) pathIdx++;
      if (Math.abs(path.t[pathIdx] - t) > 2000) continue;

      const s = projectToTrack(track, path.x[pathIdx], path.y[pathIdx]);
      const bin = Math.min(binCount - 1, Math.floor(s / BIN));
      hits[bin] |= bit;
    }
  }

  const active = new Uint8Array(binCount);
  for (let i = 0; i < binCount; i++) {
    active[i] = popcount(hits[i]) >= minDrivers ? 1 : 0;
  }

  // Close single-bin holes so one missing sample does not split a zone.
  for (let i = 1; i < binCount - 1; i++) {
    if (!active[i] && active[i - 1] && active[i + 1]) active[i] = 1;
  }

  const zones: DrsZone[] = [];
  let start = -1;
  for (let i = 0; i < binCount; i++) {
    if (active[i] && start < 0) start = i;
    if ((!active[i] || i === binCount - 1) && start >= 0) {
      const end = active[i] ? i : i - 1;
      // Real zones run several hundred metres; anything shorter is noise.
      if ((end - start + 1) * BIN >= 1500) {
        zones.push({ startS: start * BIN, endS: Math.min(track.length, (end + 1) * BIN) });
      }
      start = -1;
    }
  }

  // A zone straddling the start/finish line shows up as two fragments.
  if (zones.length > 1) {
    const first = zones[0];
    const last = zones[zones.length - 1];
    if (first.startS === 0 && Math.abs(last.endS - track.length) < BIN) {
      zones.pop();
      zones.shift();
      zones.push({ startS: last.startS, endS: track.length + first.endS });
    }
  }

  return zones;
}

function popcount(v: number): number {
  let x = v - ((v >> 1) & 0x55555555);
  x = (x & 0x33333333) + ((x >> 2) & 0x33333333);
  x = (x + (x >> 4)) & 0x0f0f0f0f;
  return (x * 0x01010101) >> 24;
}

/**
 * Centreline index runs covering an arc-length range. A zone that crosses the
 * start/finish line comes back as two runs, each already in draw order — one
 * flat list would jump the pen across the whole circuit.
 */
export function segmentsForRange(track: TrackGeometry, startS: number, endS: number): number[][] {
  if (endS <= track.length) {
    return [collectRun(track, startS, endS)].filter((r) => r.length > 1);
  }
  return [collectRun(track, startS, track.length), collectRun(track, 0, endS - track.length)].filter(
    (r) => r.length > 1
  );
}

function collectRun(track: TrackGeometry, fromS: number, toS: number): number[] {
  const run: number[] = [];
  for (let i = 0; i < track.n; i++) {
    const s = track.s[i];
    if (s >= fromS && s <= toS) run.push(i);
  }
  return run;
}
