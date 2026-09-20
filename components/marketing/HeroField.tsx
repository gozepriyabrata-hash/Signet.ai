"use client";

import { useEffect, useRef } from "react";

/**
 * The hero's ambient background — a stand-in for the reference video's
 * rotating 3D object, drawn as a handful of long, sparse diagonal hairlines
 * on a canvas rather than a WebGL scene (no Three.js; `docs/design-system.md`
 * §4 keeps this stack to CSS/canvas). Reference: a few thin lines crossing
 * the whole hero at shallow angles, not a dense grid — sparse reads as
 * premium, dense reads as noise. `aria-hidden`, `pointer-events-none`, and
 * entirely decorative.
 *
 * Mounts as its own client leaf specifically so it never touches the
 * server-rendered LCP path `Hero.tsx` documents as untouchable — this
 * component renders nothing during SSR and nothing before hydration.
 *
 * The ambient drift and cursor parallax are time-driven, not scroll-driven —
 * one `requestAnimationFrame` loop, paused whenever the tab is hidden
 * (`visibilitychange`) and never started at all under
 * `prefers-reduced-motion`, per rule 10. A `pointermove` listener adds a
 * small, capped parallax offset toward the cursor — the reference's "touch
 * the lines" hint, reinterpreted as ambient depth rather than a gamified
 * hold-to-interact affordance, which would be out of register for a B2B
 * workspace. Canvas resolution tracks `devicePixelRatio` so strokes stay
 * crisp on hi-DPI screens without over-drawing on standard ones.
 *
 * One value IS read from scroll position, inside the existing per-frame
 * `draw` call rather than a separate `scroll` listener: as the hero scrolls
 * out of view, the lines scatter outward from center and fade, echoing the
 * reference video's own hero-to-next-section transition, where the 3D object
 * breaks apart into flying shards as the page scrolls past it.
 * `window.scrollY` is a plain property read, not a layout-forcing call like
 * `getBoundingClientRect` — safe to read every frame.
 *
 * A second, separate reference detail: a jagged bolt of light striking
 * downward every `LIGHTNING_INTERVAL_MS`, near the cluster of ambient lines.
 * The reference draws this as a cyan bolt through its 3D object every
 * one-to-two seconds; that hue is the one accent this system reserves for
 * "AI actions only" (`docs/design-system.md` §1) and the budget is already
 * spent (the hero wash, specs/002 §3.10), so brightness and a jagged path
 * carry the "electric" read instead of a new colour — same
 * `color-mix(in oklch, var(--foreground) …)` every other line here already
 * uses. The zigzag path is generated once per strike from a small set of
 * sine-based offsets keyed to the strike's own index, not `Math.random()`,
 * so the path stays the same for every frame of that one strike rather than
 * jittering every frame; the strike then reveals itself segment by segment
 * (a fast "flash in") and fades out over the rest of its run (a slower
 * "flash out"), rather than a spark that just slides from one end to
 * another.
 */
const LIGHTNING_INTERVAL_MS = 2400;
const LIGHTNING_DURATION_MS = 700;
const LIGHTNING_SEGMENTS = 7;
/** Fraction of the canvas the bolt starts from — the rough center of the
 * ambient lines' cluster, standing in for "the object" this canvas has no
 * literal model of. */
const LIGHTNING_ORIGIN = { x: 0.56, y: 0.22 };
const LIGHTNING_REACH = { dx: 0.03, dy: 0.42 };
export function HeroField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    let frameId = 0;
    let running = true;
    let pointerX = 0.5;
    let pointerY = 0.35;
    let targetPointerX = 0.5;
    let targetPointerY = 0.35;

    // Each line is a start/end point (fractions of the canvas), a drift
    // speed and phase so its midpoint bows very slightly over time, and a
    // parallax weight so nearer-reading lines shift a little more toward
    // the cursor than farther ones — the same cheap depth cue a multi-plane
    // parallax scene uses, without an actual z-axis.
    const LINES = [
      { x0: -0.05, y0: 0.12, x1: 0.62, y1: 0.78, speed: 0.00011, phase: 0.4, weight: 1 },
      { x0: 0.1, y0: -0.05, x1: 0.95, y1: 0.42, speed: 0.00009, phase: 2.1, weight: 0.6 },
      { x0: 0.3, y0: 1.05, x1: 1.05, y1: 0.15, speed: 0.00013, phase: 4.2, weight: 0.8 },
      { x0: -0.05, y0: 0.55, x1: 0.5, y1: -0.1, speed: 0.0001, phase: 1.1, weight: 0.5 },
    ];

    let rectLeft = 0;
    let rectTop = 0;

    function resize() {
      const parent = canvas!.parentElement;
      if (!parent) return;
      width = parent.clientWidth;
      height = parent.clientHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas!.width = width * dpr;
      canvas!.height = height * dpr;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Cached here, not read in handlePointerMove: a getBoundingClientRect
      // call on every pointermove forces a synchronous layout on the hottest
      // event this component listens to. Recomputed only on resize. Scroll
      // is deliberately not tracked — the canvas sits inside the hero, this
      // is a purely decorative parallax, and the vertical drift a scroll
      // could introduce before the next resize is imperceptible at the
      // capped 40px offset `draw` applies.
      const rect = canvas!.getBoundingClientRect();
      rectLeft = rect.left;
      rectTop = rect.top;
    }

    function draw(time: number) {
      if (!running) return;
      ctx!.clearRect(0, 0, width, height);
      ctx!.lineWidth = 1;

      // Eased toward the pointer target rather than snapped to it, so the
      // parallax reads as a slow drift, not a jitter.
      pointerX += (targetPointerX - pointerX) * 0.02;
      pointerY += (targetPointerY - pointerY) * 0.02;
      const px = (pointerX - 0.5) * 40;
      const py = (pointerY - 0.5) * 40;

      // 0 at the top of the page, 1 once scrolled a full hero-height past it.
      const disperse = height > 0 ? Math.min(1, Math.max(0, window.scrollY / height)) : 0;
      const fade = 1 - disperse;
      const scatterDistance = disperse * 260;
      const centerX = width / 2;
      const centerY = height / 2;

      for (const line of LINES) {
        const bow = Math.sin(time * line.speed + line.phase) * 18;
        const offsetX = px * line.weight;
        const offsetY = py * line.weight + bow;

        let x0 = line.x0 * width + offsetX;
        let y0 = line.y0 * height + offsetY;
        let x1 = line.x1 * width + offsetX;
        let y1 = line.y1 * height + offsetY;

        if (scatterDistance > 0) {
          // Push each endpoint further along its own vector from the
          // canvas center, so the whole line flies outward and apart
          // rather than sliding sideways as one rigid piece.
          const midX = (x0 + x1) / 2;
          const midY = (y0 + y1) / 2;
          const dirX = midX - centerX || 1;
          const dirY = midY - centerY || 1;
          const dirLength = Math.hypot(dirX, dirY);
          const pushX = (dirX / dirLength) * scatterDistance;
          const pushY = (dirY / dirLength) * scatterDistance;
          x0 += pushX;
          y0 += pushY;
          x1 += pushX;
          y1 += pushY;
        }

        if (fade <= 0.02) continue;

        ctx!.strokeStyle = `color-mix(in oklch, var(--foreground) ${
          (10 + line.weight * 6) * fade
        }%, transparent)`;
        ctx!.beginPath();
        ctx!.moveTo(x0, y0);
        ctx!.lineTo(x1, y1);
        ctx!.stroke();
      }

      // The lightning bolt: a jagged path generated once per strike (keyed
      // to the strike's index, so it is stable across that strike's frames
      // rather than re-jittering every frame), then revealed segment by
      // segment as `travel` advances and faded out over the back half of
      // the run.
      const strikeIndex = Math.floor(time / LIGHTNING_INTERVAL_MS);
      const strikeElapsed = time - strikeIndex * LIGHTNING_INTERVAL_MS;
      if (fade > 0.02 && strikeElapsed < LIGHTNING_DURATION_MS) {
        const originX = LIGHTNING_ORIGIN.x * width + px * 0.8;
        const originY = LIGHTNING_ORIGIN.y * height + py * 0.8;
        const endX = originX + LIGHTNING_REACH.dx * width;
        const endY = originY + LIGHTNING_REACH.dy * height;

        const points: Array<{ x: number; y: number }> = [{ x: originX, y: originY }];
        for (let i = 1; i <= LIGHTNING_SEGMENTS; i++) {
          const t = i / LIGHTNING_SEGMENTS;
          const baseX = originX + (endX - originX) * t;
          const baseY = originY + (endY - originY) * t;
          // A jitter unique to this segment and this strike, but fixed for
          // the strike's whole lifetime — deterministic, not Math.random().
          const jitter = Math.sin(strikeIndex * 12.9898 + i * 78.233) * 22;
          points.push({ x: baseX + jitter, y: baseY });
        }

        const travel = strikeElapsed / LIGHTNING_DURATION_MS;
        // Flashes in over the first 35% of the run, holds, then fades out
        // over the remainder — a strike, not a symmetric pulse.
        const revealPortion = Math.min(1, travel / 0.35);
        const envelope = travel < 0.35 ? 1 : 1 - (travel - 0.35) / 0.65;
        const visibleSegments = revealPortion * LIGHTNING_SEGMENTS;

        ctx!.save();
        ctx!.globalAlpha = envelope * fade;
        ctx!.shadowColor = "color-mix(in oklch, var(--foreground) 80%, transparent)";
        ctx!.shadowBlur = 16;
        ctx!.strokeStyle = "color-mix(in oklch, var(--foreground) 100%, transparent)";
        ctx!.lineWidth = 1.5;
        ctx!.lineJoin = "round";
        ctx!.beginPath();
        ctx!.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
          if (i > visibleSegments) {
            // Partway through the final visible segment: stop exactly at
            // the interpolated point instead of jumping straight to the
            // next vertex, so the reveal looks like it is travelling down
            // the bolt rather than popping in segment by segment.
            const prev = points[i - 1];
            const partial = visibleSegments - (i - 1);
            if (partial > 0) {
              ctx!.lineTo(
                prev.x + (points[i].x - prev.x) * partial,
                prev.y + (points[i].y - prev.y) * partial,
              );
            }
            break;
          }
          ctx!.lineTo(points[i].x, points[i].y);
        }
        ctx!.stroke();
        ctx!.restore();
      }

      frameId = requestAnimationFrame(draw);
    }

    function handlePointerMove(event: PointerEvent) {
      if (width === 0 || height === 0) return;
      targetPointerX = (event.clientX - rectLeft) / width;
      targetPointerY = (event.clientY - rectTop) / height;
    }

    resize();
    frameId = requestAnimationFrame(draw);

    const handleVisibility = () => {
      running = !document.hidden;
      if (running) frameId = requestAnimationFrame(draw);
      else cancelAnimationFrame(frameId);
    };

    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      running = false;
      cancelAnimationFrame(frameId);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", handlePointerMove);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 -z-10 size-full motion-reduce:hidden"
    />
  );
}
