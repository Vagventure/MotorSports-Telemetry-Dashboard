/**
 * Transport bar: rewind, play/pause, fast forward, speed stepper, and a scrub
 * track. The reference build has no scrubber — it only steps with the arrow
 * keys — but a two-hour replay is painful to navigate without one.
 */

import React from 'react';
import { ChevronsLeft, ChevronsRight, Minus, Pause, Play, Plus, RotateCcw } from 'lucide-react';
import { SPEED_STEPS, formatRaceTime } from '../../replay/useRaceReplay';
import type { RaceClock } from '../../replay/useRaceReplay';

interface PlaybackControlsProps {
  clock: RaceClock;
  disabled: boolean;
}

const SKIP_MS = 30_000;

export const PlaybackControls: React.FC<PlaybackControlsProps> = ({ clock, disabled }) => {
  const atMinSpeed = clock.speed <= SPEED_STEPS[0];
  const atMaxSpeed = clock.speed >= SPEED_STEPS[SPEED_STEPS.length - 1];

  return (
    <div className="flex flex-col gap-2">
      <input
        type="range"
        min={0}
        max={Math.max(1, clock.durationMs)}
        value={Math.min(clock.displayTime, clock.durationMs)}
        onChange={(e) => clock.seek(Number(e.target.value))}
        disabled={disabled}
        aria-label="Scrub race time"
        className="w-full h-1 accent-[#E10600] cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
      />

      <div className="flex items-center justify-center gap-2">
        <IconButton label="Restart" onClick={clock.restart} disabled={disabled}>
          <RotateCcw size={15} />
        </IconButton>

        <IconButton
          label="Back 30 seconds"
          onClick={() => clock.skip(-SKIP_MS)}
          disabled={disabled}
        >
          <ChevronsLeft size={17} />
        </IconButton>

        <button
          onClick={clock.toggle}
          disabled={disabled}
          aria-label={clock.isPlaying ? 'Pause' : 'Play'}
          className="w-10 h-10 rounded-full bg-[#E10600] text-white flex items-center justify-center hover:bg-[#FF1801] transition-colors disabled:opacity-40 disabled:hover:bg-[#E10600]"
        >
          {clock.isPlaying ? <Pause size={17} fill="currentColor" /> : <Play size={17} fill="currentColor" />}
        </button>

        <IconButton
          label="Forward 30 seconds"
          onClick={() => clock.skip(SKIP_MS)}
          disabled={disabled}
        >
          <ChevronsRight size={17} />
        </IconButton>

        <div className="flex items-center gap-1 ml-2 bg-[#16161D] border border-[#2A2A36] rounded-full px-1 py-1">
          <IconButton
            label="Slower"
            onClick={() => clock.stepSpeed(-1)}
            disabled={disabled || atMinSpeed}
            small
          >
            <Minus size={13} />
          </IconButton>
          <span className="font-mono-f1 text-[12px] font-bold text-[#E8E8EE] w-10 text-center tabular-nums">
            {clock.speed.toFixed(1)}x
          </span>
          <IconButton
            label="Faster"
            onClick={() => clock.stepSpeed(1)}
            disabled={disabled || atMaxSpeed}
            small
          >
            <Plus size={13} />
          </IconButton>
        </div>

        <span className="font-mono-f1 text-[12px] text-[#7A7A88] ml-2 tabular-nums hidden sm:inline">
          {formatRaceTime(clock.displayTime)} / {formatRaceTime(clock.durationMs)}
        </span>
      </div>
    </div>
  );
};

const IconButton: React.FC<{
  label: string;
  onClick: () => void;
  disabled?: boolean;
  small?: boolean;
  children: React.ReactNode;
}> = ({ label, onClick, disabled, small, children }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    aria-label={label}
    title={label}
    className={`${
      small ? 'w-6 h-6' : 'w-8 h-8'
    } rounded-full flex items-center justify-center text-[#C9C9D4] hover:text-white hover:bg-[#22222C] transition-colors disabled:opacity-30 disabled:hover:bg-transparent`}
  >
    {children}
  </button>
);
