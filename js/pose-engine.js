/**
 * pose-engine.js
 * Pure functions for pose processing and Marma point coordinate computation.
 *
 * Step 9 additions:
 *  - applyWorldLmSmoothing: EMA smoother for 3-D world landmarks (metres, hip-centred)
 *  - detectOrientation:     body-facing direction from face visibility + shoulder z-spread
 *  - buildMarmaPoints:      every point now carries a z-depth estimate (metres)
 *                           used by renderer.js for occlusion dimming + depth sorting
 */

// ── EMA smoothing ──────────────────────────────────────────────────────────
/**
 * EMA alpha for landmark position smoothing.
 * 0.65 → ~96 ms lag at 30 fps. Balances jitter suppression vs tracking lag.
 */
const LM_ALPHA = 0.65;

/**
 * Applies per-frame Exponential Moving Average smoothing to raw MediaPipe
 * landmarks, mutating the smoothLm array in-place.
 *
 * Landmarks with visibility < 0.10 are frozen at their last known position
 * instead of snapping to zero - this is the main driver of flicker prevention
 * when a body part moves to the edge of the frame.
 *
 * @param {Array}       raw      - Raw landmark array from MediaPipe (33 items)
 * @param {Array|null}  smoothLm - Current smoothed state (null = first frame)
 * @returns {Array} Updated smoothLm
 */
export function applyLmSmoothing(raw, smoothLm) {
  if (!smoothLm || smoothLm.length !== raw.length) {
    return raw.map(l => ({
      x: l.x,
      y: l.y,
      z: l.z || 0,
      visibility: l.visibility || 0,
    }));
  }

  for (let i = 0; i < raw.length; i++) {
    const r = raw[i];
    const s = smoothLm[i];
    const v = r.visibility || 0;

    if (v > 0.10) {
      s.x = LM_ALPHA * s.x + (1 - LM_ALPHA) * r.x;
      s.y = LM_ALPHA * s.y + (1 - LM_ALPHA) * r.y;
      s.z = LM_ALPHA * (s.z || 0) + (1 - LM_ALPHA) * (r.z || 0);
    }
    s.visibility = 0.70 * (s.visibility || 0) + 0.30 * v;
  }

  return smoothLm;
}

/**
 * Applies EMA smoothing to 3-D world landmarks from MediaPipe.
 * World landmarks are in metres, hip-centred, and contain reliable z-depth
 * values - the key data for Step 9 occlusion and orientation detection.
 *
 * Same alpha as 2-D smoother so depth estimates stay temporally consistent
 * with the 2-D positions they annotate.
 *
 * @param {Array}       raw         - Raw world landmark array from MediaPipe
 * @param {Array|null}  smoothWorld - Current smoothed world state (null = first frame)
 * @returns {Array} Updated smoothWorld
 */
export function applyWorldLmSmoothing(raw, smoothWorld) {
  if (!raw || !raw.length) return smoothWorld;
  if (!smoothWorld || smoothWorld.length !== raw.length) {
    return raw.map(l => ({ x: l.x, y: l.y, z: l.z || 0 }));
  }

  for (let i = 0; i < raw.length; i++) {
    const r = raw[i];
    const s = smoothWorld[i];
    s.x = LM_ALPHA * s.x + (1 - LM_ALPHA) * r.x;
    s.y = LM_ALPHA * s.y + (1 - LM_ALPHA) * r.y;
    s.z = LM_ALPHA * s.z + (1 - LM_ALPHA) * (r.z || 0);
  }

  return smoothWorld;
}

// ── Orientation detection ──────────────────────────────────────────────────
/**
 * Determines which way the person is facing, using three independent signals:
 *
 * Signal 1 - Nose visibility (lm[0]):
 *   Most reliable single signal. When the person faces away, the nose
 *   landmark drops to near-zero confidence very quickly.
 *
 * Signal 2 - Ear occlusion asymmetry:
 *   When facing front, both ears have similar (often low) visibility.
 *   When facing back, the ears become MORE visible (they're now facing camera).
 *   Combined ear visibility > nose visibility → likely facing back.
 *
 * Signal 3 - Shoulder z-spread from world landmarks:
 *   |lm[11].z - lm[12].z| > 0.18 m → side profile.
 *   This triggers even when face signals are ambiguous (e.g. head is tilted).
 *
 * Hysteresis: we use a gentle threshold (not a hard cutoff) so brief
 * partial views don't flip the mode back and forth.
 */
let _lastOrientation = 'front';  // module-level for hysteresis

/** Reset orientation state - call on camera flip or body disappearance */
export function resetOrientation() { _lastOrientation = 'front'; }

export function detectOrientation(lm, worldLm) {
  if (!lm) return _lastOrientation;

  // ── Signal 1: nose visibility ──────────────────────────────────
  const noseVis = lm[0]?.visibility || 0;

  // ── Signal 2: ear vs face comparison ───────────────────────────
  const leftEarVis = lm[7]?.visibility || 0;
  const rightEarVis = lm[8]?.visibility || 0;
  const earVis = (leftEarVis + rightEarVis) / 2;
  const leftEyeVis = lm[2]?.visibility || 0;
  const rightEyeVis = lm[5]?.visibility || 0;
  const eyeVis = (leftEyeVis + rightEyeVis) / 2;

  // ── Signal 3: Shoulder Crossover (Determinant for Back) ──────────
  let shoulderCrossed = false;
  if (lm[11]?.visibility > 0.5 && lm[12]?.visibility > 0.5) {
    // 11 = Left Shoulder, 12 = Right Shoulder
    // Facing camera (unmirrored): Left Shoulder (11) is on viewer's right -> x is larger
    // Facing away: Left Shoulder (11) is on viewer's left -> x is smaller
    if (lm[11].x < lm[12].x) {
      shoulderCrossed = true;
    }
  }

  // ── Signal 4: shoulder z-spread (side view) ────────────────────
  let isSideView = false;
  if (worldLm) {
    const lSz = worldLm[11]?.z || 0;
    const rSz = worldLm[12]?.z || 0;
    const spread = Math.abs(lSz - rSz);
    if (spread > 0.18) {
      isSideView = true;
    }
  }

  // Face is "clearly visible" if nose AND eyes are confident AND shoulders haven't crossed
  const faceClearlyVisible = noseVis > 0.50 && eyeVis > 0.40 && !shoulderCrossed;
  // Back is "clearly indicated" if shoulders crossed OR (ears visible but face is not)
  const backClearlyVisible = shoulderCrossed || (earVis > 0.35 && noseVis < 0.25 && eyeVis < 0.25);

  // ── Decision with hysteresis ────────────────────────────────────
  let newOrientation = _lastOrientation;

  if (backClearlyVisible) {
    newOrientation = 'back';
  } else if (faceClearlyVisible) {
    newOrientation = 'front';
  }

  _lastOrientation = newOrientation;
  return newOrientation;
}

// ── Angula computation ─────────────────────────────────────────────────────
/**
 * Computes the biometric Angula unit (pixels per 1 Angula) from smoothed
 * landmarks, using a cascade of measurement strategies.
 *
 * Reference: Sushruta Samhita - Shareerasthana:
 *   Full body height ≈ 96 Angula
 *   Torso (shoulder → hip) ≈ 18 Angula
 *   Head width (ear → ear) ≈ 7 Angula
 *
 * Threshold is 0.30 (not 0.50) to prevent oscillation between measurement
 * modes when landmarks are partially visible near the camera.
 *
 * @param {Array}  lm - Smoothed landmark array
 * @param {number} W  - Video frame width in pixels
 * @param {number} H  - Video frame height in pixels
 * @returns {{ a: number, source: string } | null}
 */
export function computeAngula(lm, W, H) {
  const ok = i => (lm[i]?.visibility || 0) > 0.30;

  let total, source;

  if (ok(11) && ok(23) && ok(25) && ok(27)) {
    total = distPx(lm[11], lm[23], W, H)
      + distPx(lm[23], lm[25], W, H)
      + distPx(lm[25], lm[27], W, H);
    source = 'full';
  } else if (ok(11) && ok(23)) {
    total = distPx(lm[11], lm[23], W, H) * (96 / 18);
    source = 'torso';
  } else if (ok(7) && ok(8)) {
    total = distPx(lm[7], lm[8], W, H) * (96 / 7);
    source = 'face';
  } else {
    return null;
  }

  return { a: total / 96, source };
}

// ── Geometry helpers ───────────────────────────────────────────────────────
function distPx(a, b, W, H) {
  return Math.hypot((a.x - b.x) * W, (a.y - b.y) * H);
}

function midPt(a, b, r = 0.5) {
  return { x: a.x + (b.x - a.x) * r, y: a.y + (b.y - a.y) * r };
}

// ── 107 Marma coordinate engine ───────────────────────────────────────────
/**
 * Computes screen-space normalised [0-1] coordinates for all 107 Marma points.
 *
 * Step 9 addition: each returned point now carries a `z` value in metres
 * (world-space depth, hip-centred). These drive two visual effects in renderer.js:
 *   1. Depth sorting (painter's algorithm) - far points draw first, near on top
 *   2. Occlusion dimming - points on the far side of the body are dimmed,
 *      drawn with a dashed ring and hollow centre to indicate they are
 *      anatomically behind the body plane currently visible to the camera.
 *
 * z convention (matches MediaPipe world landmark z):
 *   z < 0 → toward camera (front surface of body)
 *   z > 0 → away from camera (back surface, occluded)
 *   z ≈ 0 → lateral surface
 *
 * When worldLm is null (first frames, camera flip), all z values are 0
 * and no occlusion effect is applied - a safe, neutral fallback.
 *
 * COORDINATE SYSTEM - rear camera (default):
 *   Person's LEFT  = screen RIGHT = high x (lm[11] ≈ 0.65)
 *   Person's RIGHT = screen LEFT  = low x  (lm[12] ≈ 0.35)
 *
 * @param {Array}        lm          - Smoothed 2-D landmark array
 * @param {Array|null}   worldLm     - Smoothed world landmark array (may be null)
 * @param {number}       a           - Body Angula in pixels
 * @param {number}       W           - Video frame width
 * @param {number}       H           - Video frame height
 * @returns {Array<{ name, x, y, z, cat, plane }>}
 */
export function buildMarmaPoints(lm, worldLm, a, W, H) {
  const pts = [];

  // add() records a z depth estimate for every point.
  const add = (name, x, y, z, cat, plane) =>
    pts.push({ name, x, y, z, cat, plane });

  // No coordinate flip is applied here - mx is always the identity function.
  //
  // MediaPipe defines landmark handedness relative to the SUBJECT (the person in
  // the frame), regardless of which camera is active. lm[11] is always the
  // person's anatomical LEFT shoulder. Since we also don't CSS-mirror the video
  // element or flip pixels in coverMap, the overlay aligns correctly with the
  // video for both front and rear cameras without any coordinate transformation.
  const mx = x => x;

  // Convenience accessor - safe when worldLm is null
  const wz = i => worldLm?.[i]?.z || 0;

  // ── Face-specific Angula ─────────────────────────────────────────────
  const earDist = distPx(lm[7], lm[8], W, H);
  const fa = earDist > 10 ? earDist / 7 : a;
  const fan = fa / W;
  const fav = fa / H;

  const earTopY = Math.min(lm[7].y, lm[8].y);
  const headCX = (lm[7].x + lm[8].x) / 2;

  // Approximate head z from ear landmarks (world space)
  const headZ = (wz(7) + wz(8)) / 2;

  // ── Head ────────────────────────────────────────────────────────────
  add('Adhipati', mx(headCX), earTopY - fav * 5, headZ - 0.04, 'sadya', 'both');
  add('Sthapani', mx((lm[1].x + lm[4].x) / 2), (lm[1].y + lm[4].y) / 2, headZ, 'sadya', 'front');
  add('Shankha L', mx(lm[7].x - fan * 1.8), lm[7].y - fav * 0.3, headZ + 0.03, 'sadya', 'both');
  add('Shankha R', mx(lm[8].x + fan * 1.8), lm[8].y - fav * 0.3, headZ + 0.03, 'sadya', 'both');
  add('Utkshepa L', mx(lm[7].x - fan * 0.3), lm[7].y - fav * 3, headZ + 0.03, 'vaikalya', 'both');
  add('Utkshepa R', mx(lm[8].x + fan * 0.3), lm[8].y - fav * 3, headZ + 0.03, 'vaikalya', 'both');
  add('Apanga L', mx(lm[3].x), lm[3].y, headZ, 'vaikalya', 'front');
  add('Apanga R', mx(lm[6].x), lm[6].y, headZ, 'vaikalya', 'front');
  add('Avarta L', mx(lm[2].x), lm[2].y - fav * 1.5, headZ, 'vaikalya', 'front');
  add('Avarta R', mx(lm[5].x), lm[5].y - fav * 1.5, headZ, 'vaikalya', 'front');
  add('Phana L', mx(lm[0].x + fan * 0.6), lm[0].y + fav * 0.5, headZ - 0.03, 'vaikalya', 'front');
  add('Phana R', mx(lm[0].x - fan * 0.6), lm[0].y + fav * 0.5, headZ - 0.03, 'vaikalya', 'front');
  add('Shring.1', mx((lm[9].x + lm[10].x) / 2), (lm[9].y + lm[10].y) / 2, headZ - 0.03, 'sadya', 'front');
  add('Shring.2', mx(lm[0].x), lm[0].y - fav * 1.0, headZ - 0.03, 'sadya', 'front');
  add('Shring.3L', mx(lm[7].x - fan * 1.2), lm[7].y - fav * 1.2, headZ + 0.02, 'sadya', 'both');
  add('Shring.3R', mx(lm[8].x + fan * 1.2), lm[8].y - fav * 1.2, headZ + 0.02, 'sadya', 'both');
  add('Vidhura L', mx(lm[7].x + fan * 0.5), lm[7].y + fav * 1.8, headZ + 0.06, 'vaikalya', 'both');
  add('Vidhura R', mx(lm[8].x - fan * 0.5), lm[8].y + fav * 1.8, headZ + 0.06, 'vaikalya', 'both');
  add('Krikatika L', mx(lm[7].x - fan * 0.3), lm[7].y + fav * 4, headZ + 0.14, 'vaikalya', 'back');
  add('Krikatika R', mx(lm[8].x + fan * 0.3), lm[8].y + fav * 4, headZ + 0.14, 'vaikalya', 'back');
  add('Simanta.B', mx(headCX), earTopY - fav * 3, headZ - 0.02, 'kalantara', 'both');
  add('Simanta.SL', mx(headCX - fan * 4.5), earTopY - fav * 2, headZ, 'kalantara', 'both');
  add('Simanta.SR', mx(headCX + fan * 4.5), earTopY - fav * 2, headZ, 'kalantara', 'both');
  add('Simanta.LL', mx(headCX - fan * 4.5), earTopY - fav * 1, headZ + 0.04, 'kalantara', 'both');
  add('Simanta.LR', mx(headCX + fan * 4.5), earTopY - fav * 1, headZ + 0.04, 'kalantara', 'both');

  // ── Neck ─────────────────────────────────────────────────────────────
  const emx = (lm[7].x + lm[8].x) / 2;
  const emy = (lm[7].y + lm[8].y) / 2;
  const smx = (lm[11].x + lm[12].x) / 2;
  const smy = (lm[11].y + lm[12].y) / 2;
  const ny = emy * 0.20 + smy * 0.80;
  const ny_top = emy * 0.50 + smy * 0.50;
  const neckZ = (wz(7) + wz(8) + wz(11) + wz(12)) / 4;

  add('Manya L', mx(emx + fan * 2.0), ny, neckZ - 0.02, 'sadya', 'front');
  add('Manya R', mx(emx - fan * 2.0), ny, neckZ - 0.02, 'sadya', 'front');
  add('Nila L', mx(emx + fan * 0.8), ny + fav * 0.6, neckZ, 'kalantara', 'front');
  add('Nila R', mx(emx - fan * 0.8), ny + fav * 0.6, neckZ, 'kalantara', 'front');
  add('SiraMat.L1', mx(emx + fan * 2.0), ny_top, neckZ - 0.01, 'sadya', 'front');
  add('SiraMat.L2', mx(emx + fan * 2.5), ny_top + fav, neckZ - 0.01, 'sadya', 'front');
  add('SiraMat.L3', mx(emx + fan * 2.5), ny + fav, neckZ, 'sadya', 'front');
  add('SiraMat.L4', mx(emx + fan * 2.0), ny + fav * 2, neckZ, 'sadya', 'front');
  add('SiraMat.R1', mx(emx - fan * 2.0), ny_top, neckZ - 0.01, 'sadya', 'front');
  add('SiraMat.R2', mx(emx - fan * 2.5), ny_top + fav, neckZ - 0.01, 'sadya', 'front');
  add('SiraMat.R3', mx(emx - fan * 2.5), ny + fav, neckZ, 'sadya', 'front');
  add('SiraMat.R4', mx(emx - fan * 2.0), ny + fav * 2, neckZ, 'sadya', 'front');

  // ── Shoulders ────────────────────────────────────────────────────────
  add('Amsa L', mx(lm[11].x), lm[11].y, wz(11), 'kalantara', 'both');
  add('Amsa R', mx(lm[12].x), lm[12].y, wz(12), 'kalantara', 'both');

  // ── Trunk anchors ────────────────────────────────────────────────────
  const sw = lm[11].x - lm[12].x;
  const hipVis = Math.min(lm[23]?.visibility || 0, lm[24]?.visibility || 0);
  const hipOk = hipVis > 0.40;
  const th = hipOk ? distPx(lm[11], lm[23], W, H) / H : sw * 2.0;
  const hcx = hipOk ? (lm[23].x + lm[24].x) / 2 : smx;
  const hcy = hipOk ? (lm[23].y + lm[24].y) / 2 : smy + th;

  // Front trunk z: average of shoulder world z values
  const trunkFZ = (wz(11) + wz(12)) / 2;
  // Back trunk z: anatomically ~18 cm behind front surface
  const trunkBZ = trunkFZ + 0.18;
  const hipFZ = hipOk ? (wz(23) + wz(24)) / 2 : trunkFZ + 0.05;
  const hipBZ = hipFZ + 0.18;

  // ── Front trunk ──────────────────────────────────────────────────────
  add('Hridaya', mx(smx), smy + th * 0.30, trunkFZ, 'sadya', 'front');
  add('Nabhi', mx(smx), smy + th * 0.65, trunkFZ + 0.02, 'sadya', 'front');
  add('Basti', mx(hcx), hcy - th * 0.10, hipFZ, 'sadya', 'front');
  add('Stanaro. L', mx(smx + sw * 0.28), smy + th * 0.20, trunkFZ, 'kalantara', 'front');
  add('Stanaro. R', mx(smx - sw * 0.28), smy + th * 0.20, trunkFZ, 'kalantara', 'front');
  add('Stanamula L', mx(smx + sw * 0.28), smy + th * 0.30, trunkFZ, 'kalantara', 'front');
  add('Stanamula R', mx(smx - sw * 0.28), smy + th * 0.30, trunkFZ, 'kalantara', 'front');
  add('Apastambha L', mx(smx + sw * 0.14), smy + th * 0.25, trunkFZ, 'kalantara', 'front');
  add('Apastambha R', mx(smx - sw * 0.14), smy + th * 0.25, trunkFZ, 'kalantara', 'front');
  add('Apalapa L', mx(lm[11].x - sw * 0.08), smy + th * 0.12, wz(11) + 0.04, 'kalantara', 'front');
  add('Apalapa R', mx(lm[12].x + sw * 0.08), smy + th * 0.12, wz(12) + 0.04, 'kalantara', 'front');

  // ── Back trunk ───────────────────────────────────────────────────────
  if (hipOk) {
    add('Katika L', mx(lm[23].x + sw * 0.10), lm[23].y + fav * 0.5, hipBZ, 'vaikalya', 'back');
    add('Katika R', mx(lm[24].x - sw * 0.10), lm[24].y + fav * 0.5, hipBZ, 'vaikalya', 'back');
    add('Kukundara L', mx(lm[23].x - sw * 0.10), lm[23].y + fav * 0.5, hipBZ, 'vaikalya', 'back');
    add('Kukundara R', mx(lm[24].x + sw * 0.10), lm[24].y + fav * 0.5, hipBZ, 'vaikalya', 'back');
    add('Nitamba L', mx(lm[23].x + sw * 0.25), lm[23].y - fav * 0.5, hipBZ, 'vaikalya', 'back');
    add('Nitamba R', mx(lm[24].x - sw * 0.25), lm[24].y - fav * 0.5, hipBZ, 'vaikalya', 'back');
  }
  add('Parshva L', mx(smx + sw * 0.38), smy + th * 0.55, trunkBZ, 'vaikalya', 'back');
  add('Parshva R', mx(smx - sw * 0.38), smy + th * 0.55, trunkBZ, 'vaikalya', 'back');
  add('AmsaPhal. L', mx(smx + sw * 0.30), smy + th * 0.28, trunkBZ, 'vaikalya', 'back');
  add('AmsaPhal. R', mx(smx - sw * 0.30), smy + th * 0.28, trunkBZ, 'vaikalya', 'back');
  add('Brihati L', mx(smx + sw * 0.14), smy + th * 0.42, trunkBZ, 'kalantara', 'back');
  add('Brihati R', mx(smx - sw * 0.14), smy + th * 0.42, trunkBZ, 'kalantara', 'back');
  add('Guda', mx(hcx), hcy + th * 0.15, hipBZ + 0.04, 'sadya', 'back');

  // ── Left arm ──────────────────────────────────────────────────────────
  const lw = lm[15], le = lm[13], ls = lm[11];
  const li = lm[19], lp = lm[17], lt = lm[21];
  if (lw && le && ls && li && lp && lt) {
    add('Tala H. L', mx(midPt(lw, li, 0.45).x), midPt(lw, li, 0.45).y, wz(15), 'vaikalya', 'front');
    add('Kshipra L', mx(midPt(lt, li, 0.50).x), midPt(lt, li, 0.50).y, wz(15), 'vaikalya', 'front');
    add('Kurcha L', mx(midPt(lt, lw, 0.30).x), midPt(lt, lw, 0.30).y, wz(15), 'rujak', 'front');
    add('KurchaS. L', mx(midPt(lw, lt, 0.35).x), midPt(lw, lt, 0.35).y, wz(15), 'rujak', 'front');
    add('Maniband. L', mx(lw.x), lw.y, wz(15), 'vaikalya', 'front');
    add('Indrabas. L', mx(midPt(lw, le).x), midPt(lw, le).y, wz(13), 'kalantara', 'front');
    add('Kurpara L', mx(le.x), le.y, wz(13), 'vaikalya', 'front');
    add('Ani L', mx(midPt(le, ls, 0.25).x), midPt(le, ls, 0.25).y, wz(13), 'vaikalya', 'front');
    add('Urvi L', mx(midPt(ls, le).x), midPt(ls, le).y, wz(13), 'vaikalya', 'front');
    add('Lohitaksha L', mx(midPt(le, ls, 0.12).x), midPt(le, ls, 0.12).y, wz(11) + 0.02, 'kalantara', 'front');
    add('Kaksha. L', mx(midPt(ls, le, 0.15).x), midPt(ls, le, 0.15).y, wz(11) + 0.03, 'vaikalya', 'front');
  }

  // ── Right arm ─────────────────────────────────────────────────────────
  const rw = lm[16], re = lm[14], rs = lm[12];
  const ri = lm[20], rp = lm[18], rt = lm[22];
  if (rw && re && rs && ri && rp && rt) {
    add('Tala H. R', mx(midPt(rw, ri, 0.45).x), midPt(rw, ri, 0.45).y, wz(16), 'vaikalya', 'front');
    add('Kshipra R', mx(midPt(rt, ri, 0.50).x), midPt(rt, ri, 0.50).y, wz(16), 'vaikalya', 'front');
    add('Kurcha R', mx(midPt(rt, rw, 0.30).x), midPt(rt, rw, 0.30).y, wz(16), 'rujak', 'front');
    add('KurchaS. R', mx(midPt(rw, rt, 0.35).x), midPt(rw, rt, 0.35).y, wz(16), 'rujak', 'front');
    add('Maniband. R', mx(rw.x), rw.y, wz(16), 'vaikalya', 'front');
    add('Indrabas. R', mx(midPt(rw, re).x), midPt(rw, re).y, wz(14), 'kalantara', 'front');
    add('Kurpara R', mx(re.x), re.y, wz(14), 'vaikalya', 'front');
    add('Ani R', mx(midPt(re, rs, 0.25).x), midPt(re, rs, 0.25).y, wz(14), 'vaikalya', 'front');
    add('Urvi R', mx(midPt(rs, re).x), midPt(rs, re).y, wz(14), 'vaikalya', 'front');
    add('Lohitaksha R', mx(midPt(re, rs, 0.12).x), midPt(re, rs, 0.12).y, wz(12) + 0.02, 'kalantara', 'front');
    add('Kaksha. R', mx(midPt(rs, re, 0.15).x), midPt(rs, re, 0.15).y, wz(12) + 0.03, 'vaikalya', 'front');
  }

  // ── Left leg ──────────────────────────────────────────────────────────
  // lm[23]=hip, lm[25]=knee, lm[27]=ankle, lm[29]=heel, lm[31]=foot-index
  //
  // Sushruta Samhita leg Marma (Shareerasthana), top → bottom:
  //   Vitapa     = inguinal region, medial to hip
  //   Lohitaksha = femoral artery at proximal thigh (~10% hip→knee)
  //   Urvi       = mid-thigh, sciatic nerve zone (hip→knee midpoint)
  //   Ani        = 3 Angula above knee (25% knee→hip)
  //   Janu       = knee joint centre
  //   Indravasti = calf midpoint - posterior tibial artery (ankle→knee midpoint)
  //   Gulpha     = ankle joint
  //   Kshipra    = great-toe/second-toe web space
  //   Kurcha     = dorsal foot, metatarsal area
  //   Kurchashira= heel (calcaneum)
  //   Talahridaya= centre of sole
  //
  // Visibility guards: only draw a region when its anchor landmarks
  // are genuinely confident. This prevents body points crowding onto
  // a visible hand when the legs/trunk are off-screen.
  const lh = lm[23], lk = lm[25], la = lm[27], lhl = lm[29], lfi = lm[31];
  const lhVis = lh?.visibility || 0;
  const lkVis = lk?.visibility || 0;
  const laVis = la?.visibility || 0;

  if (lhVis > 0.35 && lkVis > 0.30) {
    // Thigh - hip + knee both visible
    add('Vitapa L', mx(lh.x - sw * 0.25), lh.y - fav * 1.5, wz(23), 'vaikalya', 'front');
    add('Lohita.Lg L', mx(midPt(lh, lk, 0.10).x), midPt(lh, lk, 0.10).y, wz(23), 'kalantara', 'front');
    add('Urvi Lg L', mx(midPt(lh, lk).x), midPt(lh, lk).y, wz(23), 'vaikalya', 'front');
    add('Ani Lg L', mx(midPt(lk, lh, 0.25).x), midPt(lk, lh, 0.25).y, wz(25), 'vaikalya', 'front');
    add('Janu L', mx(lk.x), lk.y, wz(25), 'vaikalya', 'front');

    if (laVis > 0.25) {
      // Shin + ankle - require ankle also visible
      add('Indra.Lg L', mx(midPt(la, lk).x), midPt(la, lk).y, wz(25), 'kalantara', 'front');
      add('Gulpha L', mx(la.x), la.y, wz(27), 'vaikalya', 'front');

      // Foot - each point individually gated on its own landmark visibility
      if (lfi && (lfi.visibility || 0) > 0.20) {
        add('Tala F. L', mx(midPt(lfi, la, 0.40).x), midPt(lfi, la, 0.40).y, wz(27), 'vaikalya', 'front');
        add('Kurcha f L', mx(lfi.x - sw * 0.04), lfi.y - fav * 0.5, wz(31), 'rujak', 'front');
      }
      if (lfi && lhl && (lhl.visibility || 0) > 0.20) {
        add('Kshipra f L', mx(midPt(lfi, lhl, 0.30).x), midPt(lfi, lhl, 0.30).y, wz(27), 'vaikalya', 'front');
      }
      if (lhl && (lhl.visibility || 0) > 0.20) {
        add('KurchaS.f L', mx(lhl.x), lhl.y, wz(29), 'rujak', 'front');
      }
    }
  }

  // ── Right leg ─────────────────────────────────────────────────────────
  const rh = lm[24], rk = lm[26], ra = lm[28], rhl = lm[30], rfi = lm[32];
  const rhVis = rh?.visibility || 0;
  const rkVis = rk?.visibility || 0;
  const raVis = ra?.visibility || 0;

  if (rhVis > 0.35 && rkVis > 0.30) {
    // person's RIGHT hip = lm[24] at LOW x; medial toward body centre = increase x
    add('Vitapa R', mx(rh.x + sw * 0.25), rh.y - fav * 1.5, wz(24), 'vaikalya', 'front');
    add('Lohita.Lg R', mx(midPt(rh, rk, 0.10).x), midPt(rh, rk, 0.10).y, wz(24), 'kalantara', 'front');
    add('Urvi Lg R', mx(midPt(rh, rk).x), midPt(rh, rk).y, wz(24), 'vaikalya', 'front');
    add('Ani Lg R', mx(midPt(rk, rh, 0.25).x), midPt(rk, rh, 0.25).y, wz(26), 'vaikalya', 'front');
    add('Janu R', mx(rk.x), rk.y, wz(26), 'vaikalya', 'front');

    if (raVis > 0.25) {
      add('Indra.Lg R', mx(midPt(ra, rk).x), midPt(ra, rk).y, wz(26), 'kalantara', 'front');
      add('Gulpha R', mx(ra.x), ra.y, wz(28), 'vaikalya', 'front');

      if (rfi && (rfi.visibility || 0) > 0.20) {
        add('Tala F. R', mx(midPt(rfi, ra, 0.40).x), midPt(rfi, ra, 0.40).y, wz(28), 'vaikalya', 'front');
        add('Kurcha f R', mx(rfi.x + sw * 0.04), rfi.y - fav * 0.5, wz(32), 'rujak', 'front');
      }
      if (rfi && rhl && (rhl.visibility || 0) > 0.20) {
        add('Kshipra f R', mx(midPt(rfi, rhl, 0.30).x), midPt(rfi, rhl, 0.30).y, wz(28), 'vaikalya', 'front');
      }
      if (rhl && (rhl.visibility || 0) > 0.20) {
        add('KurchaS.f R', mx(rhl.x), rhl.y, wz(30), 'rujak', 'front');
      }
    }
  }

  return pts;
}


// ── EMA smoothing ──────────────────────────────────────────────────────────
