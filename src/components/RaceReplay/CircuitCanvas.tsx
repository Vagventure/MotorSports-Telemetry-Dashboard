/**
 * The track map.
 *
 * This component renders exactly once as far as React is concerned. Everything
 * that moves is drawn straight to the canvas from a per-frame subscription to
 * the replay clock, so twenty cars at 16x never touch the React tree.
 */

import React, { useCallback, useEffect, useRef } from 'react';
import { samplePath, newCursor } from '../../replay/packing';
import type { Cursor } from '../../replay/packing';
import { segmentsForRange } from '../../replay/trackGeometry';
import type { DrsZone, TrackGeometry } from '../../replay/trackGeometry';
import type { RaceClock } from '../../replay/useRaceReplay';
import type { ReplaySession } from '../../replay/types';

interface CircuitCanvasProps {
  replay: ReplaySession;
  track: TrackGeometry | null;
  drsZones: DrsZone[];
  clock: RaceClock;
  pinned: number[];
  showDrs: boolean;
  onPickDriver: (driverNumber: number) => void;
  /** Bumped by the loader so the canvas re-reads newly arrived driver paths. */
  dataVersion: number;
}

const CAR_RADIUS = 5.5;
const PINNED_RING = 3;

export const CircuitCanvas: React.FC<CircuitCanvasProps> = ({
  replay,
  track,
  drsZones,
  clock,
  pinned,
  showDrs,
  onPickDriver,
  dataVersion,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const cursorsRef = useRef(new Map<number, Cursor>());
  const sizeRef = useRef({ w: 0, h: 0, dpr: 1 });
  /** Screen-space car positions from the last frame, for hit testing. */
  const hitsRef = useRef<{ n: number; x: number; y: number }[]>([]);
  const pinnedRef = useRef(pinned);
  const showDrsRef = useRef(showDrs);

  pinnedRef.current = pinned;
  showDrsRef.current = showDrs;

  /** World (tenths of a metre) to canvas pixels, preserving aspect ratio. */
  const projectionRef = useRef({ scale: 1, offsetX: 0, offsetY: 0 });

  const recomputeProjection = useCallback(() => {
    if (!track) return;
    const { w, h } = sizeRef.current;
    const pad = 28;
    const bw = track.bounds.maxX - track.bounds.minX;
    const bh = track.bounds.maxY - track.bounds.minY;
    if (bw <= 0 || bh <= 0 || w <= 0 || h <= 0) return;

    const scale = Math.min((w - pad * 2) / bw, (h - pad * 2) / bh);
    projectionRef.current = {
      scale,
      offsetX: (w - bw * scale) / 2 - track.bounds.minX * scale,
      // Canvas y grows downward while the circuit's does not, so the world is
      // flipped here rather than in the geometry.
      offsetY: (h + bh * scale) / 2 + track.bounds.minY * scale,
    };
  }, [track]);

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;

    const apply = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = wrap.getBoundingClientRect();
      const w = Math.max(1, Math.floor(rect.width));
      const h = Math.max(1, Math.floor(rect.height));
      sizeRef.current = { w, h, dpr };
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      recomputeProjection();
    };

    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [recomputeProjection]);

  useEffect(() => {
    recomputeProjection();
  }, [recomputeProjection, track]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const toScreenX = (x: number) => x * projectionRef.current.scale + projectionRef.current.offsetX;
    const toScreenY = (y: number) =>
      projectionRef.current.offsetY - y * projectionRef.current.scale;

    const strokeCentreline = (width: number, color: string, indices?: number[]) => {
      if (!track) return;
      ctx.beginPath();
      if (indices) {
        for (let k = 0; k < indices.length; k++) {
          const i = indices[k];
          const sx = toScreenX(track.cx[i]);
          const sy = toScreenY(track.cy[i]);
          if (k === 0) ctx.moveTo(sx, sy);
          else ctx.lineTo(sx, sy);
        }
      } else {
        for (let i = 0; i < track.n; i++) {
          const sx = toScreenX(track.cx[i]);
          const sy = toScreenY(track.cy[i]);
          if (i === 0) ctx.moveTo(sx, sy);
          else ctx.lineTo(sx, sy);
        }
        ctx.closePath();
      }
      ctx.lineWidth = width;
      ctx.strokeStyle = color;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.stroke();
    };

    const draw = (timeMs: number) => {
      const { w, h, dpr } = sizeRef.current;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      if (!track) {
        ctx.fillStyle = '#5A5A68';
        ctx.font = '500 13px ui-monospace, monospace';
        ctx.textAlign = 'center';
        ctx.fillText('Tracing circuit…', w / 2, h / 2);
        return;
      }

      const roadWidth = Math.max(6, track.halfWidth * 2 * projectionRef.current.scale);

      // Light kerbs underneath, dark asphalt on top: what is left showing at
      // the sides reads as the two track edges.
      strokeCentreline(roadWidth, '#D8D8E0');
      strokeCentreline(Math.max(2, roadWidth - 4), '#121217');

      if (showDrsRef.current) {
        for (const zone of drsZones) {
          for (const run of segmentsForRange(track, zone.startS, zone.endS)) {
            strokeCentreline(Math.max(2, roadWidth - 4), '#00E701', run);
          }
        }
      }

      const hits: { n: number; x: number; y: number }[] = [];
      const pinnedSet = new Set(pinnedRef.current);

      for (const driverNumber of replay.driverOrder) {
        const path = replay.paths.get(driverNumber);
        if (!path || path.n === 0) continue;

        const retiredAt = replay.retirements.get(driverNumber);
        if (retiredAt !== undefined && timeMs > retiredAt) continue;

        let cursor = cursorsRef.current.get(driverNumber);
        if (!cursor) {
          cursor = newCursor();
          cursorsRef.current.set(driverNumber, cursor);
        }

        const p = samplePath(path, timeMs, cursor);
        if (!p) continue;

        const sx = toScreenX(p.x);
        const sy = toScreenY(p.y);
        hits.push({ n: driverNumber, x: sx, y: sy });

        const color = replay.drivers.get(driverNumber)?.color ?? '#9AA0AE';

        if (pinnedSet.has(driverNumber)) {
          ctx.beginPath();
          ctx.arc(sx, sy, CAR_RADIUS + PINNED_RING, 0, Math.PI * 2);
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }

        ctx.beginPath();
        ctx.arc(sx, sy, CAR_RADIUS, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.lineWidth = 1;
        ctx.strokeStyle = 'rgba(0,0,0,0.55)';
        ctx.stroke();
      }

      hitsRef.current = hits;
    };

    return clock.subscribe(draw);
    // `dataVersion` is not read in the body; it is here to re-establish the
    // subscription once more driver paths have landed.
  }, [clock, replay, track, drsZones, dataVersion]);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;

      let best: { n: number; d: number } | null = null;
      for (const hit of hitsRef.current) {
        const d = Math.hypot(hit.x - mx, hit.y - my);
        if (d <= 14 && (!best || d < best.d)) best = { n: hit.n, d };
      }
      if (best) onPickDriver(best.n);
    },
    [onPickDriver]
  );

  return (
    <div ref={wrapRef} className="absolute inset-0">
      <canvas
        ref={canvasRef}
        onClick={handleClick}
        className="block w-full h-full cursor-pointer"
        aria-label="Circuit map with live car positions"
      />
    </div>
  );
};
