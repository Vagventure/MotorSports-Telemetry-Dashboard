import React from 'react';
import { NavigationTab, ThemeMode } from '../types';

interface BottomNavBarProps {
  currentTab: NavigationTab;
  onTabChange: (tab: NavigationTab) => void;
  theme?: ThemeMode;
}

export const BottomNavBar: React.FC<BottomNavBarProps> = ({
  currentTab,
  onTabChange,
  theme = 'dark'
}) => {
  const isDark = theme === 'dark';

  const tabs = [
    { id: 'standings' as NavigationTab, label: 'Standings', icon: 'leaderboard' },
    { id: 'live' as NavigationTab, label: 'Telemetry', icon: 'sensors' },
    { id: 'results' as NavigationTab, label: 'Calendar', icon: 'calendar_month' },
    { id: 'drivers' as NavigationTab, label: 'Drivers', icon: 'group' }
  ];

  return (
    <nav className={`fixed bottom-0 left-0 w-full z-50 lg:hidden border-t shadow-2xl flex justify-around items-center h-16 px-2 backdrop-blur-lg transition-colors ${
      isDark
        ? 'bg-[#0E0E12]/95 border-[#24242E] text-white'
        : 'bg-[#FFFFFF]/95 border-[#D4D4DC] text-[#111115]'
    }`}>
      {tabs.map((tab) => {
        const isActive = currentTab === tab.id;

        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex flex-col items-center justify-center flex-1 h-full relative transition-transform active:scale-95 ${
              isActive
                ? 'text-[#E10600]'
                : isDark
                ? 'text-[#888899] hover:text-white'
                : 'text-[#666677] hover:text-black'
            }`}
          >
            {isActive && (
              <span className="absolute top-0 w-10 h-1 bg-[#E10600] rounded-b-full shadow-[0_0_8px_#E10600]"></span>
            )}
            <span
              className={`material-symbols-outlined mb-0.5 text-[22px] ${
                isActive ? 'filled-icon font-bold' : ''
              }`}
            >
              {tab.icon}
            </span>
            <span className={`font-f1-sans text-[10px] uppercase tracking-wider ${isActive ? 'font-black' : 'font-semibold'}`}>
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};
