/**
 * Running order sidebar. Updates at the sampler's throttled rate rather than
 * per frame — positions and gaps do not change meaningfully faster than that,
 * and twenty rows of React reconciliation at 60 Hz would be wasted work.
 */

import React from 'react';
import type { RaceState } from '../../replay/raceState';
import type { DriverMeta } from '../../replay/types';

interface ReplayLeaderboardProps {
  state: RaceState | null;
  drivers: Map<number, DriverMeta>;
  pinned: number[];
  onToggle: (driverNumber: number) => void;
}

const COMPOUND_COLORS: Record<string, string> = {
  SOFT: '#E10600',
  MEDIUM: '#E8C547',
  HARD: '#E8E8EE',
  INTERMEDIATE: '#00E701',
  WET: '#3671C6',
};

export const ReplayLeaderboard: React.FC<ReplayLeaderboardProps> = ({
  state,
  drivers,
  pinned,
  onToggle,
}) => {
  const pinnedSet = new Set(pinned);

  return (
    <div className="h-full flex flex-col min-h-0">
      <h4 className="font-f1-sans text-[11px] font-black uppercase tracking-[0.18em] text-[#D6D6E0] px-1 pb-1.5 border-b border-[#22222A]">
        Leaderboard
      </h4>

      <ol className="flex-1 overflow-y-auto mt-1 pr-0.5">
        {state?.order.map((d, i) => {
          const meta = drivers.get(d.driverNumber);
          const isPinned = pinnedSet.has(d.driverNumber);
          const compound = d.compound ?? '';
          const dot = COMPOUND_COLORS[compound] ?? '#4A4A58';

          return (
            <li key={d.driverNumber}>
              <button
                onClick={() => onToggle(d.driverNumber)}
                className={`w-full flex items-center gap-1.5 px-1 py-[3px] text-left rounded-[2px] transition-colors ${
                  isPinned ? 'bg-[#E8E8EE]' : 'hover:bg-[#1A1A22]'
                }`}
                title={
                  isPinned
                    ? `Unpin ${meta?.fullName ?? d.driverNumber}`
                    : `Pin ${meta?.fullName ?? d.driverNumber} to the telemetry HUD`
                }
              >
                <span
                  className={`font-mono-f1 text-[11px] w-5 text-right shrink-0 ${
                    isPinned ? 'text-[#2A2A36]' : 'text-[#7A7A88]'
                  }`}
                >
                  {d.retired ? '–' : i + 1}.
                </span>

                <span
                  className={`font-f1-sans text-[11px] font-black tracking-wide flex-1 truncate ${
                    d.retired ? 'opacity-45' : ''
                  }`}
                  style={{ color: isPinned ? '#111115' : (meta?.color ?? '#9AA0AE') }}
                >
                  {meta?.acronym ?? d.driverNumber}
                </span>

                {d.retired && (
                  <span className="font-f1-sans text-[9px] font-black tracking-wider text-[#E10600] shrink-0">
                    OUT
                  </span>
                )}

                <span
                  className="w-2.5 h-2.5 rounded-full border shrink-0"
                  style={{
                    backgroundColor: d.retired ? 'transparent' : dot,
                    borderColor: isPinned ? '#2A2A36' : '#3A3A46',
                  }}
                  title={compound || 'Unknown compound'}
                />
              </button>
            </li>
          );
        })}
      </ol>

      {!state && (
        <p className="font-mono-f1 text-[11px] text-[#6A6A78] px-1 py-2">Waiting for data…</p>
      )}
    </div>
  );
};
