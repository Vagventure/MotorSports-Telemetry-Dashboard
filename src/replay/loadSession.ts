/**
 * Loads a race into replay-ready form.
 *
 * The load is deliberately two-tier. Session metadata, the leaderboard, laps,
 * stints and weather total ~55 KB gzipped and land in about a second, which is
 * enough to draw the whole UI. Car positions are then pulled one driver at a
 * time so the track can start moving before the last driver arrives, and
 * `car_data` is left until a driver is actually pinned to the HUD — fetching it
 * for all twenty up front would double the request count for telemetry nobody
 * is looking at.
 */

import { of1 } from './openf1';
import { packCarData, packIntervals, packLocations, packPositions } from './packing';
import type {
  DriverCarData,
  DriverMeta,
  DriverPath,
  IntervalTrack,
  LapMarker,
  Of1CarData,
  Of1Driver,
  Of1Interval,
  Of1Lap,
  Of1Location,
  Of1Position,
  Of1RaceControl,
  Of1Session,
  Of1Stint,
  Of1Weather,
  PositionTrack,
  ReplaySession,
  StintInfo,
  WeatherSample,
} from './types';

/** Monaco 2024, matching the race the rest of the app is branded around. */
export const DEFAULT_SESSION_KEY = 9523;

const FALLBACK_COLOR = '#9AA0AE';

export interface LoadProgress {
  phase: 'idle' | 'metadata' | 'paths' | 'ready' | 'error';
  loaded: number;
  total: number;
  message: string;
}

export interface LoadCallbacks {
  onProgress: (p: LoadProgress) => void;
  /** Fired after each driver's positions are packed, so the map can redraw. */
  onDriverPath: (driverNumber: number, session: ReplaySession) => void;
}

function groupBy<T>(rows: T[], key: (r: T) => number): Map<number, T[]> {
  const out = new Map<number, T[]>();
  for (const r of rows) {
    const k = key(r);
    let bucket = out.get(k);
    if (!bucket) {
      bucket = [];
      out.set(k, bucket);
    }
    bucket.push(r);
  }
  return out;
}

function toDriverMeta(d: Of1Driver): DriverMeta {
  const raw = (d.team_colour ?? '').trim();
  return {
    driverNumber: d.driver_number,
    acronym: d.name_acronym ?? String(d.driver_number),
    fullName: d.full_name ?? d.broadcast_name ?? String(d.driver_number),
    teamName: d.team_name ?? 'Unknown',
    color: /^[0-9a-fA-F]{6}$/.test(raw) ? `#${raw}` : FALLBACK_COLOR,
    headshotUrl: d.headshot_url ?? null,
  };
}

/**
 * Loads everything except `car_data`. Resolves once positions for every driver
 * are in; `onDriverPath` fires along the way so the caller can render early.
 */
export async function loadReplaySession(
  sessionKey: number,
  cb: LoadCallbacks,
  signal: AbortSignal
): Promise<ReplaySession> {
  cb.onProgress({ phase: 'metadata', loaded: 0, total: 1, message: 'Resolving session…' });

  const sessions = await of1<Of1Session>('sessions', { session_key: sessionKey }, signal);
  if (sessions.length === 0) throw new Error(`No OpenF1 session with key ${sessionKey}`);
  const session = sessions[0];

  const sessionStartMs = Date.parse(session.date_start);
  if (!Number.isFinite(sessionStartMs)) throw new Error('Session has no usable start time');

  const META_STEPS = 7;
  let metaDone = 0;
  const bumpMeta = (message: string) => {
    metaDone++;
    cb.onProgress({ phase: 'metadata', loaded: metaDone, total: META_STEPS, message });
  };

  const driverRows = await of1<Of1Driver>('drivers', { session_key: sessionKey }, signal);
  bumpMeta('Drivers');

  const positionRows = await of1<Of1Position>('position', { session_key: sessionKey }, signal);
  bumpMeta('Running order');

  const lapRows = await of1<Of1Lap>('laps', { session_key: sessionKey }, signal);
  bumpMeta('Lap times');

  const stintRows = await of1<Of1Stint>('stints', { session_key: sessionKey }, signal);
  bumpMeta('Tyre stints');

  const weatherRows = await of1<Of1Weather>('weather', { session_key: sessionKey }, signal);
  bumpMeta('Weather');

  const raceControl = await of1<Of1RaceControl>('race_control', { session_key: sessionKey }, signal);
  bumpMeta('Race control');

  const intervalRows = await of1<Of1Interval>('intervals', { session_key: sessionKey }, signal);
  bumpMeta('Gaps');

  // `session.date_start` is when the broadcast slot opens, not when the race
  // starts — at a red-flagged Monaco that is 44 minutes of stationary cars. The
  // first lap anybody starts is the real green flag, so the replay clock is
  // anchored there and t=0 means lights out.
  const epochMs = greenFlagTime(lapRows) ?? sessionStartMs;

  const drivers = new Map<number, DriverMeta>();
  for (const d of driverRows) {
    if (!drivers.has(d.driver_number)) drivers.set(d.driver_number, toDriverMeta(d));
  }

  const positions = new Map<number, PositionTrack>();
  for (const [num, rows] of groupBy(positionRows, (r) => r.driver_number)) {
    positions.set(num, packPositions(rows, epochMs, num));
  }

  const intervals = new Map<number, IntervalTrack>();
  for (const [num, rows] of groupBy(intervalRows, (r) => r.driver_number)) {
    intervals.set(num, packIntervals(rows, epochMs, num));
  }

  const laps: LapMarker[] = lapRows.map((l) => ({
    driverNumber: l.driver_number,
    lapNumber: l.lap_number,
    t: l.date_start ? Date.parse(l.date_start) - epochMs : null,
    durationSec: l.lap_duration,
    isPitOutLap: Boolean(l.is_pit_out_lap),
  }));
  const totalLaps = laps.reduce((m, l) => Math.max(m, l.lapNumber), 0);

  const stints: StintInfo[] = stintRows
    .filter((s) => s.compound)
    .map((s) => ({
      driverNumber: s.driver_number,
      lapStart: s.lap_start,
      lapEnd: s.lap_end,
      compound: (s.compound ?? '').toUpperCase(),
    }));

  const weather: WeatherSample[] = weatherRows
    .map((w) => ({
      t: Date.parse(w.date) - epochMs,
      airTemp: w.air_temperature,
      trackTemp: w.track_temperature,
      humidity: w.humidity,
      windSpeed: w.wind_speed,
      windDirection: w.wind_direction,
      rainfall: w.rainfall,
    }))
    .filter((w) => Number.isFinite(w.t))
    .sort((a, b) => a.t - b.t);

  // Drive the request order off the final classification so the leaders — the
  // cars the viewer looks at first — are on track soonest.
  const driverOrder = [...drivers.keys()].sort((a, b) => {
    const pa = lastPosition(positions.get(a)) ?? 99;
    const pb = lastPosition(positions.get(b)) ?? 99;
    return pa - pb;
  });

  const replay: ReplaySession = {
    session,
    epochMs,
    durationMs: Math.max(0, Date.parse(session.date_end) - epochMs),
    drivers,
    driverOrder,
    paths: new Map(),
    carData: new Map(),
    positions,
    intervals,
    laps,
    totalLaps,
    stints,
    weather,
    raceControl,
    retirements: new Map(),
  };

  for (let i = 0; i < driverOrder.length; i++) {
    if (signal.aborted) throw new Error('aborted');
    const num = driverOrder[i];
    const meta = drivers.get(num);

    cb.onProgress({
      phase: 'paths',
      loaded: i,
      total: driverOrder.length,
      message: `Positions · ${meta?.acronym ?? num}`,
    });

    const rows = await of1<Of1Location>(
      'location',
      { session_key: sessionKey, driver_number: num },
      signal
    );
    const path = packLocations(rows, epochMs, num);
    if (path.n > 0) {
      replay.paths.set(num, path);
      cb.onDriverPath(num, replay);
    }
  }

  const lastSample = maxPathTime(replay.paths);
  if (lastSample > 0) replay.durationMs = lastSample;
  markRetirements(replay, lastSample);

  cb.onProgress({
    phase: 'ready',
    loaded: driverOrder.length,
    total: driverOrder.length,
    message: 'Ready',
  });

  return replay;
}

/** Fetches and packs `car_data` for one driver. Safe to call repeatedly. */
export async function loadDriverCarData(
  replay: ReplaySession,
  driverNumber: number,
  signal: AbortSignal
): Promise<DriverCarData | null> {
  const existing = replay.carData.get(driverNumber);
  if (existing) return existing;

  const rows = await of1<Of1CarData>(
    'car_data',
    { session_key: replay.session.session_key, driver_number: driverNumber },
    signal
  );
  if (signal.aborted) return null;

  const packed = packCarData(rows, replay.epochMs, driverNumber);
  if (packed.n === 0) return null;
  replay.carData.set(driverNumber, packed);
  return packed;
}

/** Earliest start time of anybody's opening lap, or null if unknown. */
function greenFlagTime(lapRows: Of1Lap[]): number | null {
  let earliest = Infinity;
  for (const l of lapRows) {
    if (l.lap_number !== 1 || !l.date_start) continue;
    const ms = Date.parse(l.date_start);
    if (Number.isFinite(ms) && ms < earliest) earliest = ms;
  }
  return earliest === Infinity ? null : earliest;
}

function lastPosition(track: PositionTrack | undefined): number | null {
  if (!track || track.n === 0) return null;
  return track.position[track.n - 1];
}

function maxPathTime(paths: Map<number, DriverPath>): number {
  let max = 0;
  for (const p of paths.values()) {
    if (p.n > 0 && p.t[p.n - 1] > max) max = p.t[p.n - 1];
  }
  return max;
}

/**
 * A car whose telemetry stops well before the chequered flag has retired.
 * OpenF1 has no retirement field, and `race_control` messages are inconsistent
 * across seasons, so the gap in the data is the most reliable signal.
 */
function markRetirements(replay: ReplaySession, sessionEndMs: number): void {
  const RETIRED_GAP_MS = 120_000;
  for (const [num, path] of replay.paths) {
    if (path.n === 0) continue;
    const last = path.t[path.n - 1];
    if (sessionEndMs - last > RETIRED_GAP_MS) replay.retirements.set(num, last);
  }
}
