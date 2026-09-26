/**
 * Type definitions for the race replay engine.
 *
 * Telemetry is stored columnar (parallel typed arrays) rather than as arrays of
 * objects. A full race is ~266 MB of raw OpenF1 JSON; packed this way it is
 * ~8 MB and the render loop can read it without allocating.
 */

/** Raw shapes returned by the OpenF1 REST API. */
export interface Of1Session {
  session_key: number;
  meeting_key: number;
  session_name: string;
  session_type: string;
  date_start: string;
  date_end: string;
  circuit_short_name: string;
  country_name: string;
  location: string;
  year: number;
}

export interface Of1Driver {
  driver_number: number;
  broadcast_name: string;
  full_name: string;
  name_acronym: string;
  team_name: string;
  /** Hex colour WITHOUT a leading '#', e.g. "3671C6". */
  team_colour: string | null;
  headshot_url: string | null;
  country_code: string | null;
}

export interface Of1Location {
  date: string;
  driver_number: number;
  x: number;
  y: number;
  z: number;
}

export interface Of1CarData {
  date: string;
  driver_number: number;
  speed: number | null;
  rpm: number | null;
  n_gear: number | null;
  throttle: number | null;
  brake: number | null;
  drs: number | null;
}

export interface Of1Position {
  date: string;
  driver_number: number;
  position: number;
}

export interface Of1Interval {
  date: string;
  driver_number: number;
  /** Seconds to the car ahead. `null` when lapped; string "+1 LAP" style never occurs here. */
  interval: number | null;
  gap_to_leader: number | null;
}

export interface Of1Lap {
  date_start: string | null;
  driver_number: number;
  lap_number: number;
  lap_duration: number | null;
  is_pit_out_lap: boolean;
  duration_sector_1: number | null;
  duration_sector_2: number | null;
  duration_sector_3: number | null;
}

export interface Of1Stint {
  driver_number: number;
  lap_start: number;
  lap_end: number;
  compound: string | null;
  tyre_age_at_start: number | null;
}

export interface Of1Weather {
  date: string;
  air_temperature: number | null;
  track_temperature: number | null;
  humidity: number | null;
  wind_speed: number | null;
  wind_direction: number | null;
  rainfall: number | null;
}

export interface Of1RaceControl {
  date: string;
  category: string;
  flag: string | null;
  scope: string | null;
  message: string;
  lap_number: number | null;
  driver_number: number | null;
}

export interface Of1Pit {
  date: string;
  driver_number: number;
  lap_number: number;
  pit_duration: number | null;
}

/* ------------------------------------------------------------------ */
/* Packed (columnar) telemetry                                         */
/* ------------------------------------------------------------------ */

/**
 * Car positions for one driver over the whole session.
 * `t` is milliseconds since the session epoch so it fits comfortably in a
 * Uint32 (a 2 h race is 7.2M ms). `x`/`y` are OpenF1's tenths of a metre;
 * they need Int32 because circuit coordinates run past the Int16 range.
 */
export interface DriverPath {
  driverNumber: number;
  n: number;
  t: Uint32Array;
  x: Int32Array;
  y: Int32Array;
}

/** Per-driver car telemetry over the whole session. */
export interface DriverCarData {
  driverNumber: number;
  n: number;
  t: Uint32Array;
  speed: Uint16Array;
  rpm: Uint16Array;
  gear: Int8Array;
  throttle: Uint8Array;
  /** OpenF1 reports brake as 0 or 100, stored verbatim. */
  brake: Uint8Array;
  /** Raw OpenF1 DRS code. See `drsStateFromCode`. */
  drs: Uint8Array;
}

/** Leaderboard order over time, one entry per driver per update. */
export interface PositionTrack {
  driverNumber: number;
  n: number;
  t: Uint32Array;
  position: Uint8Array;
}

/** Gap to the car ahead / to the leader over time. */
export interface IntervalTrack {
  driverNumber: number;
  n: number;
  t: Uint32Array;
  /** NaN where OpenF1 reported null (lapped or not yet running). */
  interval: Float32Array;
  gapToLeader: Float32Array;
}

export type DrsState = 'off' | 'eligible' | 'on';

export interface DriverMeta {
  driverNumber: number;
  acronym: string;
  fullName: string;
  teamName: string;
  /** CSS colour with the '#' prefix already applied. */
  color: string;
  headshotUrl: string | null;
}

export interface WeatherSample {
  t: number;
  airTemp: number | null;
  trackTemp: number | null;
  humidity: number | null;
  windSpeed: number | null;
  windDirection: number | null;
  rainfall: number | null;
}

export interface StintInfo {
  driverNumber: number;
  lapStart: number;
  lapEnd: number;
  compound: string;
}

export interface LapMarker {
  driverNumber: number;
  lapNumber: number;
  /** ms since session epoch, or null when OpenF1 had no start time. */
  t: number | null;
  durationSec: number | null;
  isPitOutLap: boolean;
}

/** Everything the replay UI needs, in render-ready form. */
export interface ReplaySession {
  session: Of1Session;
  /** Absolute epoch ms that all `t` values are relative to. */
  epochMs: number;
  /** Session length in ms, from first to last telemetry sample. */
  durationMs: number;
  drivers: Map<number, DriverMeta>;
  driverOrder: number[];
  paths: Map<number, DriverPath>;
  carData: Map<number, DriverCarData>;
  positions: Map<number, PositionTrack>;
  intervals: Map<number, IntervalTrack>;
  laps: LapMarker[];
  totalLaps: number;
  stints: StintInfo[];
  weather: WeatherSample[];
  raceControl: Of1RaceControl[];
  retirements: Map<number, number>;
}
