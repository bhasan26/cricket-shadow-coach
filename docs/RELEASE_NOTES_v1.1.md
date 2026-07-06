# Biotech.AI Shadow Coach // Version 1.1 Release Notes

We are proud to announce the official release of **Version 1.1** of the **Cricket Shadow Coach (Biotech.AI)** platform. This milestone introduces a complete visual redesign, transforming the application into a highly professional, F1-style widescreen sports telemetry dashboard. All updates have been engineered for optimal human-performance training, ensuring clear visual mirrors, automated cues, and vendor-ready presentation graphics.

---

## 🌟 What's New in Version 1.1

### 1. 📺 Widescreen Side-by-Side Telemetry Cockpit (UX Overhaul)
* **Peripheral-Vision Stance Mirror:** The main desktop interface has been refactored into a high-end, 12-column grid. The camera feed now occupies a massive **8-column hero block** on the left.
* **Side-by-Side Telemetry Split:** Inside the hero block, the live 16:9 webcam stream (1.6fr) and the Live HUD Telemetry Gauges card (1fr) sit horizontally side-by-side. 
* **Zero-Scroll Training:** Because both columns align at identical heights (~340px) at the top of the viewport, the batsman can maintain focus on their video skeleton and watch the green/amber joint angles fill up in their peripheral vision simultaneously—eliminating all vertical scrolling during active crease practice.
* **Unified Right Command Deck:** The recording controls, hands-free switches, active score dials, drills panel, and connection pills are stacked cleanly inside a **4-column sidebar** on the right, matching the height of the left video block perfectly.

### 2. 🎨 AI-Generated High-Fidelity Custom Assets
We have replaced generic, standard browser emojis with custom-generated, vector-quality AI branding assets:
* **APEX Sports Biomechanics Logo (`logo.png`):** A custom, glowing 3D logo featuring a cyber-cyan biomechanics shield and a glowing laser skeletal pose tracking hologram in the header.
* **Cinematic Cyberpunk Stadium Backdrop (`stadium-bg.png`):** Overwrites the previous backdrop with an ultra-premium cyberpunk nighttime arena, showcasing searchlight beams, lens flares, and digital coordinate telemetry projections.
* **Micro-Tech "Nano Banana" Icons:** Custom nanotechnology **Nano Banana** bot graphics replace the generic emojis in your skill drills, styled with glowing, responsive glassy borders that pulse when active.

### 3. 🤖 Autonomous Hands-Free Coaching Engine
* **Biomechanical Stability Checker:** Automatically monitors a 15-frame joint variance buffer. Holding a batsman stance still (variance < 2.0 degrees) for 1.2 seconds triggers the autonomous pipeline.
* **Native Audio Countdowns:** Generates synthesizer pitch chimes (`3, 2, 1, 0`) and vocal coaching cues using native Web Speech & Web Audio APIs, unlocking successfully on first touch across mobile viewports.
* **Auto-Record & Sequence DTW:** Automatically starts recording your shot, detects movement completion, and sends the sequence to the FastAPI backend to warping-analyze your technique against the ideal 11-frame cover drive.

### 4. 📊 Persistent Session Diagnostics & History Logs
* **Biomechanical Rating Index:** Visualizes scores on a neon cyberpunk circular speedometer ring with color-shifted safety labels (ELITE, GOOD, BORDERLINE).
* **Collapsible Storage Drawer:** Saves every training drill dynamically to the browser's local database (`localStorage`), rendering session totals, average rating percentages, and compliance levels dynamically.

---

## 🚀 Performance & Engineering Metrics

* **Instantaneous Client Packaging:** The Vite asset bundler successfully packages the entire v1.1 production client in **61ms** with zero errors or HMR warnings.
* **Dynamic Mobile FPS Booster:** Automatically identifies mobile viewports and scales down the MediaPipe skeleton tracking `modelComplexity` from `1` to `0`, ensuring consistent **30+ FPS capture** on standard tablets and smartphones.

---

## 🛠️ Deploying & Launching Version 1.1

Ensure both development services are initialized in the workspace:

### 1. Initialize Python Backend (FastAPI)
```bash
cd api
python3 -m uvicorn index:app --port 8000
```
*API health indicator: [http://127.0.0.1:8000/api/health](http://127.0.0.1:8000/api/health)*

### 2. Initialize Frontend Client (Vite)
```bash
npm run dev
```
*Frontend local address: [http://localhost:5174/](http://localhost:5174/)*

---

*Engineered by **Bilal Hasan** // © 2026 Sports Biomechanics Laboratory // Biotech.AI*
