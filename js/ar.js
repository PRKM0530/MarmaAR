/**
 * app.js
 * Application entry point for Marma AR.
 *
 * Responsibilities:
 *  - Own all mutable runtime state
 *  - Run the pose detection + rendering loop
 *  - Handle camera initialisation and switching
 *  - Handle all UI events (delegated listener - no inline onclick)
 *  - Register the Service Worker and PWA install prompt
 */

import { PoseLandmarker, FilesetResolver }
  from './mediapipe/vision_bundle.mjs';

import { MARMA_DB, CAT_LABELS, CAT_META, getRegion, COLORS } from './data.js';
import {
  applyLmSmoothing, applyWorldLmSmoothing,
  computeAngula, detectOrientation,
  resetOrientation
} from './pose-engine.js';
import { resizeCanvas, drawSkeleton, drawMarma } from './renderer.js';

// ════════════════════════════════════════════════════════════════════════════
//  DOM REFERENCES
// ════════════════════════════════════════════════════════════════════════════
const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

// ════════════════════════════════════════════════════════════════════════════
//  RUNTIME STATE
// ════════════════════════════════════════════════════════════════════════════
let poseLandmarker = null;
let currentStream = null;

// Render-loop timing
let lastVideoTime = -1;
let monoTs = 0;     // strictly-increasing timestamp for MediaPipe

// Camera state
let useFrontCam = false;

// Ghost-buffer state
// smoothLm holds the EMA-filtered landmark positions.
// ghostFrames counts frames since the last successful detection.
// When ghostFrames > MAX_GHOST, overlay fades and smoothLm resets.
let smoothLm = null;
let ghostFrames = 0;
const MAX_GHOST = 45;    // ~1.5 s at 30 fps

// Step 9: 3-D world landmarks (metres, hip-centred).
// Used for body orientation detection and Marma point z-depth estimation.
// Reset whenever smoothLm resets - same lifetime.
let smoothWorldLm = null;

// Angula (biometric scale unit) - smoothed separately from landmarks
let smoothAngula = 0;

// Canvas device pixel ratio
let dpr = 1;

// Overlay UI state
let viewMode = 'all';    // 'front' | 'back' | 'all'
let selectedPoint = null;     // currently selected Marma name
let showLabels = false;    // whether all point labels are shown
let autoView = false;    // Step 9: auto-switch view from body orientation

// Tap hit-test buffer - rebuilt every render frame
let renderedPts = [];

// ════════════════════════════════════════════════════════════════════════════
//  RENDER LOOP
//  Architecture: detection and drawing are decoupled.
//  • Detection runs only when video.currentTime advances (one call per frame).
//  • Drawing runs on every rAF tick using the last valid smoothLm cache.
//  This ensures no single dropped detection frame causes a visible blink.
// ════════════════════════════════════════════════════════════════════════════
function renderLoop() {
  try {
    // 1. Resize canvas if viewport dimensions have changed
    const expectedW = Math.round(window.innerWidth * dpr);
    const expectedH = Math.round(window.innerHeight * dpr);
    if (canvas.width !== expectedW || canvas.height !== expectedH) {
      dpr = resizeCanvas(canvas);
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!poseLandmarker || !video.videoWidth) {
      requestAnimationFrame(renderLoop);
      return;
    }

    // 2. Run detection on new video frames only
    if (video.currentTime !== lastVideoTime) {
      lastVideoTime = video.currentTime;
      // monoTs must be strictly increasing - MediaPipe rejects non-monotonic values
      monoTs = Math.max(monoTs + 1, performance.now());

      const result = poseLandmarker.detectForVideo(video, monoTs);

      if (result.landmarks && result.landmarks.length > 0) {
        smoothLm = applyLmSmoothing(result.landmarks[0], smoothLm);
        // Step 9: smooth world landmarks in parallel with 2-D landmarks
        if (result.worldLandmarks?.[0]) {
          smoothWorldLm = applyWorldLmSmoothing(result.worldLandmarks[0], smoothWorldLm);
        }
        ghostFrames = 0;
        updateStatusBadge('TRACKING BODY', '#006a22', 'rgba(0,200,50,0.30)', 'rgba(0,224,64,0.08)');
      } else {
        ghostFrames++;
        if (ghostFrames === 5) {
          updateStatusBadge('LOST TRACKING', '#a05800', 'rgba(255,140,0,0.28)', 'rgba(255,140,0,0.08)');
        }
      }
    }

    // 3. Draw from cached smoothLm (runs even on ghost frames)
    if (smoothLm) {
      // Fade out gradually from frame 20 to MAX_GHOST
      const fadeAlpha = ghostFrames <= 20
        ? 1.0
        : Math.max(0, 1.0 - (ghostFrames - 20) / (MAX_GHOST - 20));
      ctx.globalAlpha = fadeAlpha;

      // Update Angula scalar with its own slow EMA
      const ag = computeAngula(smoothLm, video.videoWidth, video.videoHeight);
      if (ag) {
        smoothAngula = smoothAngula > 0
          ? 0.75 * smoothAngula + 0.25 * ag.a
          : ag.a;
        document.getElementById('angula-badge').textContent =
          `${smoothAngula.toFixed(1)}px [${ag.source}]`;
      }

      if (smoothAngula > 0) {
        // Step 9: detect body orientation for badge + auto-view
        const orientation = detectOrientation(smoothLm, smoothWorldLm);
        updateOrientBadge(orientation);
        if (autoView) applyAutoView(orientation);

        drawSkeleton(ctx, smoothLm, video, canvas, dpr, useFrontCam);
        renderedPts = drawMarma(
          ctx, smoothLm, smoothWorldLm, smoothAngula, video, canvas, dpr,
          useFrontCam, viewMode, selectedPoint, showLabels
        );
        document.getElementById('count-badge').textContent =
          `${renderedPts.length} / 107`;
      }

      ctx.globalAlpha = 1.0;

      if (ghostFrames < MAX_GHOST) {
        document.getElementById('no-body').classList.remove('visible');
      } else {
        showNobody(true);
        smoothLm = null;
        smoothWorldLm = null;
        resetOrientation();
      }
    } else {
      showNobody(true);
    }
  } catch (err) {
    console.error('renderLoop error:', err);
  }

  requestAnimationFrame(renderLoop);
}

// ── Helpers ───────────────────────────────────────────────────────────────
function updateStatusBadge(text, color, border, bg) {
  const cb = document.getElementById('conf-badge');
  if (!cb) return;
  cb.style.display = 'inline-flex';
  cb.textContent = text;
  cb.style.color = color;
  cb.style.borderColor = border;
  cb.style.background = bg;
}

// Step 9: orientation badge - shows FRONT / BACK in the HUD
const ORIENT_CONFIG = {
  'front': { label: 'FRONT', color: '#00d4ff', border: 'rgba(0,212,255,0.30)' },
  'back': { label: 'BACK', color: '#c084fc', border: 'rgba(192,132,252,0.30)' }
};
function updateOrientBadge(orientation) {
  const el = document.getElementById('orient-badge');
  if (!el) return;
  const cfg = ORIENT_CONFIG[orientation] || ORIENT_CONFIG['front'];
  el.textContent = cfg.label;
  el.style.color = cfg.color;
  el.style.borderColor = cfg.border;
  el.style.background = cfg.color + '14';
  el.style.display = 'inline-flex';
}

// Step 9: auto-view - switches Front/Back/All based on detected orientation.
// btn-auto stays highlighted while autoView is active.
function applyAutoView(orientation) {
  const target = orientation === 'back' ? 'back' : 'front';
  if (target === viewMode) return;
  viewMode = target;
  document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
  const modeBtn = document.getElementById('btn-' + target);
  if (modeBtn) modeBtn.classList.add('active');
  document.getElementById('btn-auto')?.classList.add('active');
}

function showNobody(visible) {
  document.getElementById('no-body').classList.toggle('visible', visible);
  if (visible) {
    document.getElementById('count-badge').textContent = '- / 107';
    const cb = document.getElementById('conf-badge');
    if (cb) cb.style.display = 'none';
  }
}

// ════════════════════════════════════════════════════════════════════════════
//  CAMERA
// ════════════════════════════════════════════════════════════════════════════
async function startCamera(facingMode) {
  if (currentStream) currentStream.getTracks().forEach(t => t.stop());
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
  });
  currentStream = stream;
  video.srcObject = stream;
  // No CSS scaleX(-1) - we never mirror the video.
  // MediaPipe always defines lm[11] as the person's LEFT shoulder regardless
  // of which camera is active. Mirroring the video would make the overlay
  // appear on the opposite anatomical side. Showing "natural camera" orientation
  // (how another person sees you, not how you see yourself in a mirror) is also
  // the medically correct convention for anatomy overlays.
  video.style.transform = '';
  await new Promise(r => { video.onloadedmetadata = r; });
  await video.play();
}

async function flipCamera() {
  useFrontCam = !useFrontCam;
  smoothLm = null;
  smoothWorldLm = null;
  ghostFrames = 0;
  resetOrientation();  // clear hysteresis - new camera direction
  try {
    await startCamera(useFrontCam ? 'user' : { ideal: 'environment' });
  } catch (err) {
    console.error('Camera flip failed:', err);
  }
}

// ════════════════════════════════════════════════════════════════════════════
//  UI EVENT HANDLING
//  Single delegated listener on document.body.
//  Buttons carry data-action (and optionally data-value) attributes.
//  No inline onclick anywhere - no window.* exports required.
// ════════════════════════════════════════════════════════════════════════════
function setView(mode) {
  viewMode = mode;
  selectedPoint = null;
  closePanel();
  document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
  const btn = document.getElementById('btn-' + mode);
  if (btn) btn.classList.add('active');
}

function closePanel() {
  document.getElementById('info-panel').classList.remove('open');
  selectedPoint = null;
}

function toggleLabels() {
  showLabels = !showLabels;
  // classList.toggle keeps the CSS in charge of the active appearance,
  // rather than manually touching opacity which made the button look disabled.
  document.getElementById('lbl-btn')?.classList.toggle('active', showLabels);
}

function showPanel(name) {
  const info = MARMA_DB[name];
  if (!info) return;
  const [fullName, size, tissue, cat, desc] = info;
  document.getElementById('panel-name').textContent = fullName;
  const meta = CAT_META[cat] ?? CAT_META.rujak;
  const region = getRegion(name);
  document.getElementById('panel-tags').innerHTML = `
    <span class="panel-tag">${region}</span>
    <span class="panel-tag tag-tissue">${tissue}</span>
    <span class="panel-tag tag-${cat}">${meta.shortLabel}</span>
  `;
  document.getElementById('panel-desc').textContent = desc;
  // Side-line colour matches the point's canvas colour exactly
  const pointColor = COLORS[cat] ?? COLORS.rujak;
  document.getElementById('panel-desc').style.borderLeftColor = pointColor;
  document.getElementById('info-panel').classList.add('open');
}

// Delegated click handler - covers all data-action buttons
document.body.addEventListener('click', e => {
  const el = e.target.closest('[data-action]');
  if (!el) return;
  switch (el.dataset.action) {
    case 'setView': {
      const mode = el.dataset.value;
      if (mode === 'auto') {
        autoView = !autoView;
        // Visually highlight btn-auto when active
        document.getElementById('btn-auto').classList.toggle('active', autoView);
        // Lock/unlock the manual view buttons to prevent confusion while Auto runs
        document.getElementById('controls').classList.toggle('auto-active', autoView);
        if (!autoView) {
          // Restore 'all' as the safe default when Auto is disabled
          viewMode = 'all';
          document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
          document.getElementById('btn-all').classList.add('active');
        }
      } else {
        // Any manual selection disables Auto
        autoView = false;
        document.getElementById('btn-auto')?.classList.remove('active');
        document.getElementById('controls').classList.remove('auto-active');
        setView(mode);
      }
      break;
    }
    case 'toggleLabels': toggleLabels(); break;
    case 'flipCamera': flipCamera(); break;
    case 'closePanel': closePanel(); break;
  }
});

// Tap to select nearest Marma point
document.getElementById('tap-layer').addEventListener('click', e => {
  if (!renderedPts.length) return;
  // Dismiss open panel on any tap
  if (selectedPoint) { closePanel(); return; }

  const rect = canvas.getBoundingClientRect();
  const cx = (e.clientX - rect.left) * dpr;
  const cy = (e.clientY - rect.top) * dpr;

  // Find closest rendered point within 60 CSS-px radius (scaled by dpr)
  let best = { d: 60 * dpr, name: null };
  for (const { name, px, py } of renderedPts) {
    const d = Math.hypot(cx - px, cy - py);
    if (d < best.d) best = { d, name };
  }
  if (best.name) {
    selectedPoint = best.name;
    showPanel(best.name);
  }
});

// Resize: debounced via rAF to avoid layout-thrashing on every micro-tick
let _resizeRaf = null;
function scheduleResize() {
  if (_resizeRaf) cancelAnimationFrame(_resizeRaf);
  _resizeRaf = requestAnimationFrame(() => {
    dpr = resizeCanvas(canvas);
    _resizeRaf = null;
  });
}
window.addEventListener('resize', scheduleResize);
window.addEventListener('orientationchange', () => setTimeout(scheduleResize, 250));

// Re-activate camera when the PWA returns to the foreground.
// On iOS/Android, the OS may kill the camera stream when the page is hidden
// (e.g. user switches apps or presses Home). We detect three scenarios:
//   1. Stream is healthy, video just paused  → resume playback
//   2. Stream tracks ended (OS killed them)  → restart the stream fully
//   3. video.srcObject is gone              → restart from scratch
document.addEventListener('visibilitychange', async () => {
  if (document.visibilityState !== 'visible') return;

  // Reset detection timestamp so the render loop doesn't skip the first
  // real frame after returning (video.currentTime hasn't advanced yet)
  lastVideoTime = -1;

  const tracks = currentStream?.getVideoTracks() ?? [];
  const streamDied = tracks.length === 0 || tracks[0].readyState === 'ended';

  if (streamDied) {
    // Stream was killed by the OS - restart it fully
    try {
      await startCamera(useFrontCam ? 'user' : { ideal: 'environment' });
    } catch (err) {
      console.warn('Camera restart after resume failed:', err);
    }
  } else if (video.paused) {
    video.play().catch(() => { /* requires user gesture on some browsers */ });
  }
});

// Removed offline badge logic

// ════════════════════════════════════════════════════════════════════════════
//  INITIALISATION
// ════════════════════════════════════════════════════════════════════════════
async function init() {
  dpr = resizeCanvas(canvas);

  const loadBar = document.getElementById('load-bar');
  const loadSub = document.getElementById('loading-sub');
  const loadDiv = document.getElementById('loading');

  try {
    loadSub.textContent = 'Loading MediaPipe vision…';
    loadBar.style.width = '20%';

    const vision = await FilesetResolver.forVisionTasks(
      './js/mediapipe/wasm'
    );
    loadBar.style.width = '50%';

    // ── Load the local model ───────────────────────────────────────
    // The model file (models/pose_landmarker_lite.task, ~3.4 MB) ships
    // with the project. Once the SW caches it on first load, it's always
    // available offline - no CDN dependency at all.
    const LOCAL_MODEL = './models/pose_landmarker_lite.task';

    loadSub.textContent = 'Loading pose model…';
    let modelBuffer = null;

    try {
      const resp = await fetch(LOCAL_MODEL);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      modelBuffer = new Uint8Array(await resp.arrayBuffer());
      console.info('[App] Model loaded from local file');
    } catch (err) {
      throw new Error(
        'Could not load the pose model.\n\n' +
        'Make sure models/pose_landmarker_lite.task is present in the project folder.\n' +
        '(It should be included in the repository - check your git pull.)\n\n' +
        'Original error: ' + err.message
      );
    }

    // Try GPU first (faster), fall back to CPU (wider compatibility)
    for (const delegate of ['GPU', 'CPU']) {
      try {
        loadSub.textContent = `Initialising model (${delegate})…`;
        poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: { modelAssetBuffer: modelBuffer, delegate },
          runningMode: 'VIDEO',
          numPoses: 1,
          minPoseDetectionConfidence: 0.6,
          minPosePresenceConfidence: 0.6,
          minTrackingConfidence: 0.6,
        });
        console.info('PoseLandmarker ready on', delegate);
        break;
      } catch (e) {
        console.warn('Delegate failed:', delegate, e.message || e);
      }
    }
    if (!poseLandmarker) throw new Error('Model initialisation failed on both GPU and CPU.');

    loadBar.style.width = '80%';
    loadSub.textContent = 'Starting camera…';

    await startCamera({ ideal: 'environment' });

    loadBar.style.width = '100%';
    setTimeout(() => {
      loadDiv.classList.add('hidden');
      setTimeout(() => { loadDiv.style.display = 'none'; }, 500);
    }, 300);

    requestAnimationFrame(renderLoop);

  } catch (err) {
    console.error('Init error:', err);
    const errMsg = (err.message || err.toString() || '').toLowerCase();
    if (err.name === 'NotAllowedError' || errMsg.includes('denied') || errMsg.includes('not allowed')) {
      document.getElementById('loading-text').textContent = 'Camera Access Blocked';
      document.getElementById('loading-sub').innerHTML = 
        'Please enable the camera in your browser settings and refresh the page.';
    } else {
      document.getElementById('loading-text').textContent = 'Error';
      document.getElementById('loading-sub').textContent = err.message || err.toString();
    }
  }
}

// ════════════════════════════════════════════════════════════════════════════
//  SERVICE WORKER
// ════════════════════════════════════════════════════════════════════════════
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const probe = await fetch('./sw.js', { method: 'HEAD' });
      if (!probe.ok) return;
      const reg = await navigator.serviceWorker.register('./sw.js', { scope: './' });
      reg.addEventListener('updatefound', () => {
        const sw = reg.installing;
        sw.addEventListener('statechange', () => {
          if (sw.state === 'installed' && navigator.serviceWorker.controller) {
            showToast('Update available - refresh to apply');
          }
        });
      });
    } catch (e) {
      console.warn('SW registration skipped:', e);
    }
  });
}

// ════════════════════════════════════════════════════════════════════════════
//  PWA INSTALL PROMPT
//
//  The browser fires `beforeinstallprompt` once per session when the site
//  meets the PWA install criteria. We store the event, wait 4 seconds so
//  the user has had a chance to see the app, then show a banner.
//
//  Dismiss behaviour:
//    - Tapping ✕ hides the banner for this session (sessionStorage flag).
//    - On the next page load / app restart, the browser fires the event again
//      and the banner reappears - giving the user another chance to install.
//    - Once actually installed, `appinstalled` fires and we never show it again.
// ════════════════════════════════════════════════════════════════════════════
let deferredInstallPrompt = null;
const INSTALL_DISMISSED_KEY = 'marma-install-dismissed';

window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  deferredInstallPrompt = e;

  // Don't show if user dismissed it already this session
  if (sessionStorage.getItem(INSTALL_DISMISSED_KEY)) return;

  // Wait a few seconds so the camera has started before interrupting
  setTimeout(showInstallBanner, 4000);
});

window.addEventListener('appinstalled', () => {
  deferredInstallPrompt = null;
  hideInstallBanner();
  // Once installed we never need to ask again - use localStorage (survives restarts)
  localStorage.setItem('marma-installed', '1');
  showToast('Marma AR installed - works offline now ✓');
});

function showInstallBanner() {
  // Already installed or already showing
  if (localStorage.getItem('marma-installed')) return;
  if (document.getElementById('install-banner')) return;
  if (!deferredInstallPrompt) return;

  const banner = document.createElement('div');
  banner.id = 'install-banner';

  // A prominent full-width banner at the bottom, above the controls
  // Clear enough to read on a phone in daylight
  Object.assign(banner.style, {
    position: 'fixed',
    bottom: '0',
    left: '0',
    right: '0',
    zIndex: '40',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
    padding: '14px 18px',
    paddingBottom: 'max(14px, env(safe-area-inset-bottom, 14px))',
    background: 'rgba(250,249,246,0.97)',   /* cream - matches home page */
    borderTop: '1px solid #DDD8CF',
    backdropFilter: 'blur(16px)',
    boxShadow: '0 -4px 20px rgba(28,26,23,0.10)',
  });

  // Left side: icon + text
  const left = document.createElement('div');
  Object.assign(left.style, {
    display: 'flex', alignItems: 'center', gap: '12px', minWidth: '0',
  });

  const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  icon.setAttribute('width', '22');
  icon.setAttribute('height', '22');
  icon.setAttribute('viewBox', '0 0 24 24');
  icon.setAttribute('fill', 'none');
  icon.setAttribute('stroke', '#1C1A17');
  icon.setAttribute('stroke-width', '2');
  icon.setAttribute('stroke-linecap', 'round');
  icon.setAttribute('stroke-linejoin', 'round');
  icon.setAttribute('aria-hidden', 'true');
  icon.style.flexShrink = '0';
  // Lucide `download` icon
  icon.innerHTML = '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>';

  const textWrap = document.createElement('div');

  const title = document.createElement('div');
  title.textContent = 'Install MarmaAR';
  Object.assign(title.style, {
    fontFamily: '"Merriweather", Georgia, serif',
    fontSize: '13px',
    fontWeight: '700',
    fontStyle: 'italic',
    color: '#1C1A17',
    marginBottom: '2px',
  });

  const sub = document.createElement('div');
  sub.textContent = 'Works offline - no app store needed';
  Object.assign(sub.style, {
    fontFamily: '"Inter", system-ui, sans-serif',
    fontSize: '11px',
    color: '#7A756E',
  });

  textWrap.append(title, sub);
  left.append(icon, textWrap);

  // Right side: Install button + dismiss
  const right = document.createElement('div');
  Object.assign(right.style, {
    display: 'flex', alignItems: 'center', gap: '10px', flexShrink: '0',
  });

  const installBtn = document.createElement('button');
  installBtn.textContent = 'Install';
  Object.assign(installBtn.style, {
    background: '#1C1A17',           /* ink - matches home page primary btn */
    color: '#FAF9F6',
    border: 'none',
    borderRadius: '999px',
    padding: '8px 20px',
    fontFamily: '"Inter", system-ui, sans-serif',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  });
  installBtn.addEventListener('click', triggerInstall);

  const dismissBtn = document.createElement('button');
  dismissBtn.setAttribute('aria-label', 'Dismiss install prompt');
  dismissBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
  Object.assign(dismissBtn.style, {
    background: 'none',
    border: '1px solid #DDD8CF',
    borderRadius: '50%',
    width: '30px',
    height: '30px',
    color: '#7A756E',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: '0',
  });
  dismissBtn.addEventListener('click', dismissInstallBanner);

  right.append(installBtn, dismissBtn);
  banner.append(left, right);
  document.body.appendChild(banner);
}

function hideInstallBanner() {
  document.getElementById('install-banner')?.remove();
}

function dismissInstallBanner() {
  // Mark dismissed for this browser session only - reappears on next open
  sessionStorage.setItem(INSTALL_DISMISSED_KEY, '1');
  hideInstallBanner();
}

async function triggerInstall() {
  if (!deferredInstallPrompt) return;
  hideInstallBanner();
  deferredInstallPrompt.prompt();
  const { outcome } = await deferredInstallPrompt.userChoice;
  if (outcome !== 'accepted') {
    // User said no - treat same as dismiss for this session
    sessionStorage.setItem(INSTALL_DISMISSED_KEY, '1');
  }
  deferredInstallPrompt = null;
}

// ════════════════════════════════════════════════════════════════════════════
//  TOAST NOTIFICATION
// ════════════════════════════════════════════════════════════════════════════
function showToast(msg) {
  if (!document.getElementById('toast-style')) {
    const s = document.createElement('style');
    s.id = 'toast-style';
    s.textContent = `
      @keyframes toastIn  { from{opacity:0;transform:translateX(-50%) translateY(-8px)} to{opacity:1;transform:translateX(-50%) translateY(0)} }
      @keyframes toastOut { from{opacity:1} to{opacity:0} }
    `;
    document.head.appendChild(s);
  }
  const t = document.createElement('div');
  t.style.cssText = [
    'position:fixed', 'top:80px', 'left:50%', 'transform:translateX(-50%)',
    'background:rgba(6,10,20,0.92)', 'border:1px solid var(--border)',
    'border-radius:20px', 'padding:8px 18px',
    'font-family:"Space Mono",monospace', 'font-size:11px',
    'color:rgba(255,255,255,0.7)', 'z-index:50', 'white-space:nowrap',
    'pointer-events:none',
    'animation:toastIn 0.25s ease, toastOut 0.4s 2.5s ease forwards',
  ].join(';');
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}

// Start the application
init();
