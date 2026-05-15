# MarmaAR

Biometrically scaled AR overlay of 107 Ayurvedic Marma points on a live camera feed.

---

## What it does

The *Sushruta Samhita* documents 107 vital anatomical junctions called **Marma points**. Injury to these points produces predictable outcomes ranging from immediate death to local pain, depending on the tissues involved. MarmaAR makes this classical anatomy visible in real time by overlaying each point onto a detected human body using the camera.

The app has two parts:

- **Directory** (`index.html`) - a searchable, filterable reference of all 107 points. Each card shows the point's Sanskrit name, body region, tissue type, injury category, and full clinical description from the classical texts.
- **AR Camera** (`ar.html`) - a live camera overlay. MediaPipe BlazePose detects 33 body landmarks per frame. The app computes each point's screen position using classical *Angula* scaling (biometric units derived from the subject's own body proportions) and draws them colour-coded by injury severity.

---

## Project structure

```
MarmaAR/
├── index.html          # Home - searchable Marma point directory
├── ar.html             # AR camera overlay view
├── manifest.json       # PWA manifest
├── sw.js               # Service Worker for offline caching
├── README.md
│
├── css/
│   ├── style.css       # Directory page styles
│   └── ar.css          # AR camera view styles
│
├── js/
│   ├── data.js         # All 107 Marma points data
│   ├── main.js         # Directory controller (search, filter, render)
│   ├── ar.js           # AR app entry point
│   ├── pose-engine.js  # MediaPipe wrapper, Angula computation, coordinates
│   ├── renderer.js     # Canvas drawing engine (depth sorting, occlusion)
│   └── mediapipe/      # Localized WASM binaries and vision bundle
│
├── models/             # MediaPipe pose model (pose_landmarker_lite.task)
└── icons/              # PWA icons
```

No build tools or package managers required. All dependencies (including the MediaPipe neural network weights and WebAssembly binaries) have been fully localized, allowing the Progressive Web App to function completely offline without any CDN requests.

---

## Running locally

ES Modules and camera access both require a proper HTTP server - opening the HTML file directly will not work.

```bash
# Python 3 (no install required)
python -m http.server 8080
```

Then open `http://localhost:8080` in your browser.

For the AR view (`ar.html`), the browser will ask for camera permission. Click Allow.

---

## How the AR overlay works

**Pose detection** - MediaPipe BlazePose runs in the browser via WebAssembly and returns 33 landmarks per frame (normalised x/y and world-space z in metres).

**Angula scaling** - The classical Ayurvedic unit of measurement. 96 Angula equals full body height. The app computes the Angula size in pixels from the visible body proportions each frame (torso length, or ear-to-ear distance as a fallback), so the overlay scales correctly regardless of how far the person is from the camera.

**Coordinate computation** - `pose-engine.js` maps each of the 107 classical Marma point descriptions to specific landmark combinations and offsets, producing a normalised screen position for every visible point.

**Rendering** - `renderer.js` depth-sorts all points using the MediaPipe world-space z coordinate, then draws them on a canvas layered over the video. Points anatomically on the far side of the body (occluded) are drawn as hollow, dashed circles at reduced opacity.

**Orientation** - The app detects whether the person is facing front or back using facial landmark visibility and shoulder z-spread. Only points anatomically relevant to the current orientation are drawn at full opacity.

---

## Marma risk classification

The four categories from the *Sushruta Samhita*, Sharira Sthana Chapter 6:

| Category | Meaning | Colour on overlay |
|---|---|---|
| Sadya Pranahara | Immediately fatal | Red `#ff2d2d` |
| Kalantara Pranahara | Delayed fatal | Orange `#ff8c00` |
| Vaikalyakara | Permanent disability | Yellow `#e8e800` |
| Rujakara | Local pain - therapeutically safe | Green `#00e040` |

---

## Tech

- **MediaPipe BlazePose** (tasks-vision 0.10.14) - pose estimation
- **Canvas 2D API** - rendering
- **Vanilla HTML / CSS / ES Modules** - no framework
- **Merriweather + Inter** (Google Fonts) - typography
- **Service Worker** - offline caching of the pose model

---

## Classical sources

- *Sushruta Samhita*, Sharira Sthana, Chapter 6 - Marma Sharira Adhyaya
- *Ashtanga Hridayam*, Sharira Sthana, Chapter 4
- Dalhana, *Nibandhasangraha* (commentary on Sushruta)

---


