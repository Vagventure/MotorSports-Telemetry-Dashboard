import React, { useState } from 'react';
import { RACE_CALENDAR } from '../data/f1Data';
import { ThemeMode } from '../types';

interface ResultsScreenProps {
  onOpenLiveModal: () => void;
  theme?: ThemeMode;
}

export const ResultsScreen: React.FC<ResultsScreenProps> = ({
  onOpenLiveModal,
  theme = 'dark'
}) => {
  const [filter, setFilter] = useState<'all' | 'completed' | 'upcoming'>('all');
  const isDark = theme === 'dark';

  const filteredRaces = RACE_CALENDAR.filter((race) => {
    if (filter === 'completed') return race.status === 'completed';
    if (filter === 'upcoming') return race.status === 'upcoming' || race.status === 'live';
    return true;
  });

  return (
    <div className="max-w-[1500px] mx-auto pb-12 flex flex-col gap-8">
      {/* Header */}
      <div className={`flex flex-col md:flex-row md:items-end justify-between border-b pb-5 gap-4 ${
        isDark ? 'border-[#22222A]' : 'border-[#E2E2E8]'
      }`}>
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="bg-[#E10600] text-white font-f1-sans text-[10px] font-black uppercase tracking-[0.25em] px-2 py-0.5 rounded-[2px]">
              FIA CALENDAR
            </span>
            <span className="text-[10px] uppercase tracking-[0.25em] font-f1-sans font-bold text-[#888899]">
              2024 FIA Formula 1 World Championship
            </span>
          </div>
          <h1 className="font-f1-title text-4xl md:text-6xl font-black tracking-tight leading-none uppercase">
            RACE <span className="text-[#E10600]">CALENDAR</span> & RESULTS
          </h1>
          <p className="font-f1-sans text-sm text-[#888899] mt-2 max-w-xl">
            Official race schedule, circuit details, race winners, and pole position times.
          </p>
        </div>

        {/* Filter buttons */}
        <div className="flex items-center gap-2 font-f1-sans text-xs">
          {[
            { id: 'all', label: 'All 24 Rounds' },
            { id: 'completed', label: 'Completed' },
            { id: 'upcoming', label: 'Upcoming' }
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setFilter(item.id as any)}
              className={`font-f1-sans text-xs uppercase tracking-wider font-bold px-3.5 py-1.5 rounded transition-all ${
                filter === item.id
                  ? 'bg-[#E10600] text-white shadow-[0_2px_8px_rgba(225,6,0,0.35)]'
                  : isDark
                  ? 'bg-[#15151C] text-[#888899] border border-[#22222A] hover:text-white hover:border-[#E10600]'
                  : 'bg-[#FFFFFF] text-[#555566] border border-[#E2E2E8] hover:text-black hover:border-[#E10600]'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Races List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredRaces.map((race) => {
          const isCompleted = race.status === 'completed';
          const isLive = race.status === 'live';

          return (
            <div
              key={race.id}
              className={`border rounded overflow-hidden flex flex-col justify-between transition-all group hover:shadow-md ${
                isDark
                  ? 'bg-[#121217] border-[#22222A] hover:border-[#E10600]'
                  : 'bg-[#FFFFFF] border-[#E2E2E8] hover:border-[#E10600]'
              } ${isLive ? 'border-[#E10600] shadow-[0_0_15px_rgba(225,6,0,0.2)]' : ''}`}
            >
              {/* Card Header with Round & Flag */}
              <div className="p-5 pb-3">
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-f1-title font-black text-xs px-2 py-0.5 bg-[#E10600] text-white rounded-[2px]">
                      R0{race.round}
                    </span>
                    <span className="font-f1-sans text-[11px] uppercase font-bold text-[#888899] tracking-wider">
                      {race.date}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {isLive && (
                      <span className="flex items-center gap-1 font-f1-sans text-[10px] font-black uppercase tracking-wider text-[#E10600] bg-[#E10600]/10 px-2 py-0.5 rounded border border-[#E10600]/30">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#E10600] blinking-dot"></span>
                        LIVE
                      </span>
                    )}
                    <div className="w-6 h-4 overflow-hidden rounded-[2px] border border-black/20">
                      <img
                        src={race.flagUrl}
                        alt={race.country}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                </div>

                <h3 className="font-f1-title text-xl font-black uppercase tracking-tight group-hover:text-[#E10600] transition-colors">
                  {race.name}
                </h3>
                <p className="font-f1-sans text-xs text-[#888899] uppercase font-semibold tracking-wider mt-0.5">
                  {race.circuit}
                </p>
              </div>

              {/* Card Content: Results if completed, info if upcoming */}
              <div className={`p-5 pt-3 border-t mt-3 ${
                isDark ? 'bg-[#16161D] border-[#1E1E26]' : 'bg-[#F8F8FA] border-[#ECECEE]'
              }`}>
                {isCompleted ? (
                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between items-center font-f1-sans text-xs">
                      <span className="uppercase text-[#888899] font-bold tracking-wider text-[10px]">
                        Race Winner:
                      </span>
                      <span className="font-f1-title font-black text-sm text-[#E10600]">
                        {race.winner}
                      </span>
                    </div>

                    {race.polePosition && (
                      <div className="flex justify-between items-center font-f1-sans text-xs">
                        <span className="uppercase text-[#888899] font-bold tracking-wider text-[10px]">
                          Pole Position:
                        </span>
                        <span className="font-f1-sans font-bold text-xs">{race.polePosition}</span>
                      </div>
                    )}

                    {race.fastestLap && (
                      <div className="flex justify-between items-center font-f1-sans text-xs">
                        <span className="uppercase text-[#888899] font-bold tracking-wider text-[10px]">
                          Fastest Lap:
                        </span>
                        <span className="font-mono-f1 text-[11px] text-[#A855F7] font-black">
                          {race.fastestLap} ★
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-between py-2">
                    <span className="font-f1-sans text-xs uppercase font-bold text-[#888899] tracking-wider">
                      Scheduled Event
                    </span>
                    <button
                      onClick={onOpenLiveModal}
                      className="font-f1-sans text-[11px] uppercase tracking-wider font-black text-[#E10600] hover:underline"
                    >
                      Track Telemetry &rarr;
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
