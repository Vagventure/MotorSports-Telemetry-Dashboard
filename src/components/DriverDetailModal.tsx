import React from 'react';
import { Driver, ThemeMode } from '../types';

interface DriverDetailModalProps {
  driver: Driver | null;
  onClose: () => void;
  onOpenLiveModal: () => void;
  theme?: ThemeMode;
}

export const DriverDetailModal: React.FC<DriverDetailModalProps> = ({
  driver,
  onClose,
  onOpenLiveModal,
  theme = 'dark'
}) => {
  if (!driver) return null;

  const isDark = theme === 'dark';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div
        className={`w-full max-w-3xl rounded-lg border overflow-hidden shadow-2xl flex flex-col transition-colors ${
          isDark
            ? 'bg-[#0E0E12] border-[#2A2A36] text-white'
            : 'bg-[#FFFFFF] border-[#D4D4DC] text-[#111115]'
        }`}
      >
        {/* Top Header Accent */}
        <div
          className="h-1.5 w-full"
          style={{ backgroundColor: driver.teamColor }}
        ></div>

        {/* Modal Top Bar */}
        <div className={`flex justify-between items-center px-6 py-4 border-b ${
          isDark ? 'border-[#22222A] bg-[#14141A]' : 'border-[#E2E2E8] bg-[#F4F4F8]'
        }`}>
          <div className="flex items-center gap-2">
            <span className="font-f1-title font-black text-sm px-2 py-0.5 bg-[#E10600] text-white rounded-[2px]">
              POS {driver.rank}
            </span>
            <span className="font-f1-sans text-xs uppercase font-bold text-[#888899] tracking-wider">
              Car #{driver.number} // {driver.team}
            </span>
          </div>

          <button
            onClick={onClose}
            className={`w-8 h-8 rounded flex items-center justify-center transition-colors ${
              isDark ? 'hover:bg-[#22222E] text-white' : 'hover:bg-[#EAEAEF] text-black'
            }`}
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 md:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row gap-6 items-center sm:items-start">
            {/* Portrait */}
            <div className={`w-36 h-44 rounded border overflow-hidden flex items-end justify-center shrink-0 relative ${
              isDark ? 'bg-[#15151C] border-[#2A2A36]' : 'bg-[#F4F4F8] border-[#E2E2E8]'
            }`}>
              <div className="absolute top-2 right-2 font-f1-title text-4xl font-black text-black/10 dark:text-white/10 select-none">
                {driver.number}
              </div>
              <img
                src={driver.portraitUrl}
                alt={`${driver.firstName} ${driver.lastName}`}
                className="h-full object-contain relative z-10 filter drop-shadow-md"
              />
            </div>

            {/* Info */}
            <div className="flex-1 text-center sm:text-left">
              <div className="flex items-center justify-center sm:justify-start gap-2 mb-1">
                <div className="w-5 h-3.5 overflow-hidden rounded-[1px] border border-black/20">
                  <img
                    src={driver.flagUrl}
                    alt={driver.country}
                    className="w-full h-full object-cover"
                  />
                </div>
                <span className="font-f1-sans text-xs uppercase font-bold text-[#888899] tracking-wider">
                  {driver.country}
                </span>
              </div>

              <h2 className="font-f1-title text-3xl sm:text-4xl font-black uppercase tracking-tight leading-none">
                {driver.firstName} <span className="text-[#E10600]">{driver.lastName}</span>
              </h2>

              <p className="font-f1-sans text-xs text-[#888899] uppercase font-bold tracking-widest mt-1">
                {driver.team}
              </p>

              <div className="mt-4 flex flex-wrap gap-4 justify-center sm:justify-start">
                <div className={`px-4 py-2 rounded border text-center ${
                  isDark ? 'bg-[#15151C] border-[#2A2A36]' : 'bg-[#F4F4F8] border-[#E2E2E8]'
                }`}>
                  <div className="font-f1-sans text-[10px] text-[#888899] uppercase font-bold tracking-wider">
                    Points
                  </div>
                  <div className="font-mono-f1 text-2xl font-black text-[#E10600]">
                    {driver.points}
                  </div>
                </div>

                <div className={`px-4 py-2 rounded border text-center ${
                  isDark ? 'bg-[#15151C] border-[#2A2A36]' : 'bg-[#F4F4F8] border-[#E2E2E8]'
                }`}>
                  <div className="font-f1-sans text-[10px] text-[#888899] uppercase font-bold tracking-wider">
                    Wins
                  </div>
                  <div className="font-mono-f1 text-2xl font-black">
                    {driver.wins}
                  </div>
                </div>

                <div className={`px-4 py-2 rounded border text-center ${
                  isDark ? 'bg-[#15151C] border-[#2A2A36]' : 'bg-[#F4F4F8] border-[#E2E2E8]'
                }`}>
                  <div className="font-f1-sans text-[10px] text-[#888899] uppercase font-bold tracking-wider">
                    Podiums
                  </div>
                  <div className="font-mono-f1 text-2xl font-black">
                    {driver.podiums}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bio / Summary */}
          <div className={`p-4 rounded border font-f1-sans text-xs leading-relaxed ${
            isDark
              ? 'bg-[#15151C] border-[#22222A] text-[#A0A0B0]'
              : 'bg-[#F4F4F8] border-[#E2E2E8] text-[#555566]'
          }`}>
            {driver.bio ||
              `${driver.firstName} ${driver.lastName} currently drives car #${driver.number} for ${driver.team} in the 2024 FIA Formula 1 World Championship, contending at the highest tier of international motorsport.`}
          </div>
        </div>

        {/* Footer */}
        <div className={`px-6 py-4 border-t flex justify-between items-center font-f1-sans text-xs ${
          isDark ? 'bg-[#14141A] border-[#22222A]' : 'bg-[#F4F4F8] border-[#E2E2E8]'
        }`}>
          <button
            onClick={onOpenLiveModal}
            className="text-[#E10600] font-black uppercase tracking-wider text-xs hover:underline flex items-center gap-1"
          >
            <span>Live Telemetry Analysis</span>
            <span>&rarr;</span>
          </button>

          <button
            onClick={onClose}
            className="bg-[#E10600] hover:bg-[#FF1801] text-white font-bold uppercase tracking-wider text-xs px-5 py-2 rounded"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
