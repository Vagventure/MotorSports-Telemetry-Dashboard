/**
 * A pinned driver's telemetry card.
 *
 * Speed, gear, DRS and the throttle/brake bars come straight off the clock at
 * frame rate and are written into the DOM through refs. Running them through
 * React state would re-render three cards sixty times a second for values that
 * are pure output. The gap lines are different — they depend on the whole
 * running order, so they arrive as a prop from the panel's throttled sampler.
 */

import React, { useEffect, useRef } from 'react';
import type { RaceClock } from '../../replay/useRaceReplay';
import type { RaceStateSampler, NeighbourGap } from '../../replay/raceState';
import type { DriverMeta } from '../../replay/types';

interface DriverHudCardProps {
  meta: DriverMeta;
  sampler: RaceStateSampler;
  clock: RaceClock;
  ahead: NeighbourGap | null;
  behind: NeighbourGap | null;
  /** False until this driver's car_data has been fetched. */
  hasTelemetry: boolean;
  onUnpin: (driverNumber: number) => void;
}

/** "Ahead (NOR): +3.04s (168.7m)", or "Ahead: N/A" for the car in front. */
function gapLine(label: string, gap: NeighbourGap | null, sign: '+' | '-'): string {
  if (!gap) return `${label}: N/A`;
  const secs = gap.seconds == null ? null : `${sign}${Math.abs(gap.seconds).toFixed(2)}s`;
  const metres = gap.metres == null ? null : `(${gap.metres.toFixed(1)}m)`;
  const value = [secs, metres].filter(Boolean).join(' ') || '—';
  return `${label} (${gap.acronym}): ${value}`;
}

export const DriverHudCard: React.FC<DriverHudCardProps> = ({
  meta,
  sampler,
  clock,
  ahead,
  behind,
  hasTelemetry,
  onUnpin,
}) => {
  const speedRef = useRef<HTMLSpanElement>(null);
  const gearRef = useRef<HTMLSpanElement>(null);
  const drsRef = useRef<HTMLSpanElement>(null);
  const thrRef = useRef<HTMLDivElement>(null);
  const brkRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return clock.subscribe((timeMs) => {
      const sample = sampler.telemetryFor(meta.driverNumber, timeMs);

      if (speedRef.current) {
        speedRef.current.textContent = sample ? `${sample.speed} km/h` : '—';
      }
      if (gearRef.current) {
        gearRef.current.textContent = sample && sample.gear > 0 ? String(sample.gear) : '—';
      }
      if (drsRef.current) {
        const state = sample?.drs ?? 'off';
        drsRef.current.textContent = state === 'on' ? 'ON' : state === 'eligible' ? 'RDY' : 'OFF';
        drsRef.current.style.color =
          state === 'on' ? '#00E701' : state === 'eligible' ? '#E8C547' : '#7A7A88';
      }
      if (thrRef.current) {
        thrRef.current.style.height = `${sample?.throttle ?? 0}%`;
      }
      if (brkRef.current) {
        brkRef.current.style.height = `${sample?.brake ?? 0}%`;
      }
    });
  }, [clock, sampler, meta.driverNumber]);

  return (
    <div
      className="border-2 bg-[#0D0D12] rounded-[3px] overflow-hidden shadow-sm"
      style={{ borderColor: meta.color }}
    >
      <button
        onClick={() => onUnpin(meta.driverNumber)}
        className="w-full flex items-center justify-between px-2 py-1 text-left"
        style={{ backgroundColor: meta.color }}
        title={`Unpin ${meta.fullName}`}
      >
        <span className="font-f1-sans text-[11px] font-black uppercase tracking-[0.12em] text-black/85">
          Driver: {meta.acronym}
        </span>
        <span className="font-f1-sans text-[11px] font-black text-black/60 leading-none">×</span>
      </button>

      <div className="flex gap-2 p-2">
        <div className="flex-1 min-w-0 font-mono-f1 text-[11px] leading-[1.55] text-[#D6D6E0]">
          <div>
            Speed: <span ref={speedRef}>—</span>
          </div>
          <div>
            Gear: <span ref={gearRef}>—</span>
          </div>
          <div>
            DRS: <span ref={drsRef} style={{ color: '#7A7A88' }}>OFF</span>
          </div>
          <div className="text-[10px] text-[#9A9AA8] truncate" title={gapLine('Ahead', ahead, '+')}>
            {gapLine('Ahead', ahead, '+')}
          </div>
          <div className="text-[10px] text-[#9A9AA8] truncate" title={gapLine('Behind', behind, '-')}>
            {gapLine('Behind', behind, '-')}
          </div>
          {!hasTelemetry && (
            <div className="text-[10px] text-[#6A6A78] italic">loading telemetry…</div>
          )}
        </div>

        <div className="flex gap-1 items-end shrink-0">
          <Bar label="THR" barRef={thrRef} color="#00E701" />
          <Bar label="BRK" barRef={brkRef} color="#C9C9D4" />
        </div>
      </div>
    </div>
  );
};

const Bar: React.FC<{
  label: string;
  barRef: React.RefObject<HTMLDivElement>;
  color: string;
}> = ({ label, barRef, color }) => (
  <div className="flex flex-col items-center gap-0.5">
    <div className="w-3.5 h-[58px] bg-[#1C1C24] border border-[#2A2A36] relative">
      <div
        ref={barRef}
        className="absolute bottom-0 left-0 right-0"
        style={{ height: '0%', backgroundColor: color }}
      />
    </div>
    <span className="font-f1-sans text-[8px] font-bold tracking-wider text-[#7A7A88]">{label}</span>
  </div>
);
