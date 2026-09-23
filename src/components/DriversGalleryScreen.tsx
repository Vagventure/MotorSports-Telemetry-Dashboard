import React, { useState } from 'react';
import { DRIVERS } from '../data/f1Data';
import { Driver, ThemeMode } from '../types';

interface DriversGalleryScreenProps {
  onSelectDriver: (driver: Driver) => void;
  theme?: ThemeMode;
}

export const DriversGalleryScreen: React.FC<DriversGalleryScreenProps> = ({
  onSelectDriver,
  theme = 'dark'
}) => {
  const [teamFilter, setTeamFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const isDark = theme === 'dark';

  const teams = ['ALL', 'Red Bull Racing', 'Ferrari', 'Mercedes', 'McLaren', 'Aston Martin'];

  const filteredDrivers = DRIVERS.filter((driver) => {
    const matchesTeam = teamFilter === 'ALL' || driver.team.toLowerCase().includes(teamFilter.toLowerCase());
    const matchesSearch =
      driver.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      driver.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      driver.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      driver.team.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTeam && matchesSearch;
  });

  return (
    <div className="max-w-[1600px] mx-auto pb-12 flex flex-col gap-8">
      {/* Header */}
      <div className={`flex flex-col md:flex-row md:items-end justify-between border-b pb-5 gap-4 ${
        isDark ? 'border-[#22222A]' : 'border-[#E2E2E8]'
      }`}>
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="bg-[#E10600] text-white font-f1-sans text-[10px] font-black uppercase tracking-[0.25em] px-2 py-0.5 rounded-[2px]">
              FIA GRID
            </span>
            <span className="text-[10px] uppercase tracking-[0.25em] font-f1-sans font-bold text-[#888899]">
              2024 Lineup // 20 Drivers
            </span>
          </div>
          <h1 className="font-f1-title text-4xl md:text-6xl font-black tracking-tight leading-none uppercase">
            CHAMPIONSHIP <span className="text-[#E10600]">GRID</span>
          </h1>
          <p className="font-f1-sans text-sm text-[#888899] mt-2 max-w-xl">
            Driver profiles, car telemetry stats, championship standings, and career achievements.
          </p>
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-72">
          <span className="material-symbols-outlined absolute left-3 top-2.5 text-[18px] text-[#888899]">
            search
          </span>
          <input
            type="text"
            placeholder="Search driver, code, team..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full pl-9 pr-4 py-2 font-f1-sans text-xs rounded border transition-all outline-none ${
              isDark
                ? 'bg-[#14141A] border-[#2A2A36] text-white placeholder-[#666677] focus:border-[#E10600]'
                : 'bg-[#FFFFFF] border-[#D4D4DC] text-black placeholder-[#888899] focus:border-[#E10600]'
            }`}
          />
        </div>
      </div>

      {/* Team Filter Pills */}
      <div className="flex flex-wrap items-center gap-2">
        {teams.map((team) => (
          <button
            key={team}
            onClick={() => setTeamFilter(team)}
            className={`font-f1-sans text-xs uppercase tracking-wider font-bold px-3.5 py-1.5 rounded transition-all ${
              teamFilter === team
                ? 'bg-[#E10600] text-white shadow-[0_2px_8px_rgba(225,6,0,0.35)]'
                : isDark
                ? 'bg-[#15151C] text-[#888899] border border-[#22222A] hover:text-white hover:border-[#E10600]'
                : 'bg-[#FFFFFF] text-[#555566] border border-[#E2E2E8] hover:text-black hover:border-[#E10600]'
            }`}
          >
            {team}
          </button>
        ))}
      </div>

      {/* Drivers Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredDrivers.map((driver) => {
          const isP1 = driver.rank === 1;

          return (
            <div
              key={driver.id}
              onClick={() => onSelectDriver(driver)}
              className={`border rounded overflow-hidden cursor-pointer group transition-all duration-300 transform hover:-translate-y-1 relative flex flex-col justify-between shadow-sm ${
                isDark
                  ? 'bg-[#121217] border-[#22222A] hover:border-[#E10600]'
                  : 'bg-[#FFFFFF] border-[#E2E2E8] hover:border-[#E10600]'
              }`}
            >
              {/* Top Accent Line */}
              <div
                className="h-1 w-full"
                style={{ backgroundColor: driver.teamColor }}
              ></div>

              {/* Card Header */}
              <div className="p-4 flex justify-between items-start">
                <div className="flex items-center gap-2">
                  <span
                    className={`font-f1-title font-black px-2 py-0.5 rounded-[2px] text-xs ${
                      isP1
                        ? 'bg-[#E10600] text-white shadow-[0_0_8px_rgba(225,6,0,0.5)]'
                        : isDark
                        ? 'bg-[#1E1E28] text-white'
                        : 'bg-[#EAEAEF] text-black'
                    }`}
                  >
                    POS {driver.rank}
                  </span>
                  <span className="font-mono-f1 font-bold text-xs text-[#888899]">
                    #{driver.number}
                  </span>
                </div>

                <div className="w-5 h-3.5 overflow-hidden rounded-[1px] border border-black/20">
                  <img
                    src={driver.flagUrl}
                    alt={driver.country}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>

              {/* Driver Portrait */}
              <div className="relative h-48 sm:h-52 w-full flex items-end justify-center overflow-hidden px-4">
                {/* Large Background Watermark Car Number */}
                <div className="absolute right-2 top-2 font-f1-title text-7xl font-black text-black/10 dark:text-white/5 pointer-events-none select-none">
                  {driver.number}
                </div>

                <img
                  src={driver.portraitUrl}
                  alt={`${driver.firstName} ${driver.lastName}`}
                  className="h-full object-contain relative z-10 filter drop-shadow-md group-hover:scale-105 transition-transform duration-500"
                />
              </div>

              {/* Card Footer Info */}
              <div className={`p-4 border-t ${
                isDark ? 'bg-[#15151C] border-[#1E1E26]' : 'bg-[#F8F8FA] border-[#ECECEE]'
              }`}>
                <div className="flex justify-between items-end">
                  <div>
                    <div className="font-f1-sans text-[11px] uppercase font-bold text-[#888899]">
                      {driver.firstName}
                    </div>
                    <div className="font-f1-title text-xl font-black uppercase tracking-tight leading-none group-hover:text-[#E10600] transition-colors">
                      {driver.lastName}
                    </div>
                    <div className="font-f1-sans text-[10px] uppercase font-bold tracking-wider text-[#888899] mt-1 flex items-center gap-1.5">
                      <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: driver.teamColor }}
                      ></span>
                      <span className="truncate max-w-[140px]">{driver.team}</span>
                    </div>
                  </div>

                  <div className="text-right font-mono-f1">
                    <div className="font-black text-xl text-[#E10600] leading-none">
                      {driver.points}
                    </div>
                    <div className="text-[9px] uppercase font-bold text-[#888899] mt-0.5">
                      PTS
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
