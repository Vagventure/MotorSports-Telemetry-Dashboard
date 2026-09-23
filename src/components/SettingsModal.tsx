import React, { useState } from 'react';
import { ThemeMode } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme?: ThemeMode;
  onToggleTheme?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  theme = 'dark',
  onToggleTheme
}) => {
  const [speedUnit, setSpeedUnit] = useState<'kmh' | 'mph'>('kmh');
  const [telemetryRate, setTelemetryRate] = useState<'60' | '30' | '10'>('60');
  const [soundEnabled, setSoundEnabled] = useState(true);

  if (!isOpen) return null;
  const isDark = theme === 'dark';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div
        className={`w-full max-w-lg rounded-lg border overflow-hidden shadow-2xl flex flex-col transition-colors ${
          isDark
            ? 'bg-[#0E0E12] border-[#2A2A36] text-white'
            : 'bg-[#FFFFFF] border-[#D4D4DC] text-[#111115]'
        }`}
      >
        <div className="h-1.5 w-full bg-gradient-to-r from-[#E10600] via-[#FF2A1A] to-[#990000]"></div>

        <div className={`flex justify-between items-center px-6 py-4 border-b ${
          isDark ? 'border-[#22222A] bg-[#14141A]' : 'border-[#E2E2E8] bg-[#F4F4F8]'
        }`}>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#E10600]">settings</span>
            <h3 className="font-f1-title text-xl font-black uppercase tracking-tight">
              TELEMETRY SETTINGS
            </h3>
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

        <div className="p-6 space-y-6">
          {/* THEME SWITCHER */}
          <div className="space-y-2">
            <label className="font-f1-sans text-xs uppercase font-black text-[#888899] tracking-wider block">
              Display Theme & Visual Mode
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => {
                  if (theme !== 'dark' && onToggleTheme) onToggleTheme();
                }}
                className={`p-3 rounded border flex items-center gap-3 transition-all ${
                  isDark
                    ? 'bg-[#E10600]/15 border-[#E10600] text-white shadow-[0_0_10px_rgba(225,6,0,0.3)]'
                    : 'bg-[#F4F4F8] border-[#D4D4DC] text-[#666677] hover:border-[#E10600]'
                }`}
              >
                <span className="material-symbols-outlined text-[20px] text-[#FACC15]">dark_mode</span>
                <div className="text-left">
                  <div className="font-f1-sans text-xs font-black uppercase">Dark Cockpit</div>
                  <div className="font-f1-sans text-[10px] text-[#888899]">Classic F1 Carbon & Red</div>
                </div>
              </button>

              <button
                onClick={() => {
                  if (theme !== 'light' && onToggleTheme) onToggleTheme();
                }}
                className={`p-3 rounded border flex items-center gap-3 transition-all ${
                  !isDark
                    ? 'bg-[#E10600]/10 border-[#E10600] text-black shadow-[0_0_10px_rgba(225,6,0,0.2)]'
                    : 'bg-[#15151C] border-[#2A2A36] text-[#888899] hover:border-[#E10600]'
                }`}
              >
                <span className="material-symbols-outlined text-[20px] text-[#E10600]">light_mode</span>
                <div className="text-left">
                  <div className="font-f1-sans text-xs font-black uppercase">Light Paddock</div>
                  <div className="font-f1-sans text-[10px] text-[#888899]">High Contrast Chalk & Red</div>
                </div>
              </button>
            </div>
          </div>

          {/* Speed Unit */}
          <div className="space-y-2">
            <label className="font-f1-sans text-xs uppercase font-black text-[#888899] tracking-wider block">
              Speed Velocity Unit
            </label>
            <div className="flex gap-3">
              {(['kmh', 'mph'] as const).map((unit) => (
                <button
                  key={unit}
                  onClick={() => setSpeedUnit(unit)}
                  className={`flex-1 py-2 font-f1-sans text-xs uppercase font-bold rounded border transition-all ${
                    speedUnit === unit
                      ? 'bg-[#E10600] text-white border-[#E10600]'
                      : isDark
                      ? 'bg-[#15151C] border-[#2A2A36] text-[#888899]'
                      : 'bg-[#F4F4F8] border-[#D4D4DC] text-[#666677]'
                  }`}
                >
                  {unit.toUpperCase()} ({unit === 'kmh' ? 'Kilometers/Hour' : 'Miles/Hour'})
                </button>
              ))}
            </div>
          </div>

          {/* Refresh Frequency */}
          <div className="space-y-2">
            <label className="font-f1-sans text-xs uppercase font-black text-[#888899] tracking-wider block">
              Telemetry Stream Frequency
            </label>
            <div className="flex gap-3">
              {[
                { id: '60', label: '60 Hz (Real-time)' },
                { id: '30', label: '30 Hz (Standard)' },
                { id: '10', label: '10 Hz (Eco)' }
              ].map((rate) => (
                <button
                  key={rate.id}
                  onClick={() => setTelemetryRate(rate.id as any)}
                  className={`flex-1 py-2 font-f1-sans text-xs uppercase font-bold rounded border transition-all ${
                    telemetryRate === rate.id
                      ? 'bg-[#E10600] text-white border-[#E10600]'
                      : isDark
                      ? 'bg-[#15151C] border-[#2A2A36] text-[#888899]'
                      : 'bg-[#F4F4F8] border-[#D4D4DC] text-[#666677]'
                  }`}
                >
                  {rate.label}
                </button>
              ))}
            </div>
          </div>

          {/* Engine Audio toggle */}
          <div className="flex items-center justify-between pt-2">
            <div>
              <div className="font-f1-sans text-xs font-bold uppercase">Pit Wall Audio & Alerts</div>
              <div className="font-f1-sans text-[11px] text-[#888899]">
                Enable audio telemetry alerts and team radio comms.
              </div>
            </div>
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`w-12 h-6 rounded-full transition-colors relative ${
                soundEnabled ? 'bg-[#E10600]' : 'bg-gray-400'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${
                  soundEnabled ? 'right-1' : 'left-1'
                }`}
              ></div>
            </button>
          </div>
        </div>

        <div className={`px-6 py-4 border-t flex justify-end font-f1-sans text-xs ${
          isDark ? 'bg-[#14141A] border-[#22222A]' : 'bg-[#F4F4F8] border-[#E2E2E8]'
        }`}>
          <button
            onClick={onClose}
            className="bg-[#E10600] hover:bg-[#FF1801] text-white font-bold uppercase tracking-wider text-xs px-6 py-2 rounded"
          >
            Save & Close
          </button>
        </div>
      </div>
    </div>
  );
};

export const SupportModal: React.FC<{ isOpen: boolean; onClose: () => void; theme?: ThemeMode }> = ({
  isOpen,
  onClose,
  theme = 'dark'
}) => {
  if (!isOpen) return null;
  const isDark = theme === 'dark';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div
        className={`w-full max-w-lg rounded-lg border overflow-hidden shadow-2xl flex flex-col transition-colors ${
          isDark
            ? 'bg-[#0E0E12] border-[#2A2A36] text-white'
            : 'bg-[#FFFFFF] border-[#D4D4DC] text-[#111115]'
        }`}
      >
        <div className="h-1.5 w-full bg-gradient-to-r from-[#E10600] via-[#FF2A1A] to-[#990000]"></div>

        <div className={`flex justify-between items-center px-6 py-4 border-b ${
          isDark ? 'border-[#22222A] bg-[#14141A]' : 'border-[#E2E2E8] bg-[#F4F4F8]'
        }`}>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#E10600]">help_outline</span>
            <h3 className="font-f1-title text-xl font-black uppercase tracking-tight">
              KEYBOARD SHORTCUTS
            </h3>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded flex items-center justify-center">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <div className="p-6 space-y-4 font-f1-sans text-xs">
          <div className="grid grid-cols-2 gap-3">
            {[
              { key: '1', desc: 'Live Telemetry' },
              { key: '2', desc: 'Race Calendar' },
              { key: '3', desc: 'Standings' },
              { key: '4', desc: 'Grid Drivers' },
              { key: 'D', desc: 'Toggle Dark / Light Theme' },
              { key: 'T', desc: 'Cockpit HUD Modal' },
              { key: 'ESC', desc: 'Close any Modal' }
            ].map((shortcut) => (
              <div
                key={shortcut.key}
                className={`p-3 rounded border flex items-center justify-between ${
                  isDark ? 'bg-[#15151C] border-[#22222A]' : 'bg-[#F4F4F8] border-[#E2E2E8]'
                }`}
              >
                <span className="text-[#888899] font-bold">{shortcut.desc}</span>
                <span className="font-mono-f1 font-black px-2 py-0.5 bg-[#E10600] text-white rounded text-xs">
                  {shortcut.key}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className={`px-6 py-4 border-t flex justify-end ${
          isDark ? 'bg-[#14141A] border-[#22222A]' : 'bg-[#F4F4F8] border-[#E2E2E8]'
        }`}>
          <button
            onClick={onClose}
            className="bg-[#E10600] text-white font-bold uppercase tracking-wider text-xs px-6 py-2 rounded"
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
};

export const WeatherModal: React.FC<{ isOpen: boolean; onClose: () => void; theme?: ThemeMode }> = ({
  isOpen,
  onClose,
  theme = 'dark'
}) => {
  if (!isOpen) return null;
  const isDark = theme === 'dark';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div
        className={`w-full max-w-lg rounded-lg border overflow-hidden shadow-2xl flex flex-col transition-colors ${
          isDark
            ? 'bg-[#0E0E12] border-[#2A2A36] text-white'
            : 'bg-[#FFFFFF] border-[#D4D4DC] text-[#111115]'
        }`}
      >
        <div className="h-1.5 w-full bg-gradient-to-r from-[#E10600] via-[#FF2A1A] to-[#990000]"></div>

        <div className={`flex justify-between items-center px-6 py-4 border-b ${
          isDark ? 'border-[#22222A] bg-[#14141A]' : 'border-[#E2E2E8] bg-[#F4F4F8]'
        }`}>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#E10600]">wb_sunny</span>
            <h3 className="font-f1-title text-xl font-black uppercase tracking-tight">
              MONACO TRACK CONDITIONS
            </h3>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded flex items-center justify-center">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className={`p-4 rounded border text-center ${
              isDark ? 'bg-[#15151C] border-[#22222A]' : 'bg-[#F4F4F8] border-[#E2E2E8]'
            }`}>
              <div className="font-f1-sans text-[10px] uppercase font-bold text-[#888899]">
                Track Temperature
              </div>
              <div className="font-mono-f1 text-3xl font-black text-[#E10600]">42.8°C</div>
            </div>

            <div className={`p-4 rounded border text-center ${
              isDark ? 'bg-[#15151C] border-[#22222A]' : 'bg-[#F4F4F8] border-[#E2E2E8]'
            }`}>
              <div className="font-f1-sans text-[10px] uppercase font-bold text-[#888899]">
                Air Temperature
              </div>
              <div className="font-mono-f1 text-3xl font-black">26.4°C</div>
            </div>

            <div className={`p-4 rounded border text-center ${
              isDark ? 'bg-[#15151C] border-[#22222A]' : 'bg-[#F4F4F8] border-[#E2E2E8]'
            }`}>
              <div className="font-f1-sans text-[10px] uppercase font-bold text-[#888899]">
                Rain Risk
              </div>
              <div className="font-mono-f1 text-3xl font-black text-[#00D2BE]">0% DRY</div>
            </div>

            <div className={`p-4 rounded border text-center ${
              isDark ? 'bg-[#15151C] border-[#22222A]' : 'bg-[#F4F4F8] border-[#E2E2E8]'
            }`}>
              <div className="font-f1-sans text-[10px] uppercase font-bold text-[#888899]">
                Wind Speed
              </div>
              <div className="font-mono-f1 text-3xl font-black">8.2 KM/H</div>
            </div>
          </div>
        </div>

        <div className={`px-6 py-4 border-t flex justify-end ${
          isDark ? 'bg-[#14141A] border-[#22222A]' : 'bg-[#F4F4F8] border-[#E2E2E8]'
        }`}>
          <button
            onClick={onClose}
            className="bg-[#E10600] text-white font-bold uppercase tracking-wider text-xs px-6 py-2 rounded"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
