/**
 * The race replay feature, embedded under the live telemetry screen.
 *
 * Loading is behind an explicit button rather than firing on mount: a full race
 * is ~28 requests against a public API capped at 30 per minute, so it is not
 * something to start just because someone scrolled past.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CircuitCanvas } from './CircuitCanvas';
import { DriverHudCard } from './DriverHudCard';
import { PlaybackControls } from './PlaybackControls';
import { ReplayLeaderboard } from './ReplayLeaderboard';
import { DEFAULT_SESSION_KEY, loadDriverCarData, loadReplaySession } from '../../replay/loadSession';
import type { LoadProgress } from '../../replay/loadSession';
import { RaceStateSampler, gapAhead, gapBehind, pickTrackLap } from '../../replay/raceState';
import type { RaceState } from '../../replay/raceState';
import { buildTrack, deriveDrsZones } from '../../replay/trackGeometry';
import type { DrsZone, TrackGeometry } from '../../replay/trackGeometry';
import { formatRaceTime, useRaceReplay } from '../../replay/useRaceReplay';
import type { ReplaySession } from '../../replay/types';

const MAX_PINNED = 3;
/** How often the running order is recomputed for the React tree. */
const STATE_TICK_MS = 200;

interface RaceReplayPanelProps {
  sessionKey?: number;
}

export const RaceReplayPanel: React.FC<RaceReplayPanelProps> = ({
  sessionKey = DEFAULT_SESSION_KEY,
}) => {
  const replayRef = useRef<ReplaySession | null>(null);
  const samplerRef = useRef<RaceStateSampler | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const carDataAbortRef = useRef(new AbortController());
  const lastStateTickRef = useRef(0);

  const [dataVersion, setDataVersion] = useState(0);
  const [progress, setProgress] = useState<LoadProgress>({
    phase: 'idle',
    loaded: 0,
    total: 0,
    message: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [track, setTrack] = useState<TrackGeometry | null>(null);
  const [drsZones, setDrsZones] = useState<DrsZone[]>([]);
  const [showDrs, setShowDrs] = useState(true);
  const [pinned, setPinned] = useState<number[]>([]);
  const [raceState, setRaceState] = useState<RaceState | null>(null);

  const replay = replayRef.current;
  const started = progress.phase !== 'idle';
  const ready = progress.phase === 'ready';

  const clock = useRaceReplay(replay?.durationMs ?? 0, started && !error);

  /* ---------------- loading ---------------- */

  const startLoad = useCallback(() => {
    if (abortRef.current) abortRef.current.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    carDataAbortRef.current.abort();
    carDataAbortRef.current = new AbortController();
    requestedCarData.current.clear();
    drsSourceCountRef.current = 0;

    setError(null);
    setTrack(null);
    setDrsZones([]);
    setPinned([]);
    setRaceState(null);
    replayRef.current = null;
    samplerRef.current = null;

    loadReplaySession(
      sessionKey,
      {
        onProgress: (p) => {
          if (!ctrl.signal.aborted) setProgress(p);
        },
        onDriverPath: (_num, session) => {
          if (ctrl.signal.aborted) return;
          replayRef.current = session;
          if (!samplerRef.current) samplerRef.current = new RaceStateSampler(session);
          setDataVersion((v) => v + 1);
        },
      },
      ctrl.signal
    )
      .then((session) => {
        if (ctrl.signal.aborted) return;
        replayRef.current = session;
        samplerRef.current = new RaceStateSampler(session);
        // Pin the front row of the final classification, mirroring the
        // reference build's three-driver HUD.
        setPinned(session.driverOrder.slice(0, MAX_PINNED));
        setDataVersion((v) => v + 1);
      })
      .catch((err: Error) => {
        if (ctrl.signal.aborted || err.message === 'aborted') return;
        setError(err.message);
        setProgress({ phase: 'error', loaded: 0, total: 0, message: err.message });
      });
  }, [sessionKey]);

  useEffect(() => {
    const carDataCtrl = carDataAbortRef.current;
    return () => {
      abortRef.current?.abort();
      carDataCtrl.abort();
    };
  }, []);

  /* ---------------- track geometry ---------------- */

  useEffect(() => {
    if (track || !replay || replay.paths.size === 0) return;

    const lap = pickTrackLap(replay);
    if (!lap) return;
    const path = replay.paths.get(lap.driverNumber);
    if (!path) return;

    const built = buildTrack(path, lap.startMs, lap.endMs);
    if (built) setTrack(built);
  }, [replay, dataVersion, track]);

  /* ---------------- pinned drivers & their telemetry ---------------- */

  // Requests are tracked in a ref rather than derived from `carData`, because
  // a completed fetch bumps `dataVersion`; keying this effect off that would
  // restart it on its own result.
  const requestedCarData = useRef(new Set<number>());

  useEffect(() => {
    const current = replayRef.current;
    if (!current || pinned.length === 0) return;
    const signal = carDataAbortRef.current.signal;

    (async () => {
      for (const driverNumber of pinned) {
        if (signal.aborted) return;
        if (requestedCarData.current.has(driverNumber)) continue;
        requestedCarData.current.add(driverNumber);
        try {
          const packed = await loadDriverCarData(current, driverNumber, signal);
          if (packed && !signal.aborted) setDataVersion((v) => v + 1);
        } catch {
          // A missing telemetry stream degrades one card; it should not take
          // the replay down. Clearing the mark allows a retry on re-pin.
          requestedCarData.current.delete(driverNumber);
        }
      }
    })();
  }, [pinned, ready]);

  /* ---------------- DRS zones ---------------- */

  // Deriving zones walks every loaded car_data sample, so it only reruns when
  // another driver's telemetry has actually arrived.
  const drsSourceCountRef = useRef(0);

  useEffect(() => {
    if (!track || !replay || replay.carData.size === 0) return;
    if (replay.carData.size === drsSourceCountRef.current) return;
    drsSourceCountRef.current = replay.carData.size;
    setDrsZones(deriveDrsZones(track, replay.carData, replay.paths));
  }, [track, replay, dataVersion]);

  /* ---------------- throttled running order ---------------- */

  useEffect(() => {
    if (!started) return;
    return clock.subscribe((timeMs) => {
      const now = performance.now();
      if (now - lastStateTickRef.current < STATE_TICK_MS) return;
      lastStateTickRef.current = now;
      const sampler = samplerRef.current;
      if (sampler) setRaceState(sampler.sample(timeMs, track));
    });
  }, [clock, started, track, dataVersion]);

  /* ---------------- interaction ---------------- */

  const togglePin = useCallback((driverNumber: number) => {
    setPinned((prev) => {
      if (prev.includes(driverNumber)) return prev.filter((n) => n !== driverNumber);
      // Oldest pin drops out so the HUD stays three cards tall.
      return [...prev, driverNumber].slice(-MAX_PINNED);
    });
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (!started) return;
      const keys = [' ', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'r', 'R', 'd', 'D'];
      if (!keys.includes(e.key)) return;

      // The app binds 'd' to the theme switch and digits to navigation on
      // window; stopping propagation keeps replay keys inside the panel.
      e.preventDefault();
      e.stopPropagation();

      switch (e.key) {
        case ' ':
          clock.toggle();
          break;
        case 'ArrowLeft':
          clock.skip(-30_000);
          break;
        case 'ArrowRight':
          clock.skip(30_000);
          break;
        case 'ArrowUp':
          clock.stepSpeed(1);
          break;
        case 'ArrowDown':
          clock.stepSpeed(-1);
          break;
        case 'r':
        case 'R':
          clock.restart();
          break;
        case 'd':
        case 'D':
          setShowDrs((v) => !v);
          break;
      }
    },
    [clock, started]
  );

  /* ---------------- derived display values ---------------- */

  const acronymOf = useCallback(
    (n: number) => replayRef.current?.drivers.get(n)?.acronym ?? String(n),
    []
  );

  const pinnedCards = useMemo(() => {
    if (!replay || !samplerRef.current) return [];
    return pinned
      .map((n) => {
        const meta = replay.drivers.get(n);
        if (!meta) return null;
        return {
          meta,
          ahead: raceState ? gapAhead(raceState, track, n, acronymOf) : null,
          behind: raceState ? gapBehind(raceState, track, n, acronymOf) : null,
          hasTelemetry: replay.carData.has(n),
        };
      })
      .filter((c): c is NonNullable<typeof c> => c !== null);
  }, [pinned, replay, raceState, track, acronymOf, dataVersion]);

  const weather = raceState?.weather ?? null;
  const loadPercent =
    progress.total > 0 ? Math.round((progress.loaded / progress.total) * 100) : 0;

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap justify-between items-end gap-3">
        <div className="flex items-center gap-3">
          <span className="w-2.5 h-2.5 bg-[#E10600] rounded-[2px]" />
          <div>
            <h3 className="font-f1-title text-3xl font-black uppercase tracking-tight">
              Race Replay Simulation
            </h3>
            <p className="font-f1-sans text-xs text-[#888899] mt-0.5">
              Reconstructed from OpenF1 position and car telemetry.
              {replay && (
                <>
                  {' '}
                  {replay.session.circuit_short_name} · {replay.session.year}
                </>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {started && (
            <button
              onClick={() => setShowDrs((v) => !v)}
              className={`font-f1-sans text-[11px] uppercase tracking-[0.15em] font-black px-3 py-2 rounded border transition-colors ${
                showDrs
                  ? 'border-[#00E701] text-[#00E701] bg-[#00E701]/10'
                  : 'border-[#2A2A36] text-[#7A7A88] hover:text-white'
              }`}
            >
              DRS Zones
            </button>
          )}
          <button
            onClick={startLoad}
            disabled={started && !ready && !error}
            className="font-f1-sans text-[11px] uppercase tracking-[0.15em] font-black px-4 py-2 rounded bg-[#E10600] text-white hover:bg-[#FF1801] transition-colors disabled:opacity-40"
          >
            {ready || error ? 'Reload Replay' : started ? 'Loading…' : 'Load Replay'}
          </button>
        </div>
      </div>

      <div
        tabIndex={0}
        onKeyDown={handleKeyDown}
        className="border border-[#22222A] rounded bg-[#0A0A0C] overflow-hidden focus:outline-none focus:ring-1 focus:ring-[#E10600]/50"
      >
        {!started ? (
          <EmptyState onLoad={startLoad} />
        ) : error ? (
          <div className="p-8 text-center">
            <p className="font-f1-sans text-sm text-[#E10600] font-bold mb-1">
              Could not load the replay
            </p>
            <p className="font-mono-f1 text-xs text-[#7A7A88]">{error}</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-[236px_1fr_156px] gap-0 min-h-[520px]">
              {/* Left: conditions + pinned telemetry */}
              <div className="p-3 flex flex-col gap-2 border-b lg:border-b-0 lg:border-r border-[#22222A]">
                <div className="font-mono-f1 text-[11px] text-[#9A9AA8] leading-[1.6]">
                  <div className="font-f1-sans text-[11px] font-black uppercase tracking-[0.18em] text-[#D6D6E0] mb-1">
                    Weather
                  </div>
                  <div>Track: {fmtTemp(weather?.trackTemp)}</div>
                  <div>Air: {fmtTemp(weather?.airTemp)}</div>
                  <div>Humidity: {weather?.humidity != null ? `${weather.humidity}%` : '—'}</div>
                  <div>
                    Wind: {weather?.windSpeed != null ? `${weather.windSpeed.toFixed(1)} km/h` : '—'}
                  </div>
                  <div>Rain: {weather?.rainfall ? 'WET' : 'DRY'}</div>
                </div>

                <div className="flex flex-col gap-2 mt-1">
                  {pinnedCards.map((card) => (
                    <DriverHudCard
                      key={card.meta.driverNumber}
                      meta={card.meta}
                      sampler={samplerRef.current!}
                      clock={clock}
                      ahead={card.ahead}
                      behind={card.behind}
                      hasTelemetry={card.hasTelemetry}
                      onUnpin={togglePin}
                    />
                  ))}
                  {pinnedCards.length === 0 && ready && (
                    <p className="font-mono-f1 text-[11px] text-[#6A6A78]">
                      Click a car or a leaderboard row to pin it here.
                    </p>
                  )}
                </div>
              </div>

              {/* Centre: track map */}
              <div className="relative min-h-[320px] lg:min-h-0">
                <div className="absolute top-3 left-3 z-10 font-mono-f1 text-[13px] text-[#E8E8EE] leading-tight pointer-events-none">
                  <div>
                    Lap: {raceState?.leaderLap ?? 0}/{replay?.totalLaps ?? 0}
                  </div>
                  <div>
                    Race Time: {formatRaceTime(clock.displayTime)}{' '}
                    <span className="text-[#7A7A88]">({clock.speed.toFixed(1)}x)</span>
                  </div>
                </div>

                <CircuitCanvas
                  replay={replay!}
                  track={track}
                  drsZones={drsZones}
                  clock={clock}
                  pinned={pinned}
                  showDrs={showDrs}
                  onPickDriver={togglePin}
                  dataVersion={dataVersion}
                />

                {!ready && (
                  <div className="absolute bottom-3 left-3 right-3 z-10">
                    <div className="h-1 bg-[#1C1C24] rounded overflow-hidden">
                      <div
                        className="h-full bg-[#E10600] transition-[width] duration-200"
                        style={{ width: `${loadPercent}%` }}
                      />
                    </div>
                    <p className="font-mono-f1 text-[10px] text-[#7A7A88] mt-1">
                      {progress.message} · {progress.loaded}/{progress.total}
                    </p>
                  </div>
                )}
              </div>

              {/* Right: running order */}
              <div className="p-2 border-t lg:border-t-0 lg:border-l border-[#22222A] max-h-[300px] lg:max-h-none">
                <ReplayLeaderboard
                  state={raceState}
                  drivers={replay?.drivers ?? new Map()}
                  pinned={pinned}
                  onToggle={togglePin}
                />
              </div>
            </div>

            <div className="border-t border-[#22222A] p-3">
              <PlaybackControls clock={clock} disabled={!replay || replay.paths.size === 0} />
              <p className="font-mono-f1 text-[10px] text-[#5A5A68] mt-2 text-center">
                [SPACE] play/pause · [←/→] ±30s · [↑/↓] speed · [R] restart · [D] DRS zones
                <span className="hidden sm:inline"> · click a car to pin it</span>
              </p>
            </div>
          </>
        )}
      </div>
    </section>
  );
};

function fmtTemp(v: number | null | undefined): string {
  return v == null ? '—' : `${v.toFixed(1)}°C`;
}

const EmptyState: React.FC<{ onLoad: () => void }> = ({ onLoad }) => (
  <div className="p-10 text-center flex flex-col items-center gap-3">
    <h4 className="font-f1-title text-2xl font-black uppercase tracking-tight">
      Replay the Grand Prix
    </h4>
    <p className="font-f1-sans text-sm text-[#888899] max-w-md">
      Streams the real position and telemetry traces from the race and plays them back on the
      circuit map, with a live running order, tyre compounds and DRS zones.
    </p>
    <p className="font-mono-f1 text-[11px] text-[#5A5A68] max-w-md">
      Around 28 requests against OpenF1's free tier, which is capped at 30 per minute — the first
      cars appear within seconds, the full grid takes about a minute.
    </p>
    <button
      onClick={onLoad}
      className="mt-1 font-f1-sans text-xs uppercase tracking-[0.15em] font-black px-5 py-2.5 rounded bg-[#E10600] text-white hover:bg-[#FF1801] transition-colors"
    >
      Load Replay
    </button>
  </div>
);
