/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { NavigationTab, Driver, ThemeMode } from './types';
import { TopAppBar } from './components/TopAppBar';
import { SideNavBar } from './components/SideNavBar';
import { BottomNavBar } from './components/BottomNavBar';
import { StandingsScreen } from './components/StandingsScreen';
import { LiveTelemetryScreen } from './components/LiveTelemetryScreen';
import { DriversGalleryScreen } from './components/DriversGalleryScreen';
import { ResultsScreen } from './components/ResultsScreen';
import { LiveTelemetryModal } from './components/LiveTelemetryModal';
import { DriverDetailModal } from './components/DriverDetailModal';
import { SettingsModal, SupportModal, WeatherModal } from './components/SettingsModal';

export default function App() {
  const [currentTab, setCurrentTab] = useState<NavigationTab>('standings');
  const [liveSubTab, setLiveSubTab] = useState<string>('tire');
  const [isLiveModalOpen, setIsLiveModalOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isSupportOpen, setIsSupportOpen] = useState<boolean>(false);
  const [isWeatherOpen, setIsWeatherOpen] = useState<boolean>(false);
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);

  // Dark Mode state with local persistence (defaulting to F1 Dark mode)
  const [theme, setTheme] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('f1_theme');
    return (saved === 'light' || saved === 'dark') ? saved : 'dark';
  });

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  useEffect(() => {
    localStorage.setItem('f1_theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.body.classList.remove('bg-[#F4F4F6]', 'text-[#111115]');
      document.body.classList.add('bg-[#0A0A0C]', 'text-[#F3F4F6]');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('bg-[#0A0A0C]', 'text-[#F3F4F6]');
      document.body.classList.add('bg-[#F4F4F6]', 'text-[#111115]');
    }
  }, [theme]);

  // Keyboard shortcut listeners for quick navigation and theme toggle
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.key === '1') setCurrentTab('live');
      if (e.key === '2') setCurrentTab('results');
      if (e.key === '3') setCurrentTab('standings');
      if (e.key === '4') setCurrentTab('drivers');
      if (e.key.toLowerCase() === 'd') toggleTheme();
      if (e.key.toLowerCase() === 't') setIsLiveModalOpen(true);
      if (e.key === 'Escape') {
        setIsLiveModalOpen(false);
        setIsSettingsOpen(false);
        setIsSupportOpen(false);
        setIsWeatherOpen(false);
        setSelectedDriver(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className={`min-h-screen flex flex-col antialiased transition-colors duration-200 ${
      theme === 'dark' 
        ? 'bg-[#0A0A0C] text-[#F3F4F6] selection:bg-[#E10600] selection:text-white' 
        : 'bg-[#F4F4F6] text-[#111115] selection:bg-[#E10600] selection:text-white'
    }`}>
      {/* Top Application Bar with F1 Red Accent & Theme Switcher */}
      <TopAppBar
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        onOpenLiveModal={() => setIsLiveModalOpen(true)}
        onOpenWeather={() => setIsWeatherOpen(true)}
        liveSubTab={liveSubTab}
        onLiveSubTabChange={setLiveSubTab}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      <div className="flex flex-1 flex-col lg:flex-row">
        {/* Left Side Navigation (Desktop) with F1 Red racing stripe */}
        <SideNavBar
          currentTab={currentTab}
          onTabChange={setCurrentTab}
          onOpenLiveModal={() => setIsLiveModalOpen(true)}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onOpenSupport={() => setIsSupportOpen(true)}
          theme={theme}
          onToggleTheme={toggleTheme}
        />

        {/* Main Content Area */}
        <main className="flex-1 lg:ml-64 p-4 md:p-8 pt-6 pb-24 lg:pb-12 min-h-[calc(100vh-65px)]">
          {currentTab === 'standings' && (
            <StandingsScreen
              onSelectDriver={(driver) => setSelectedDriver(driver)}
              onOpenLiveModal={() => setIsLiveModalOpen(true)}
              theme={theme}
            />
          )}

          {currentTab === 'live' && (
            <LiveTelemetryScreen
              onOpenLiveModal={() => setIsLiveModalOpen(true)}
              activeSubTab={liveSubTab}
              onSubTabChange={setLiveSubTab}
              theme={theme}
            />
          )}

          {currentTab === 'drivers' && (
            <DriversGalleryScreen
              onSelectDriver={(driver) => setSelectedDriver(driver)}
              theme={theme}
            />
          )}

          {currentTab === 'results' && (
            <ResultsScreen 
              onOpenLiveModal={() => setIsLiveModalOpen(true)} 
              theme={theme}
            />
          )}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <BottomNavBar currentTab={currentTab} onTabChange={setCurrentTab} theme={theme} />

      {/* Modals & Overlays */}
      <LiveTelemetryModal
        isOpen={isLiveModalOpen}
        onClose={() => setIsLiveModalOpen(false)}
        theme={theme}
      />

      <DriverDetailModal
        driver={selectedDriver}
        onClose={() => setSelectedDriver(null)}
        onOpenLiveModal={() => {
          setSelectedDriver(null);
          setIsLiveModalOpen(true);
        }}
        theme={theme}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      <SupportModal
        isOpen={isSupportOpen}
        onClose={() => setIsSupportOpen(false)}
        theme={theme}
      />

      <WeatherModal
        isOpen={isWeatherOpen}
        onClose={() => setIsWeatherOpen(false)}
        theme={theme}
      />
    </div>
  );
}
