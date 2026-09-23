import React, { useState, useEffect } from 'react';
import { ASSETS, FINAL_CLASSIFICATION, INITIAL_TELEMETRY } from '../data/f1Data';
import { LiveTelemetryData, ThemeMode } from '../types';
import { RaceReplayPanel } from './RaceReplay/RaceReplayPanel';

interface LiveTelemetryScreenProps {
  onOpenLiveModal: () => void;
  activeSubTab?: string;
  onSubTabChange?: (tab: string) => void;
  theme?: ThemeMode;
}

export const LiveTelemetryScreen: React.FC<LiveTelemetryScreenProps> = ({
  onOpenLiveModal,
  activeSubTab = 'tire',
  onSubTabChange,
  theme = 'dark'
}) => {
  const [telemetry, setTelemetry] = useState<LiveTelemetryData>(INITIAL_TELEMETRY);
  const [isSimulating, setIsSimulating] = useState(true);
  const [selectedDriver, setSelectedDriver] = useState('VERSTAPPEN');

  const isDark = theme === 'dark';

  // Live telemetry pulse animation & simulation
  useEffect(() => {
    if (!isSimulating) return;

    const interval = setInterval(() => {
      setTelemetry((prev) => {
        const speedDelta = (Math.random() - 0.48) * 14;
        const newSpeed = Math.min(338, Math.max(120, Math.round(prev.speed + speedDelta)));
        const newRpm = Math.min(12500, Math.max(8500, Math.round(8000 + (newSpeed / 338) * 4400)));
        const newGear = newSpeed > 290 ? 8 : newSpeed > 250 ? 7 : newSpeed > 200 ? 6 : newSpeed > 150 ? 5 : 4;
        const newThrottle = newSpeed > 260 ? 98 : Math.max(20, Math.round((newSpeed / 338) * 100));

        return {
          ...prev,
          speed: newSpeed,
          rpm: newRpm,
          gear: newGear,
          throttle: newThrottle,
          tireWear: Math.min(85, +(prev.tireWear + 0.02).toFixed(1)),
          fuelLoad: Math.max(4.0, +(prev.fuelLoad - 0.01).toFixed(1))
        };
      });
    }, 600);

    return () => clearInterval(interval);
  }, [isSimulating]);

  return (
    <div className="max-w-[1600px] mx-auto min-h-screen flex flex-col gap-8 pb-12">
      {/* Header Banner */}
      <div className={`flex flex-col sm:flex-row sm:items-end justify-between border-b pb-5 gap-4 ${
        isDark ? 'border-[#22222A]' : 'border-[#E2E2E8]'
      }`}>
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="bg-[#E10600] text-white font-f1-sans text-[10px] font-black uppercase tracking-[0.25em] px-2 py-0.5 rounded-[2px]">
              LIVE TELEMETRY
            </span>
            <span className="text-[10px] uppercase tracking-[0.25em] font-f1-sans font-bold text-[#888899]">
              Circuit de Monaco // 78 Laps
            </span>
          </div>
          <h1 className="font-f1-title text-4xl md:text-6xl font-black tracking-tight leading-none uppercase">
            RACE <span className="text-[#E10600]">TELEMETRY</span> & TIMING
          </h1>
          <p className="font-f1-sans text-sm text-[#888899] mt-2 max-w-2xl">
            Live telemetry stream, tire degradation curves, fuel load models, and official FIA classification.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto font-f1-sans text-xs">
          <button
            onClick={() => setIsSimulating(!isSimulating)}
            className={`px-3.5 py-2 uppercase tracking-wider font-bold rounded transition-all flex items-center gap-2 ${
              isSimulating
                ? 'bg-[#E10600] text-white shadow-[0_2px_10px_rgba(225,6,0,0.4)]'
                : isDark
                ? 'bg-[#181820] text-[#888899] border border-[#2A2A36]'
                : 'bg-[#FFFFFF] text-[#666677] border border-[#D4D4DC]'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${isSimulating ? 'bg-white blinking-dot' : 'bg-gray-400'}`}></span>
            <span>{isSimulating ? 'Stream Active' : 'Stream Paused'}</span>
          </button>

          <button
            onClick={onOpenLiveModal}
            className={`px-4 py-2 uppercase tracking-wider font-bold rounded border transition-all ${
              isDark
                ? 'bg-[#181820] border-[#30303C] text-white hover:border-[#E10600]'
                : 'bg-[#FFFFFF] border-[#D4D4DC] text-[#111115] hover:border-[#E10600]'
            }`}
          >
            Cockpit HUD
          </button>
        </div>
      </div>

      {/* Top Grid: Podium Winner Card + Performance Degradation Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Podium / Winner Section (7 cols) with F1 Red Accents */}
        <section className={`lg:col-span-7 relative h-[420px] sm:h-[460px] lg:h-[500px] border rounded overflow-hidden group shadow-lg ${
          isDark ? 'bg-[#121217] border-[#22222A]' : 'bg-[#E2E2E8] border-[#DCDCDE]'
        }`}>
          <img
            src={ASSETS.winnerHeroPhoto}
            alt="Max Verstappen Podium Victory"
            className="w-full h-full object-cover object-top opacity-90 group-hover:scale-105 transition-all duration-700"
          />
          {/* Carbon Dark gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0C] via-[#0A0A0C]/50 to-transparent"></div>

          {/* Winner Details Overlay */}
          <div className="absolute bottom-6 left-6 right-6 z-10 text-white">
            <div className="flex items-center gap-3 mb-2">
              <span className="bg-[#E10600] text-white font-f1-sans text-xs uppercase tracking-[0.25em] font-black px-3 py-1 rounded-[2px] shadow-[0_0_12px_rgba(225,6,0,0.6)]">
                P01 WINNER
              </span>
              <span className="font-f1-sans text-[11px] text-white/80 uppercase font-bold tracking-[0.2em]">
                Grand Prix de Monaco 2024
              </span>
            </div>

            <h2 className="font-f1-title text-4xl sm:text-6xl font-black text-white uppercase tracking-tight leading-none mb-3 drop-shadow-md">
              MAX <span className="text-[#E10600]">VERSTAPPEN</span>
            </h2>

            <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-white/20">
              <div className="flex gap-2 items-center font-mono-f1 text-xs">
                <span className="px-2.5 py-1 bg-[#00D2BE] text-black font-black rounded-[2px]">
                  S1 19.412
                </span>
                <span className="px-2.5 py-1 bg-[#00D2BE] text-black font-black rounded-[2px]">
                  S2 34.021
                </span>
                <span className="px-2.5 py-1 bg-[#A855F7] text-white font-black rounded-[2px] shadow-[0_0_8px_#A855F7]">
                  S3 20.851 ★
                </span>
              </div>
              <span className="font-f1-sans text-[11px] uppercase tracking-[0.2em] text-white/80 font-bold ml-auto">
                Fastest Lap: 1:14.284
              </span>
            </div>
          </div>
        </section>

        {/* Right: Performance Degradation & Telemetry Stats (5 cols) */}
        <section className={`lg:col-span-5 border rounded p-6 sm:p-8 flex flex-col justify-between relative shadow-sm ${
          isDark ? 'bg-[#121217] border-[#22222A]' : 'bg-[#FFFFFF] border-[#E2E2E8]'
        }`}>
          {/* Header row */}
          <div className={`flex justify-between items-baseline pb-3 border-b ${
            isDark ? 'border-[#22222A]' : 'border-[#E2E2E8]'
          }`}>
            <div>
              <span className="text-[10px] uppercase tracking-[0.25em] font-f1-sans font-black text-[#E10600] block mb-0.5">
                TELEMETRY ANALYTICS
              </span>
              <h3 className="font-f1-title font-black text-2xl uppercase tracking-tight">
                Degradation Model
              </h3>
            </div>
            <div className="flex items-center gap-2 font-mono-f1 text-xs text-[#00D2BE] font-bold">
              <span className="w-2 h-2 rounded-full bg-[#00D2BE] blinking-dot"></span>
              <span>LIVE CAR #01</span>
            </div>
          </div>

          {/* Graph Area */}
          <div className="flex-grow flex flex-col justify-center gap-6 relative h-48 my-4">
            {/* Grid background lines */}
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-20">
              <div className={`w-full border-t border-dashed ${isDark ? 'border-white' : 'border-black'}`}></div>
              <div className={`w-full border-t border-dashed ${isDark ? 'border-white' : 'border-black'}`}></div>
              <div className={`w-full border-t border-dashed ${isDark ? 'border-white' : 'border-black'}`}></div>
            </div>

            {/* Line 1: Tire Wear */}
            <div className="relative w-full h-12">
              <div className="absolute left-0 -top-5 font-f1-sans text-[11px] uppercase tracking-wider font-bold flex items-center gap-2">
                <span className="text-[#E10600]">Tire Wear</span>
                <span className="text-[10px] text-[#888899] font-normal">(Hard C3 Compound)</span>
              </div>
              <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 20">
                <path
                  className="telemetry-line"
                  d="M0,4 Q25,4 45,7 T80,12 T100,17"
                  fill="none"
                  stroke="#E10600"
                  strokeWidth="2.5"
                />
                <circle cx="100" cy="17" r="4" fill="#E10600" />
              </svg>
              <div className="absolute right-0 top-0 font-mono-f1 text-xl font-black text-[#E10600]">
                {telemetry.tireWear}%
              </div>
            </div>

            {/* Line 2: Fuel Load */}
            <div className="relative w-full h-12">
              <div className="absolute left-0 -top-5 font-f1-sans text-[11px] uppercase tracking-wider text-[#888899] font-bold flex items-center gap-2">
                <span>Fuel Load (KG)</span>
                <span className="text-[10px] text-[#888899] font-normal">Est. Remaining</span>
              </div>
              <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 20">
                <path
                  className="telemetry-line"
                  d="M0,2 Q30,6 60,10 T100,18"
                  fill="none"
                  stroke={isDark ? '#6A6A78' : '#888899'}
                  strokeWidth="2"
                />
                <circle cx="100" cy="18" r="3.5" fill={isDark ? '#9A9AA8' : '#555566'} />
              </svg>
              <div className="absolute right-0 top-0 font-mono-f1 text-xl font-bold text-[#888899]">
                {telemetry.fuelLoad} kg
              </div>
            </div>
          </div>

          {/* Bottom Indicators */}
          <div className={`grid grid-cols-2 gap-4 mt-auto pt-4 border-t ${
            isDark ? 'border-[#22222A]' : 'border-[#E2E2E8]'
          }`}>
            <div className={`p-3.5 rounded border ${
              isDark ? 'bg-[#181820] border-[#2A2A36]' : 'bg-[#F4F4F8] border-[#E2E2E8]'
            }`}>
              <div className="font-f1-sans text-[10px] text-[#888899] uppercase tracking-[0.2em] font-bold mb-0.5">
                Fastest Lap
              </div>
              <div className="font-mono-f1 text-xl font-black text-[#E10600] tracking-tight">
                {telemetry.bestLap}
              </div>
            </div>

            <div className={`p-3.5 rounded border ${
              isDark ? 'bg-[#181820] border-[#2A2A36]' : 'bg-[#F4F4F8] border-[#E2E2E8]'
            }`}>
              <div className="font-f1-sans text-[10px] text-[#888899] uppercase tracking-[0.2em] font-bold mb-0.5">
                Speed Trap Peak
              </div>
              <div className="font-mono-f1 text-xl font-black tracking-tight">
                {telemetry.topSpeed} <span className="text-xs font-bold text-[#888899]">KM/H</span>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Final Classification Table */}
      <section className="flex flex-col gap-4">
        <div className="flex justify-between items-end">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 bg-[#E10600] rounded-[2px]"></span>
            <h3 className="font-f1-title text-3xl font-black uppercase tracking-tight">
              Grand Prix Classification
            </h3>
          </div>
          <button
            onClick={onOpenLiveModal}
            className="font-f1-sans text-xs uppercase tracking-[0.18em] font-black text-[#E10600] hover:underline"
          >
            Launch Cockpit Feed &rarr;
          </button>
        </div>

        <div className={`border rounded overflow-hidden shadow-sm ${
          isDark ? 'bg-[#121217] border-[#22222A]' : 'bg-[#FFFFFF] border-[#E2E2E8]'
        }`}>
          {/* Header Row */}
          <div className={`grid grid-cols-12 gap-2 px-6 py-3 border-b font-f1-sans text-[11px] uppercase tracking-[0.2em] font-black ${
            isDark
              ? 'bg-[#16161D] border-[#22222A] text-[#888899]'
              : 'bg-[#F4F4F8] border-[#E2E2E8] text-[#666677]'
          }`}>
            <div className="col-span-1">POS</div>
            <div className="col-span-4">Driver</div>
            <div className="col-span-3">Constructor</div>
            <div className="col-span-2 text-right">Time / Gap</div>
            <div className="col-span-2 text-right">PTS</div>
          </div>

          {/* Rows */}
          {FINAL_CLASSIFICATION.map((row) => {
            const isWinner = row.pos === 1;
            const isDNF = row.status === 'dnf';

            return (
              <div
                key={row.driver}
                onClick={() => setSelectedDriver(row.driver)}
                className={`grid grid-cols-12 gap-2 px-6 items-center transition-all cursor-pointer border-b ${
                  isDark ? 'border-[#1C1C24]' : 'border-[#F0F0F4]'
                } ${
                  isWinner
                    ? isDark
                      ? 'py-4 bg-[#E10600]/10 hover:bg-[#E10600]/15'
                      : 'py-4 bg-[#E10600]/5 hover:bg-[#E10600]/10'
                    : isDNF
                    ? isDark
                      ? 'py-3 opacity-50 hover:opacity-100 hover:bg-[#181820]'
                      : 'py-3 opacity-50 hover:opacity-100 hover:bg-[#F4F4F8]'
                    : isDark
                    ? 'py-3.5 hover:bg-[#181820]'
                    : 'py-3.5 hover:bg-[#F8F8FA]'
                }`}
              >
                {/* Pos */}
                <div className="col-span-1">
                  <span
                    className={`inline-flex items-center justify-center font-f1-title font-black rounded-[2px] ${
                      isWinner
                        ? 'w-7 h-7 bg-[#E10600] text-white text-base shadow-[0_0_8px_rgba(225,6,0,0.5)]'
                        : isDNF
                        ? 'w-7 h-7 bg-transparent text-[#888899] text-sm'
                        : isDark
                        ? 'w-7 h-7 bg-[#1C1C26] text-white text-sm'
                        : 'w-7 h-7 bg-[#EAEAEE] text-black text-sm'
                    }`}
                  >
                    {row.pos}
                  </span>
                </div>

                {/* Driver */}
                <div
                  className={`col-span-4 font-f1-title font-black uppercase tracking-tight ${
                    isWinner
                      ? 'text-lg text-[#E10600]'
                      : isDNF
                      ? 'text-sm text-[#888899] line-through'
                      : 'text-base'
                  }`}
                >
                  {row.driver}
                </div>

                {/* Team */}
                <div className="col-span-3 font-f1-sans text-xs uppercase font-bold tracking-wider text-[#888899] truncate">
                  {row.team}
                </div>

                {/* Time/Ret */}
                <div
                  className={`col-span-2 text-right font-mono-f1 text-xs ${
                    isWinner
                      ? 'font-black text-[#00D2BE]'
                      : isDNF
                      ? 'text-[#E10600] font-black'
                      : 'font-semibold text-[#888899]'
                  }`}
                >
                  {row.timeRet}
                </div>

                {/* PTS */}
                <div className="col-span-2 text-right font-mono-f1">
                  <span
                    className={`font-black ${
                      isWinner
                        ? 'text-xl text-[#E10600]'
                        : isDNF
                        ? 'text-sm text-[#888899]'
                        : 'text-base font-bold'
                    }`}
                  >
                    {row.pts}
                  </span>
                  <span className="text-[10px] text-[#888899] ml-1 uppercase font-bold">PTS</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Live stream simulation, replayed from the race's real OpenF1 traces */}
      <RaceReplayPanel />
    </div>
  );
};
