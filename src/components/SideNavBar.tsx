import React from 'react';
import { NavigationTab, ThemeMode } from '../types';

interface SideNavBarProps {
  currentTab: NavigationTab;
  onTabChange: (tab: NavigationTab) => void;
  onOpenLiveModal: () => void;
  onOpenSettings: () => void;
  onOpenSupport: () => void;
  theme: ThemeMode;
  onToggleTheme: () => void;
}

export const SideNavBar: React.FC<SideNavBarProps> = ({
  currentTab,
  onTabChange,
  onOpenLiveModal,
  onOpenSettings,
  onOpenSupport,
  theme,
  onToggleTheme
}) => {
  const isDark = theme === 'dark';

  return (
    <aside className={`h-[calc(100vh-65px)] w-64 hidden lg:flex flex-col fixed left-0 top-[65px] border-r py-6 px-4 z-40 justify-between transition-colors duration-200 overflow-y-auto ${
      isDark
        ? 'bg-[#0E0E12] border-[#22222A] text-[#F3F4F6]'
        : 'bg-[#FFFFFF] border-[#E2E2E8] text-[#111115]'
    }`}>
      {/* Top Header/Logo in Sidebar */}
      <div className="flex flex-col">
        {/* Championship Header with F1 Red Accent */}
        <div className={`px-3 mb-6 pb-4 border-b ${
          isDark ? 'border-[#22222A]' : 'border-[#EAEAEF]'
        }`}>
          <div className="flex items-center gap-2 text-[#E10600] font-f1-sans text-[10px] font-black uppercase tracking-[0.25em] mb-1">
            <span className="w-2 h-2 rounded-full bg-[#E10600] blinking-dot"></span>
            <span>FIA Formula 1 2024</span>
          </div>
          <h2 className="font-f1-title text-xl font-black tracking-tight leading-none">
            COMMAND SUITE
          </h2>
          <div className="flex items-center gap-2 font-mono-f1 text-[11px] text-[#00D2BE] mt-1.5 font-bold">
            <span>● 20 CARS ACTIVE</span>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex flex-col gap-1.5 font-f1-sans text-xs uppercase tracking-[0.18em] font-bold">
          <button
            onClick={() => onTabChange('standings')}
            className={`flex items-center gap-3.5 px-3.5 py-3 rounded transition-all text-left relative group ${
              currentTab === 'standings'
                ? 'bg-[#E10600] text-white shadow-[0_2px_10px_rgba(225,6,0,0.35)]'
                : isDark
                ? 'text-[#9A9AA8] hover:text-white hover:bg-[#181820]'
                : 'text-[#555566] hover:text-[#111115] hover:bg-[#F2F2F6]'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">leaderboard</span>
            <span>Standings</span>
          </button>

          <button
            onClick={() => onTabChange('live')}
            className={`flex items-center gap-3.5 px-3.5 py-3 rounded transition-all text-left relative group ${
              currentTab === 'live'
                ? 'bg-[#E10600] text-white shadow-[0_2px_10px_rgba(225,6,0,0.35)]'
                : isDark
                ? 'text-[#9A9AA8] hover:text-white hover:bg-[#181820]'
                : 'text-[#555566] hover:text-[#111115] hover:bg-[#F2F2F6]'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">sensors</span>
            <div className="flex items-center justify-between flex-1">
              <span>Live Telemetry</span>
              <span className="w-1.5 h-1.5 rounded-full bg-white blinking-dot"></span>
            </div>
          </button>

          <button
            onClick={() => onTabChange('results')}
            className={`flex items-center gap-3.5 px-3.5 py-3 rounded transition-all text-left relative group ${
              currentTab === 'results'
                ? 'bg-[#E10600] text-white shadow-[0_2px_10px_rgba(225,6,0,0.35)]'
                : isDark
                ? 'text-[#9A9AA8] hover:text-white hover:bg-[#181820]'
                : 'text-[#555566] hover:text-[#111115] hover:bg-[#F2F2F6]'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">calendar_month</span>
            <span>Race Calendar</span>
          </button>

          <button
            onClick={() => onTabChange('drivers')}
            className={`flex items-center gap-3.5 px-3.5 py-3 rounded transition-all text-left relative group ${
              currentTab === 'drivers'
                ? 'bg-[#E10600] text-white shadow-[0_2px_10px_rgba(225,6,0,0.35)]'
                : isDark
                ? 'text-[#9A9AA8] hover:text-white hover:bg-[#181820]'
                : 'text-[#555566] hover:text-[#111115] hover:bg-[#F2F2F6]'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">group</span>
            <span>Grid Drivers</span>
          </button>
        </nav>
      </div>

      {/* Bottom Mission Card / F1 Callout */}
      <div className="flex flex-col gap-4">
        {/* Cockpit Quick HUD Banner */}
        <div className={`p-4 rounded border relative overflow-hidden ${
          isDark
            ? 'bg-[#15151C] border-[#2A2A36] text-[#F3F4F6]'
            : 'bg-[#F6F6FA] border-[#DCDCDE] text-[#111115]'
        }`}>
          <div className="absolute top-0 right-0 w-12 h-12 bg-[#E10600]/10 rounded-bl-full pointer-events-none"></div>
          <span className="block font-f1-sans text-[9px] uppercase tracking-[0.25em] font-black text-[#E10600] mb-1">
            CIRCUIT DE MONACO
          </span>
          <div className="font-f1-title text-base font-black leading-tight mb-1">
            Live Timing & HUD
          </div>
          <p className="font-f1-sans text-[11px] leading-relaxed text-[#777788]">
            Real-time RPM tachometer, shift lights, speed trap, and throttle/brake telemetry.
          </p>
          <button
            onClick={onOpenLiveModal}
            className="mt-3 font-f1-sans text-[10px] uppercase tracking-[0.2em] font-black text-[#E10600] hover:text-[#FF1801] flex items-center gap-1.5 group"
          >
            <span>Launch HUD</span>
            <span className="group-hover:translate-x-1 transition-transform">&rarr;</span>
          </button>
        </div>

        {/* Theme Mode quick switch & settings */}
        <div className={`pt-3 border-t flex items-center justify-between font-f1-sans text-xs ${
          isDark ? 'border-[#22222A] text-[#888899]' : 'border-[#EAEAEF] text-[#666677]'
        }`}>
          <button
            onClick={onToggleTheme}
            className="hover:text-[#E10600] flex items-center gap-1.5 transition-colors text-[11px] uppercase tracking-wider font-bold"
          >
            <span className="material-symbols-outlined text-[16px]">
              {isDark ? 'dark_mode' : 'light_mode'}
            </span>
            {isDark ? 'Dark Mode' : 'Light Mode'}
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={onOpenSettings}
              title="Settings"
              className="hover:text-[#E10600] transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">settings</span>
            </button>
            <button
              onClick={onOpenSupport}
              title="Help & Shortcuts"
              className="hover:text-[#E10600] transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">help_outline</span>
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
};
