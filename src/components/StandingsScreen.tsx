import React, { useState } from 'react';
import { DRIVERS, CONSTRUCTORS } from '../data/f1Data';
import { Driver, ThemeMode } from '../types';

interface StandingsScreenProps {
  onSelectDriver: (driver: Driver) => void;
  onOpenLiveModal: () => void;
  theme?: ThemeMode;
}

export const StandingsScreen: React.FC<StandingsScreenProps> = ({
  onSelectDriver,
  onOpenLiveModal,
  theme = 'dark'
}) => {
  const [showFullDrivers, setShowFullDrivers] = useState(false);
  const [selectedSeason, setSelectedSeason] = useState('2024');

  const isDark = theme === 'dark';
  const displayedDrivers = showFullDrivers ? DRIVERS : DRIVERS.slice(0, 7);

  return (
    <div className="max-w-[1500px] mx-auto pb-8">
      {/* Page Title & F1 Header */}
      <div className={`flex flex-col sm:flex-row sm:items-end justify-between mb-8 pb-5 border-b gap-4 ${
        isDark ? 'border-[#22222A]' : 'border-[#E2E2E8]'
      }`}>
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="bg-[#E10600] text-white font-f1-sans text-[10px] font-black uppercase tracking-[0.25em] px-2 py-0.5 rounded-[2px]">
              Season 2024
            </span>
            <span className="text-[10px] uppercase tracking-[0.25em] font-f1-sans font-bold text-[#888899]">
              Round 08 // Monaco
            </span>
          </div>
          <h1 className="font-f1-title text-4xl md:text-6xl font-black tracking-tight leading-none uppercase">
            WORLD <span className="text-[#E10600]">STANDINGS</span>
          </h1>
          <p className="font-f1-sans text-sm text-[#888899] mt-2 max-w-xl">
            Official FIA Formula 1 World Championship points, podium counts, and constructor classification.
          </p>
        </div>

        {/* Season selector */}
        <div className="flex items-center gap-2 self-start sm:self-auto font-f1-sans text-xs">
          <span className="uppercase tracking-[0.2em] font-bold text-[#888899]">Season:</span>
          {['2024', '2023'].map((season) => (
            <button
              key={season}
              onClick={() => setSelectedSeason(season)}
              className={`font-f1-sans text-xs uppercase tracking-wider font-bold px-3.5 py-1.5 rounded transition-all ${
                selectedSeason === season
                  ? 'bg-[#E10600] text-white shadow-[0_2px_8px_rgba(225,6,0,0.35)]'
                  : isDark
                  ? 'bg-[#181820] text-[#9A9AA8] border border-[#2A2A36] hover:border-[#E10600]'
                  : 'bg-[#FFFFFF] text-[#555566] border border-[#D4D4DC] hover:border-[#E10600]'
              }`}
            >
              {season}
            </button>
          ))}
        </div>
      </div>

      {/* Split View Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Drivers Championship Table (8 cols) */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          <div className="flex justify-between items-center pb-2">
            <div className="flex items-center gap-3">
              <span className="w-2.5 h-2.5 bg-[#E10600] rounded-[2px]"></span>
              <h2 className="font-f1-title text-2xl font-black uppercase tracking-tight">
                Drivers Championship
              </h2>
            </div>
            <button
              onClick={() => setShowFullDrivers(!showFullDrivers)}
              className="font-f1-sans text-xs uppercase tracking-[0.15em] text-[#E10600] hover:text-[#FF1801] transition-colors flex items-center gap-1 cursor-pointer font-black"
            >
              <span>{showFullDrivers ? 'Show Top 7' : 'View Full 20 Drivers'}</span>
              <span className="material-symbols-outlined text-sm">
                {showFullDrivers ? 'expand_less' : 'expand_more'}
              </span>
            </button>
          </div>

          <div className={`border rounded overflow-hidden flex flex-col shadow-sm transition-colors ${
            isDark ? 'bg-[#121217] border-[#22222A]' : 'bg-[#FFFFFF] border-[#E2E2E8]'
          }`}>
            {/* Table Header Row */}
            <div className={`grid grid-cols-12 gap-2 px-6 py-3.5 border-b font-f1-sans text-[11px] uppercase tracking-[0.2em] font-black ${
              isDark
                ? 'bg-[#16161D] border-[#22222A] text-[#888899]'
                : 'bg-[#F4F4F8] border-[#E2E2E8] text-[#666677]'
            }`}>
              <div className="col-span-2 sm:col-span-1 text-center">POS</div>
              <div className="col-span-7 sm:col-span-7 pl-2">Driver & Constructor</div>
              <div className="col-span-2 text-center hidden sm:block">Wins</div>
              <div className="col-span-3 sm:col-span-2 text-right pr-2">Points</div>
            </div>

            {/* Drivers List */}
            {displayedDrivers.map((driver) => {
              const isP1 = driver.rank === 1;
              const isP2 = driver.rank === 2;
              const isP3 = driver.rank === 3;

              return (
                <div
                  key={driver.id}
                  onClick={() => onSelectDriver(driver)}
                  className={`grid grid-cols-12 gap-2 px-6 items-center transition-all cursor-pointer group relative border-b ${
                    isDark ? 'border-[#1C1C24]' : 'border-[#F0F0F4]'
                  } ${
                    isP1
                      ? isDark
                        ? 'py-4.5 bg-[#E10600]/10 hover:bg-[#E10600]/15'
                        : 'py-4.5 bg-[#E10600]/5 hover:bg-[#E10600]/10'
                      : isDark
                      ? 'py-3.5 hover:bg-[#181820]'
                      : 'py-3.5 hover:bg-[#F8F8FA]'
                  }`}
                >
                  {/* Left Red Racing Indicator on hover or P1 */}
                  {isP1 ? (
                    <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#E10600]"></div>
                  ) : (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-transparent group-hover:bg-[#E10600] transition-colors"></div>
                  )}

                  {/* POS Column with F1 Badge */}
                  <div className="col-span-2 sm:col-span-1 text-center">
                    <span
                      className={`inline-flex items-center justify-center font-f1-title font-black rounded-[2px] ${
                        isP1
                          ? 'w-8 h-8 bg-[#E10600] text-white text-lg shadow-[0_0_10px_rgba(225,6,0,0.5)]'
                          : isP2
                          ? 'w-7 h-7 bg-[#C0C0C0] text-black text-base'
                          : isP3
                          ? 'w-7 h-7 bg-[#CD7F32] text-white text-base'
                          : isDark
                          ? 'w-7 h-7 bg-[#1E1E28] text-[#9A9AA8] text-base group-hover:text-white'
                          : 'w-7 h-7 bg-[#EAEAEE] text-[#555566] text-base group-hover:text-black'
                      }`}
                    >
                      {driver.rank}
                    </span>
                  </div>

                  {/* Driver Info Column */}
                  <div className="col-span-7 sm:col-span-7 pl-2 flex items-center gap-3.5">
                    {/* Small Flag */}
                    <div className="w-6 h-4 overflow-hidden rounded-[2px] border border-black/20 shrink-0 shadow-sm">
                      <img
                        src={driver.flagUrl}
                        alt={driver.country}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    <div className="min-w-0">
                      <div className="font-f1-title text-base sm:text-lg font-black tracking-tight uppercase group-hover:text-[#E10600] transition-colors truncate">
                        {driver.firstName}{' '}
                        <span className="text-[#E10600]">{driver.lastName}</span>
                      </div>
                      <div className="flex items-center gap-2 font-f1-sans text-[11px] text-[#888899] font-bold uppercase tracking-wider">
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: driver.teamColor }}
                        ></span>
                        <span className="truncate">{driver.team}</span>
                      </div>
                    </div>
                  </div>

                  {/* Wins Column */}
                  <div className="col-span-2 text-center hidden sm:block font-mono-f1 text-sm font-bold">
                    {driver.wins > 0 ? (
                      <span className="text-[#E10600] font-black">{driver.wins} W</span>
                    ) : (
                      <span className="text-[#666677]">-</span>
                    )}
                  </div>

                  {/* Points Column */}
                  <div className="col-span-3 sm:col-span-2 text-right pr-2 font-mono-f1">
                    <span
                      className={`font-black ${
                        isP1
                          ? 'text-2xl text-[#E10600]'
                          : isDark
                          ? 'text-lg text-white'
                          : 'text-lg text-[#111115]'
                      }`}
                    >
                      {driver.points}
                    </span>
                    <span className="text-[10px] text-[#888899] font-bold ml-1 uppercase">PTS</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick Action Helper Banner */}
          <div className={`flex items-center justify-between p-4 rounded border font-f1-sans text-xs ${
            isDark
              ? 'bg-[#15151C] border-[#22222A] text-[#9A9AA8]'
              : 'bg-[#F0F0F4] border-[#E2E2E8] text-[#555566]'
          }`}>
            <span>Select any driver above to review verified career stats and speed telemetry.</span>
            <button
              onClick={onOpenLiveModal}
              className="text-[#E10600] hover:underline font-black uppercase tracking-wider text-[11px] flex items-center gap-1"
            >
              <span>Live Simulator</span>
              <span>&rarr;</span>
            </button>
          </div>
        </div>

        {/* Right: Constructors Championship (4 cols) */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          <div className="flex justify-between items-center pb-2">
            <div className="flex items-center gap-3">
              <span className="w-2.5 h-2.5 bg-[#E10600] rounded-[2px]"></span>
              <h2 className="font-f1-title text-2xl font-black uppercase tracking-tight">
                Constructors
              </h2>
            </div>
            <span className="font-f1-sans text-xs text-[#888899] uppercase tracking-[0.2em] font-bold">
              10 Teams
            </span>
          </div>

          <div className={`border rounded p-4 flex flex-col gap-3 shadow-sm ${
            isDark ? 'bg-[#121217] border-[#22222A]' : 'bg-[#FFFFFF] border-[#E2E2E8]'
          }`}>
            {CONSTRUCTORS.slice(0, 6).map((team) => {
              const isP1Team = team.rank === 1;

              return (
                <div
                  key={team.id}
                  className={`flex items-center justify-between p-3 rounded transition-all relative overflow-hidden group ${
                    isP1Team
                      ? isDark
                        ? 'bg-[#E10600]/10 border border-[#E10600]/40'
                        : 'bg-[#E10600]/5 border border-[#E10600]/30'
                      : isDark
                      ? 'bg-[#181820] border border-[#22222A] hover:border-[#E10600]/40'
                      : 'bg-[#F8F8FA] border border-[#EAEAEF] hover:border-[#E10600]/40'
                  }`}
                >
                  {/* Left Accent Bar using Team Color */}
                  <div
                    className="absolute left-0 top-0 bottom-0 w-1.5"
                    style={{ backgroundColor: team.accentColor }}
                  ></div>

                  <div className="flex items-center gap-3 pl-2">
                    <div className="font-f1-title text-lg font-black text-[#888899] w-5">
                      {team.rank}
                    </div>
                    <div>
                      <div className="font-f1-title font-black text-base uppercase tracking-tight group-hover:text-[#E10600] transition-colors">
                        {team.name}
                      </div>
                      <div className="font-f1-sans text-[10px] text-[#888899] uppercase font-bold tracking-wider">
                        {team.engine}
                      </div>
                    </div>
                  </div>

                  <div className="text-right font-mono-f1">
                    <span
                      className={`font-black ${
                        isP1Team ? 'text-xl text-[#E10600]' : 'text-base font-bold'
                      }`}
                    >
                      {team.points}
                    </span>
                    <span className="text-[9px] text-[#888899] ml-1 uppercase font-bold">PTS</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Telemetry Latency Status */}
          <div className={`p-4 rounded border ${
            isDark ? 'bg-[#15151C] border-[#22222A]' : 'bg-[#F0F0F4] border-[#E2E2E8]'
          }`}>
            <div className="flex justify-between items-center mb-1.5 font-f1-sans text-xs">
              <span className="font-black uppercase tracking-[0.18em] text-[10px] text-[#E10600]">
                Telemetry Stream
              </span>
              <span className="font-mono-f1 text-[11px] text-[#00D2BE] font-bold">99.9% LIVE</span>
            </div>
            <div className="h-1.5 w-full bg-black/20 rounded-full overflow-hidden">
              <div className="h-full bg-[#E10600] w-3/4 rounded-full"></div>
            </div>
            <div className="flex justify-between items-center mt-2.5 text-[10px] font-f1-sans text-[#888899] uppercase tracking-wider font-bold">
              <span>Monaco Harbor Sector</span>
              <span>12ms Latency</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
