import React, { useState, useEffect } from 'react';
import { INITIAL_TELEMETRY, ASSETS } from '../data/f1Data';
import { LiveTelemetryData, ThemeMode } from '../types';

interface LiveTelemetryModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme?: ThemeMode;
}

export const LiveTelemetryModal: React.FC<LiveTelemetryModalProps> = ({
  isOpen,
  onClose,
  theme = 'dark'
}) => {
  const [telemetry, setTelemetry] = useState<LiveTelemetryData>(INITIAL_TELEMETRY);
  const [drsActive, setDrsActive] = useState(false);
  const [radioPlaying, setRadioPlaying] = useState(false);

  const isDark = theme === 'dark';

  // Real-time HUD Telemetry Engine
  useEffect(() => {
    if (!isOpen) return;

    const interval = setInterval(() => {
      setTelemetry((prev) => {
        const speedDelta = (Math.random() - 0.46) * 16;
        const newSpeed = Math.min(342, Math.max(130, Math.round(prev.speed + speedDelta)));
        const newRpm = Math.min(12800, Math.max(8800, Math.round(8400 + (newSpeed / 342) * 4400)));
        const newGear = newSpeed > 295 ? 8 : newSpeed > 255 ? 7 : newSpeed > 210 ? 6 : newSpeed > 160 ? 5 : 4;
        const newThrottle = newSpeed > 270 ? 100 : Math.max(15, Math.round((newSpeed / 342) * 100));
        const newBrake = newThrottle < 40 ? Math.round((40 - newThrottle) * 2.2) : 0;

        return {
          ...prev,
          speed: newSpeed,
          rpm: newRpm,
          gear: newGear,
          throttle: newThrottle,
          brake: newBrake,
          drs: newSpeed > 270 || drsActive
        };
      });
    }, 250);

    return () => clearInterval(interval);
  }, [isOpen, drsActive]);

  if (!isOpen) return null;

  // Calculate RPM LEDs (15 LEDs: 5 Green, 5 Yellow, 5 Red)
  const rpmRatio = (telemetry.rpm - 8000) / (12800 - 8000);
  const activeLeds = Math.min(15, Math.max(0, Math.round(rpmRatio * 15)));
  const isRedline = activeLeds >= 14;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-fadeIn">
      {/* Modal Container */}
      <div
        className={`w-full max-w-5xl rounded-lg border overflow-hidden shadow-2xl flex flex-col max-h-[92vh] transition-colors ${
          isDark
            ? 'bg-[#0E0E12] border-[#2A2A36] text-white'
            : 'bg-[#FFFFFF] border-[#D4D4DC] text-[#111115]'
        }`}
      >
        {/* Top Header Bar with Red Racing Stripe */}
        <div className="h-1.5 w-full bg-gradient-to-r from-[#E10600] via-[#FF2A1A] to-[#990000]"></div>

        <div className={`flex justify-between items-center px-6 py-4 border-b ${
          isDark ? 'border-[#22222A] bg-[#14141A]' : 'border-[#E2E2E8] bg-[#F4F4F8]'
        }`}>
          <div className="flex items-center gap-3">
            <div className="bg-[#E10600] text-white font-f1-title font-black text-xl px-2.5 py-0.5 rounded-[2px] shadow-[0_0_8px_rgba(225,6,0,0.5)]">
              F1
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-f1-title text-xl font-black uppercase tracking-tight">
                  LIVE COCKPIT HUD & TELEMETRY
                </h3>
                <span className="w-2 h-2 rounded-full bg-[#00D2BE] blinking-dot"></span>
              </div>
              <span className="font-f1-sans text-[10px] text-[#888899] uppercase tracking-[0.2em] font-bold">
                Car #01 // Max Verstappen // Oracle Red Bull Racing
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className={`w-9 h-9 rounded flex items-center justify-center transition-colors ${
              isDark ? 'hover:bg-[#22222E] text-white' : 'hover:bg-[#EAEAEF] text-black'
            }`}
          >
            <span className="material-symbols-outlined text-[22px]">close</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* RPM Shift Light Bar */}
          <div className={`p-4 rounded border flex flex-col items-center gap-2 ${
            isDark ? 'bg-[#15151C] border-[#22222A]' : 'bg-[#F4F4F8] border-[#E2E2E8]'
          }`}>
            <div className="flex justify-between w-full font-f1-sans text-xs uppercase font-bold text-[#888899] px-1">
              <span>RPM 8,000</span>
              <span className={`font-mono-f1 text-sm font-black ${isRedline ? 'text-[#E10600] rpm-pulse' : 'text-[#00D2BE]'}`}>
                {telemetry.rpm} RPM {isRedline && '— SHIFT NOW!'}
              </span>
              <span>12,800 LIMIT</span>
            </div>

            {/* 15 Racing LEDs */}
            <div className="flex gap-2 w-full justify-center py-2">
              {Array.from({ length: 15 }).map((_, idx) => {
                const isActive = idx < activeLeds;
                let colorClass = 'bg-[#22222A]';

                if (isActive) {
                  if (idx < 5) colorClass = 'bg-[#00D2BE] shadow-[0_0_8px_#00D2BE]';
                  else if (idx < 10) colorClass = 'bg-[#FACC15] shadow-[0_0_8px_#FACC15]';
                  else colorClass = 'bg-[#E10600] shadow-[0_0_10px_#E10600]';
                }

                return (
                  <div
                    key={idx}
                    className={`h-4 flex-1 max-w-[45px] rounded-[2px] transition-all duration-75 ${colorClass}`}
                  ></div>
                );
              })}
            </div>
          </div>

          {/* Primary Telemetry Instruments Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Speed & Gear Gauge */}
            <div className={`p-6 rounded border flex flex-col items-center justify-center relative ${
              isDark ? 'bg-[#15151C] border-[#22222A]' : 'bg-[#F4F4F8] border-[#E2E2E8]'
            }`}>
              <span className="font-f1-sans text-[10px] text-[#888899] uppercase tracking-[0.2em] font-bold mb-1">
                CURRENT VELOCITY
              </span>
              <div className="font-mono-f1 text-6xl font-black text-[#E10600] tracking-tighter leading-none mb-1">
                {telemetry.speed}
              </div>
              <span className="font-f1-sans text-xs uppercase font-black tracking-widest text-[#888899]">
                KM / H
              </span>

              {/* Gear Display */}
              <div className="mt-4 flex items-center gap-3">
                <span className="font-f1-sans text-xs uppercase font-bold text-[#888899]">GEAR</span>
                <span className="w-12 h-12 rounded bg-[#E10600] text-white font-f1-title text-3xl font-black flex items-center justify-center shadow-[0_0_12px_rgba(225,6,0,0.5)]">
                  {telemetry.gear}
                </span>
              </div>
            </div>

            {/* Throttle & Brake Pedals */}
            <div className={`p-6 rounded border flex flex-col justify-between ${
              isDark ? 'bg-[#15151C] border-[#22222A]' : 'bg-[#F4F4F8] border-[#E2E2E8]'
            }`}>
              <span className="font-f1-sans text-[10px] text-[#888899] uppercase tracking-[0.2em] font-bold mb-3">
                PEDAL INPUTS
              </span>

              {/* Throttle */}
              <div className="space-y-1 mb-4">
                <div className="flex justify-between font-f1-sans text-xs font-bold">
                  <span className="text-[#00D2BE]">THROTTLE</span>
                  <span className="font-mono-f1">{telemetry.throttle}%</span>
                </div>
                <div className="h-3 w-full bg-black/20 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#00D2BE] transition-all duration-150 rounded-full"
                    style={{ width: `${telemetry.throttle}%` }}
                  ></div>
                </div>
              </div>

              {/* Brake */}
              <div className="space-y-1">
                <div className="flex justify-between font-f1-sans text-xs font-bold">
                  <span className="text-[#E10600]">BRAKE</span>
                  <span className="font-mono-f1">{telemetry.brake}%</span>
                </div>
                <div className="h-3 w-full bg-black/20 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#E10600] transition-all duration-150 rounded-full"
                    style={{ width: `${telemetry.brake}%` }}
                  ></div>
                </div>
              </div>
            </div>

            {/* DRS & Aerodynamics */}
            <div className={`p-6 rounded border flex flex-col justify-between ${
              isDark ? 'bg-[#15151C] border-[#22222A]' : 'bg-[#F4F4F8] border-[#E2E2E8]'
            }`}>
              <span className="font-f1-sans text-[10px] text-[#888899] uppercase tracking-[0.2em] font-bold">
                AERO & ENERGY
              </span>

              <div className="my-auto flex flex-col items-center gap-3">
                <div
                  onClick={() => setDrsActive(!drsActive)}
                  className={`w-full py-3 rounded text-center font-f1-title font-black text-xl uppercase tracking-wider cursor-pointer transition-all ${
                    telemetry.drs
                      ? 'bg-[#00D2BE] text-black shadow-[0_0_15px_#00D2BE]'
                      : isDark
                      ? 'bg-[#22222E] text-[#888899] border border-[#333344]'
                      : 'bg-[#EAEAEF] text-[#666677] border border-[#D4D4DC]'
                  }`}
                >
                  {telemetry.drs ? 'DRS OPEN' : 'DRS CLOSED'}
                </div>
                <span className="text-[10px] font-f1-sans text-[#888899] uppercase tracking-wider font-bold">
                  Click to toggle DRS flap
                </span>
              </div>

              <div className="flex justify-between font-f1-sans text-xs pt-3 border-t border-black/10 dark:border-white/10">
                <span className="text-[#888899]">ERS Battery:</span>
                <span className="font-mono-f1 text-[#00D2BE] font-bold">94% AVAILABLE</span>
              </div>
            </div>
          </div>

          {/* Pit Wall Radio Transcript */}
          <div className={`p-4 rounded border ${
            isDark ? 'bg-[#15151C] border-[#22222A]' : 'bg-[#F4F4F8] border-[#E2E2E8]'
          }`}>
            <div className="flex justify-between items-center mb-2 font-f1-sans text-xs">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px] text-[#E10600]">
                  headset_mic
                </span>
                <span className="font-black uppercase tracking-wider text-[11px]">
                  Team Radio // Gianpiero Lambiase (GP)
                </span>
              </div>
              <button
                onClick={() => setRadioPlaying(!radioPlaying)}
                className="text-[#E10600] font-bold text-[11px] uppercase tracking-wider hover:underline"
              >
                {radioPlaying ? '⏹ Stop Radio Audio' : '▶ Play Radio Comm'}
              </button>
            </div>
            <p className="font-f1-sans text-xs italic text-[#888899] leading-relaxed">
              "Max, pace is very strong. We are currently 4.8 seconds clear of Leclerc. Maintain tire delta in Turn 4 and keep pushing on the exit of Rascasse."
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className={`px-6 py-3 border-t flex justify-between items-center font-f1-sans text-xs ${
          isDark ? 'bg-[#14141A] border-[#22222A]' : 'bg-[#F4F4F8] border-[#E2E2E8]'
        }`}>
          <span className="text-[#888899]">FIA Telemetry Stream // Round 08 Monaco</span>
          <button
            onClick={onClose}
            className="bg-[#E10600] hover:bg-[#FF1801] text-white font-bold uppercase tracking-wider text-xs px-5 py-2 rounded"
          >
            Close HUD
          </button>
        </div>
      </div>
    </div>
  );
};
