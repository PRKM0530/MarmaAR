/**
 * renderer.js
 * Canvas rendering functions for the Marma AR overlay.
 *
 * Step 9 additions:
 *  - drawMarma now sorts points by z depth (painter's algorithm) before drawing,
 *    so near-side points always appear on top of far-side points.
 *  - Points with z > OCCLUSION_THRESHOLD are drawn as "occluded":
 *      · Dashed ring instead of solid
 *      · Hollow dot instead of filled
 *      · Reduced opacity scaled with depth
 *    This gives a subtle but readable visual cue that the point is on the
 *    far side of the body (anatomically behind the visible surface).
 *  - Glow effect is suppressed for occluded points.
 */

import { COLORS, SKEL_EDGES } from './data.js';
import { buildMarmaPoints } from './pose-engine.js';

// Points deeper than this threshold (metres) are rendered as occluded.
// 0.06 m ≈ 6 cm behind the body mid-plane.
const OCCLUSION_THRESHOLD = 0.06;

// ── Canvas setup ───────────────────────────────────────────────────────────
/**
 * Sizes the canvas to match the viewport at the device's native pixel ratio.
 * @param {HTMLCanvasElement} canvas
 * @returns {number} The current devicePixelRatio
 */
export function resizeCanvas(canvas) {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(window.innerWidth * dpr);
  canvas.height = Math.round(window.innerHeight * dpr);
  canvas.style.width = window.innerWidth + 'px';
  canvas.style.height = window.innerHeight + 'px';
  return dpr;
}

// ── Coordinate mapping ────────────────────────────────────────────────────
/**
 * Maps a MediaPipe normalised coordinate [0-1] to a DPR-scaled canvas pixel,
 * replicating the browser's object-fit:cover scaling for the <video> element.
 *
 * No front-camera flip is applied here (and none on the video element either).
 * MediaPipe defines landmark handedness relative to the SUBJECT in the frame
 * (lm[11] = person's left shoulder, always) regardless of camera direction.
 * Applying any pixel-space flip would mirror the overlay relative to the video
 * and put points on the anatomically wrong side.
 *
 * @param {number}             nx
 * @param {number}             ny
 * @param {HTMLVideoElement}   video
 * @param {HTMLCanvasElement}  canvas
 * @param {number}             dpr
 * @returns {{ px: number, py: number }}
 */
export function coverMap(nx, ny, video, canvas, dpr) {
  const vW = video.videoWidth;
  const vH = video.videoHeight;
  const cW = canvas.width / dpr;
  const cH = canvas.height / dpr;

  if (!vW || !vH) {
    return { px: nx * cW * dpr, py: ny * cH * dpr };
  }

  let scale, offX, offY;
  if (vW / vH > cW / cH) {
    scale = cH / vH; offX = (cW - vW * scale) / 2; offY = 0;
  } else {
    scale = cW / vW; offX = 0; offY = (cH - vH * scale) / 2;
  }

  return {
    px: (nx * vW * scale + offX) * dpr,
    py: (ny * vH * scale + offY) * dpr,
  };
}

// ── Skeleton overlay ──────────────────────────────────────────────────────
/**
 * Draws the MediaPipe pose skeleton as a faint white wireframe.
 * Edges are only drawn when both endpoints have smoothed visibility > 0.20.
 */
export function drawSkeleton(ctx, lm, video, canvas, dpr, useFrontCam) {
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.15)';
  ctx.lineWidth = 1.5 * dpr;

  for (const [i, j] of SKEL_EDGES) {
    if ((lm[i]?.visibility || 0) > 0.20 && (lm[j]?.visibility || 0) > 0.20) {
      const si = coverMap(lm[i].x, lm[i].y, video, canvas, dpr);
      const sj = coverMap(lm[j].x, lm[j].y, video, canvas, dpr);
      ctx.beginPath();
      ctx.moveTo(si.px, si.py);
      ctx.lineTo(sj.px, sj.py);
      ctx.stroke();
    }
  }

  ctx.restore();
}

// ── Marma point overlay ───────────────────────────────────────────────────
/**
 * Draws all 107 Marma points with depth sorting and occlusion cues (Step 9).
 *
 * DEPTH SORTING (painter's algorithm):
 *   Points are sorted by z (metres, world-space) before drawing.
 *   Far points draw first; near points draw on top - correct anatomical layering.
 *
 * OCCLUSION STYLE (z > OCCLUSION_THRESHOLD):
 *   · Dashed ring   - indicates the point is on the far side of the body
 *   · Hollow dot    - reinforces the "ghost" visual
 *   · Reduced alpha - scales from 0.65 at threshold to 0.20 at 25 cm depth
 *   · No glow       - glow suppressed (would look like a light leak)
 *   · No label      - occluded labels would clutter the primary view
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {Array}        lm
 * @param {Array|null}   worldLm       - Smoothed world landmarks (may be null)
 * @param {number}       angula
 * @param {HTMLVideoElement}  video
 * @param {HTMLCanvasElement} canvas
 * @param {number}       dpr
 * @param {boolean}      useFrontCam
 * @param {string}       viewMode
 * @param {string|null}  selectedPoint
 * @param {boolean}      showLabels
 * @returns {Array<{ name, px, py }>} Hit-test buffer
 */
export function drawMarma(
  ctx, lm, worldLm, angula, video, canvas, dpr,
  useFrontCam, viewMode, selectedPoint, showLabels
) {
  const renderedPts = [];
  const vW = video.videoWidth;
  const vH = video.videoHeight;
  if (!vW || !vH || angula <= 0) return renderedPts;

  const allPts = buildMarmaPoints(lm, worldLm, angula, vW, vH);

  // Filter by view mode, then depth sort (far → near)
  const sorted = allPts
    .filter(p => viewMode === 'all' || p.plane === 'both' || p.plane === viewMode)
    .sort((a, b) => b.z - a.z);

  ctx.font = `${Math.round(9 * dpr)}px "Space Mono", monospace`;

  for (const { name, x, y, z, cat } of sorted) {
    const { px, py } = coverMap(x, y, video, canvas, dpr);

    if (px < -50 || px > canvas.width + 50 || py < -50 || py > canvas.height + 50) continue;

    const color = COLORS[cat];
    const isSel = (selectedPoint === name);
    const isOccluded = !isSel && (z > OCCLUSION_THRESHOLD);

    // Opacity: full for near-side points, reduced for occluded ones
    const depthAlpha = isOccluded
      ? Math.max(0.20, 1.0 - (z - OCCLUSION_THRESHOLD) / 0.25 * 0.80)
      : 1.0;

    // Radius: slightly smaller for deeply occluded points
    const depthScale = isOccluded
      ? Math.max(0.65, 1.0 - (z - OCCLUSION_THRESHOLD) * 1.5)
      : 1.0;
    const r = (isSel ? 11 : 5) * dpr * depthScale;

    ctx.globalAlpha = depthAlpha;
    ctx.shadowBlur = 0;

    // Glow only on near-surface fatal/delayed-fatal points
    if (!isOccluded && (cat === 'sadya' || cat === 'kalantara')) {
      ctx.shadowColor = color;
      ctx.shadowBlur = (isSel ? 18 : 7) * dpr;
    }

    // Outer ring - dashed for occluded
    ctx.beginPath();
    ctx.arc(px, py, r, 0, Math.PI * 2);
    ctx.strokeStyle = color;
    ctx.lineWidth = (isSel ? 2.5 : 1.5) * dpr;
    ctx.setLineDash(isOccluded ? [3 * dpr, 3 * dpr] : []);
    ctx.stroke();
    ctx.setLineDash([]);

    // Pulse ring for selected
    if (isSel) {
      ctx.shadowBlur = 0;
      ctx.beginPath();
      ctx.arc(px, py, r * 2.2, 0, Math.PI * 2);
      ctx.strokeStyle = color + '55';
      ctx.lineWidth = 1 * dpr;
      ctx.stroke();
    }

    // Centre: hollow for occluded, filled for visible
    ctx.shadowBlur = 0;
    if (isOccluded) {
      ctx.beginPath();
      ctx.arc(px, py, 2 * dpr, 0, Math.PI * 2);
      ctx.strokeStyle = color + 'aa';
      ctx.lineWidth = 1 * dpr;
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(px, py, (isSel ? 4 : 2) * dpr, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
    }

    // Labels: skip on occluded points entirely
    if (!isOccluded && (isSel || showLabels || cat === 'sadya')) {
      ctx.fillStyle = isSel ? '#ffffff' : color + 'cc';
      ctx.fillText(name, px + (r + 4 * dpr), py + 4 * dpr);
    }

    ctx.globalAlpha = 1.0;
    renderedPts.push({ name, px, py });
  }

  return renderedPts;
}
