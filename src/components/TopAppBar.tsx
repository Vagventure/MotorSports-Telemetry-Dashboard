import React from 'react';
import { NavigationTab, ThemeMode } from '../types';

interface TopAppBarProps {
  currentTab: NavigationTab;
  onTabChange: (tab: NavigationTab) => void;
  onOpenLiveModal: () => void;
  onOpenWeather: () => void;
  liveSubTab?: string;
  onLiveSubTabChange?: (sub: string) => void;
  theme: ThemeMode;
  onToggleTheme: () => void;
}

export const TopAppBar: React.FC<TopAppBarProps> = ({
  currentTab,
  onTabChange,
  onOpenLiveModal,
  onOpenWeather,
  liveSubTab = 'tire',
  onLiveSubTabChange,
  theme,
  onToggleTheme
}) => {
  const isLiveTelemetryScreen = currentTab === 'live';
  const isDark = theme === 'dark';

  return (
    <header className={`w-full sticky top-0 z-50 transition-colors duration-200 border-b ${
      isDark
        ? 'bg-[#0E0E12]/95 border-[#24242C] backdrop-blur-md text-[#FFFFFF]'
        : 'bg-[#FFFFFF]/95 border-[#E2E2E8] backdrop-blur-md text-[#111115]'
    }`}>
      {/* Top Red F1 Racing Accent Stripe */}
      <div className="h-1 w-full bg-gradient-to-r from-[#E10600] via-[#FF2A1A] to-[#990000]"></div>

      <div className="flex justify-between items-center px-4 md:px-8 py-3 max-w-[1600px] mx-auto">
        {/* Brand / Logo with Classic F1 Badge */}
        <div className="flex items-center gap-6 md:gap-8">
          <div
            onClick={() => onTabChange('standings')}
            className="flex items-center gap-3 cursor-pointer group select-none"
          >
            {/* Official F1 Red Badge */}
            <div className="bg-[#E10600] text-white font-f1-title font-black text-2xl tracking-tighter px-3 py-0.5 rounded-[3px] shadow-[0_2px_10px_rgba(225,6,0,0.4)] flex items-center group-hover:bg-[#FF1801] transition-all transform group-hover:scale-105">
              <span>F1</span>
            </div>

            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="font-f1-title text-xl md:text-2xl font-black tracking-tight leading-none">
                  TELEMETRY
                </span>
                <span className="text-[10px] font-mono-f1 uppercase font-bold px-1.5 py-0.5 bg-[#E10600]/15 text-[#E10600] border border-[#E10600]/30 rounded">
                  PRO
                </span>
              </div>
              <span className="text-[9px] uppercase tracking-[0.25em] font-f1-sans font-semibold text-[#888899]">
                FIA Formula 1 World Championship
              </span>
            </div>
          </div>

          {/* Sub-tabs if on Live view */}
          {isLiveTelemetryScreen && onLiveSubTabChange && (
            <nav className={`hidden xl:flex gap-4 ml-4 pl-6 border-l ${
              isDark ? 'border-[#24242C]' : 'border-[#E2E2E8]'
            }`}>
              {[
                { id: 'pitwall', label: 'Pit Wall' },
                { id: 'strategy', label: 'Strategy' },
                { id: 'tire', label: 'Tire Analytics' },
                { id: 'trackmap', label: 'Circuit Telemetry' }
              ].map((item) => {
                const isActive = liveSubTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onLiveSubTabChange(item.id)}
                    className={`font-f1-sans text-xs tracking-[0.15em] uppercase px-3 py-1 rounded transition-all font-bold ${
                      isActive
                        ? 'bg-[#E10600] text-white shadow-[0_2px_8px_rgba(225,6,0,0.35)]'
                        : isDark
                        ? 'text-[#9A9AA8] hover:text-white hover:bg-[#1C1C24]'
                        : 'text-[#666677] hover:text-[#111115] hover:bg-[#EFEFF4]'
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </nav>
          )}
        </div>

        {/* Desktop Primary Nav (for Standard views) */}
        {!isLiveTelemetryScreen && (
          <nav className="hidden lg:flex gap-8 items-center font-f1-sans text-xs uppercase tracking-[0.2em] font-bold">
            <button
              onClick={() => onTabChange('live')}
              className={`py-1 relative transition-all cursor-pointer group flex items-center gap-1.5 ${
                currentTab === 'live'
                  ? 'text-[#E10600]'
                  : isDark ? 'text-[#AAAAAA] hover:text-white' : 'text-[#666677] hover:text-[#111115]'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#E10600] blinking-dot"></span>
              <span>Live Telemetry</span>
              {currentTab === 'live' && (
                <span className="absolute -bottom-3 left-0 right-0 h-0.5 bg-[#E10600] shadow-[0_0_8px_#E10600]"></span>
              )}
            </button>

            <button
              onClick={() => onTabChange('results')}
              className={`py-1 relative transition-all cursor-pointer ${
                currentTab === 'results'
                  ? 'text-[#E10600]'
                  : isDark ? 'text-[#AAAAAA] hover:text-white' : 'text-[#666677] hover:text-[#111115]'
              }`}
            >
              <span>Calendar & Results</span>
              {currentTab === 'results' && (
                <span className="absolute -bottom-3 left-0 right-0 h-0.5 bg-[#E10600] shadow-[0_0_8px_#E10600]"></span>
              )}
            </button>

            <button
              onClick={() => onTabChange('standings')}
              className={`py-1 relative transition-all cursor-pointer ${
                currentTab === 'standings'
                  ? 'text-[#E10600]'
                  : isDark ? 'text-[#AAAAAA] hover:text-white' : 'text-[#666677] hover:text-[#111115]'
              }`}
            >
              <span>Standings</span>
              {currentTab === 'standings' && (
                <span className="absolute -bottom-3 left-0 right-0 h-0.5 bg-[#E10600] shadow-[0_0_8px_#E10600]"></span>
              )}
            </button>

            <button
              onClick={() => onTabChange('drivers')}
              className={`py-1 relative transition-all cursor-pointer ${
                currentTab === 'drivers'
                  ? 'text-[#E10600]'
                  : isDark ? 'text-[#AAAAAA] hover:text-white' : 'text-[#666677] hover:text-[#111115]'
              }`}
            >
              <span>Grid Drivers</span>
              {currentTab === 'drivers' && (
                <span className="absolute -bottom-3 left-0 right-0 h-0.5 bg-[#E10600] shadow-[0_0_8px_#E10600]"></span>
              )}
            </button>
          </nav>
        )}

        {/* Right side Controls: Dark Mode Switcher, Weather & Cockpit Trigger */}
        <div className="flex items-center gap-3 md:gap-4">
          {/* THEME SWITCHER TOGGLE (Classic F1 Dark / Light) */}
          <button
            onClick={onToggleTheme}
            title={isDark ? 'Switch to F1 Light Paddock Mode' : 'Switch to F1 Dark Cockpit Mode'}
            className={`flex items-center gap-2 px-3 py-1.5 rounded border transition-all cursor-pointer ${
              isDark
                ? 'bg-[#181820] border-[#30303C] text-[#E2E8F0] hover:border-[#E10600]'
                : 'bg-[#F0F0F4] border-[#D4D4DC] text-[#1A1A22] hover:border-[#E10600]'
            }`}
          >
            <span className={`material-symbols-outlined text-[18px] transition-transform duration-300 ${
              isDark ? 'text-[#FACC15] rotate-0' : 'text-[#E10600] rotate-180'
            }`}>
              {isDark ? 'dark_mode' : 'light_mode'}
            </span>
            <span className="hidden sm:inline font-f1-sans text-[11px] font-bold uppercase tracking-wider">
              {isDark ? 'Dark' : 'Light'}
            </span>
          </button>

          {/* Weather / Track Conditions button */}
          <button
            onClick={onOpenWeather}
            title="Monaco Circuit Weather"
            className={`w-9 h-9 rounded border flex items-center justify-center transition-all ${
              isDark
                ? 'bg-[#181820] border-[#30303C] text-[#9A9AA8] hover:text-white hover:border-[#E10600]'
                : 'bg-[#F0F0F4] border-[#D4D4DC] text-[#555566] hover:text-[#111115] hover:border-[#E10600]'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">wb_sunny</span>
          </button>

          {/* Launch Cockpit Modal (F1 Racing Red Button) */}
          <button
            onClick={onOpenLiveModal}
            className="bg-[#E10600] hover:bg-[#FF1801] active:scale-95 text-white font-f1-sans text-xs uppercase tracking-[0.18em] font-bold px-4 py-2 rounded shadow-[0_2px_12px_rgba(225,6,0,0.4)] transition-all flex items-center gap-2"
          >
            <span className="w-2 h-2 rounded-full bg-white blinking-dot"></span>
            <span className="hidden sm:inline">Cockpit Feed</span>
            <span className="sm:hidden">Live</span>
          </button>
        </div>
      </div>
    </header>
  );
};
