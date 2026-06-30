# Product Requirements Document (PRD): Focus Buddy (Personal Web App)

## Objective & Problem Statement
**Problem:** During deep study sessions on a Windows laptop, it is easy to unconsciously break focus by touching one's face (indicating fatigue or distraction) or picking up a smartphone. Continuous monitoring can also drain laptop battery if left running indefinitely.
**Objective:** Build a lightweight, privacy-first, web-based computer vision application that runs locally on the browser. The app will monitor the user via webcam and trigger gentle, localized audio warnings when specific physical distraction thresholds are met. It will include explicit session controls to preserve battery and system resources when not in use.

## User Personas & Use Cases
**Persona:** The Sole Student (Personal Tool)
* **Motivations:** Maximize study efficiency for targeted 4-5 hour blocks, break bad habits, and maintain device battery life throughout the day.
* **Behaviors:** Studies primarily on a Windows laptop with a built-in or external webcam.

**Primary Use Case:** The user opens the web app, clicks "Start" to begin a focused block, and minimizes it to a side window. The app silently monitors and intervenes via voice only when thresholds are crossed. Once the study block is over, the user clicks "Stop," entirely terminating the monitoring and freeing up hardware resources.

## Functional Requirements & User Stories

### 1. Session Management (Start/Stop Toggle)
* **Given** the user is on the application's main interface,
* **When** they click "Start Focus Session,"
* **Then** the app requests camera permissions, loads the AI models into memory, and begins the monitoring loop.
* **Given** an active monitoring session,
* **When** the user clicks "Stop Focus Session,"
* **Then** the app instantly halts the AI processing loop and completely releases the webcam hardware (shutting off the camera light), ensuring zero background battery drain.

### 2. Hand-to-Face Detection & Alert
* **Given** the camera is actively monitoring the user,
* **When** the system detects the user's hand touching their face or chin for a continuous duration of **> 2 seconds**,
* **Then** the app uses the Web Speech API to gently say, *"Remove your hand from the face."*
* **And Then** the voice will repeat every **15 seconds** until the hand is removed, with no repeat alert fired within the first 15 seconds of the initial cue (cooldown window).
* **Definition of "touching":** Hand landmark (wrist/fingertip keypoints) within a fixed pixel-distance threshold of facial landmarks (nose, chin, cheek) for the full duration — not merely "near" the face. Resting a hand on the desk near the chin without contact does not count.

### 3. Smartphone Detection & Alert
* **Given** the camera is actively monitoring the user,
* **When** the system detects a smartphone in the frame/user's hands for a continuous duration of **> 5 seconds**,
* **Then** the app uses the Web Speech API to gently say, *"Keep your mobile aside."*
* **And Then** the voice will repeat every **15 seconds** until the phone is no longer detected, with the same cooldown rule as above.

### 4. Drowsiness / Eye-Closure Detection & Alert
* **Given** the camera is actively monitoring the user,
* **When** the system detects both eyes closed (via eye-aspect-ratio or eyelid landmark tracking) for a continuous duration of **> 5 seconds**,
* **Then** the app plays a distinct, more attention-grabbing "wake-up" sound (not the calm voice cue used for hand/phone alerts), since drowsiness is a higher-urgency state than a casual distraction.
* **And Then** the alert repeats every **10 seconds** (shorter interval than other alerts, since prolonged eye closure is higher risk) until the eyes are reopened, subject to the same 1-second anti-gaming rule as Requirement 5 below (a blink does not count as eye closure).
* **Given** the user wants a less intrusive option,
* **When** they enable "Silent Mode" in session settings before starting,
* **Then** drowsiness detection instead shows a brief, high-contrast on-screen visual flash/banner ("Wake up!") instead of playing audio, while hand/phone alerts continue using audio as normal.
* **Note:** Distinguish "eyes closed" from "looking down" or "face turned away" — if facial landmarks are not confidently detected (e.g., user looks away from camera), the system should not count this as drowsiness, only as a low-confidence frame to be skipped (see Requirement 7).

### 5. Conflict Resolution (Multiple Distractions)
* **Priority order (highest to lowest):** Drowsiness > Smartphone > Hand-to-Face. Drowsiness is ranked highest since it indicates a safety/wakefulness issue rather than a habit slip.
* **Given** the user is both touching their face *and* holding their phone,
* **When** both time thresholds are crossed,
* **Then** the system prioritizes the smartphone alert; the face-touch alert is suppressed (not fired) but its underlying timer continues running silently in the background.
* **Given** the phone is then removed while the hand is still touching the face,
* **When** the face-touch timer has already exceeded 2 seconds,
* **Then** the face-touch alert fires immediately, without waiting for a fresh 2-second count.
* **Given** the user's eyes are closed (drowsy) regardless of hand or phone state,
* **When** the 5-second drowsiness threshold is crossed,
* **Then** the wake-up alert always fires and overrides/suppresses any concurrent hand or phone alert, since a drowsy user is unlikely to register a face/phone reminder anyway.

### 6. Detection Confidence & Anti-Gaming
* **Given** a user rapidly removes and reintroduces a trigger (e.g., touching face, releasing, touching again within 1-2 seconds),
* **When** the gap between contact periods is **less than 1 second**,
* **Then** the system treats it as continuous contact and does not reset the threshold timer, preventing users from gaming the detection window.

### 7. Error & Edge-Case Handling
* **Given** the user clicks "Start Focus Session,"
* **When** camera permission is denied or no camera is found,
* **Then** the app displays a clear on-screen message explaining the issue and does not silently fail.
* **Given** an active session,
* **When** the webcam feed is lost mid-session (e.g., another app claims the device),
* **Then** the app pauses monitoring, shows a visible status indicator, and attempts to resume once the feed is available again — without crashing.

## Out of Scope (V1)
* User authentication, login, or cloud accounts.
* Database storage for historical session tracking or analytics.
* Complex UI dashboards, gamification, or screen-blocking overlays (UI will be just a simple Start/Stop button).
* Cloud-based video processing (must be 100% local for privacy).
* Scheduled or automated turning on/off of the application.

## Success Metrics (KPIs)
* **Resource Cleanup:** 100% successful release of the camera stream and zero CPU usage attributed to the app within 2 seconds of clicking "Stop."
* **False Positive Rate:** Less than 5% of alerts (across hand-touch, phone, and drowsiness triggers) are triggered incorrectly (e.g., adjusting glasses, resting chin on hand without contact, briefly looking down instead of closing eyes). Measured by manually logging a 30-minute test session and counting alerts against a manual ground-truth review of the recorded session.
* **Latency/Responsiveness:** Alerts fire exactly at the 2-second and 5-second marks without delay.
* **Performance:** The web page consumes `< 15%` of the laptop's CPU during active sessions, measured via Windows Task Manager on the developer's primary laptop (reference hardware spec to be recorded at test time).

## Technical Constraints & Risks
* **Hardware Resource Management:** The developer must explicitly use `MediaStreamTrack.stop()` when toggling the feature off. If the stream is only hidden but not stopped, battery drain will continue.
* **Background Throttling:** Browsers limit JavaScript execution for inactive tabs. **Risk Mitigation:** The app must be designed to run in an active, visible mini-window, or utilize Web Workers where possible.
* **Model Weight:** Using heavy AI models will crash the browser tab. **Risk Mitigation:** Utilize highly optimized models like TensorFlow.js (COCO-SSD) and MediaPipe with a capped processing frame rate (e.g., checking only 2-3 frames per second).
* **Lighting Conditions:** Computer vision relies heavily on room lighting. **Risk Mitigation:** Add a simple on-screen text indicator letting the user know if the camera feed is too dark to process.
* **Detection Ambiguity:** Hand-near-face vs. hand-touching-face is a genuinely hard CV distinction. **Risk Mitigation:** Use a strict landmark-distance threshold (see Functional Requirement 2) rather than bounding-box overlap alone, and tune the threshold empirically during testing.
* **Eye-Closure Detection Accuracy:** Eye-aspect-ratio detection can misfire for users wearing glasses (especially tinted or reflective lenses) or looking down at notes. **Risk Mitigation:** Combine eye landmark tracking with head-pose estimation to confirm the face is still oriented toward the camera before triggering a drowsiness alert; tune thresholds per-session if false positives are high.

## Changelog (v1 → v2)
* Added explicit cooldown interval (15s) for repeat alerts.
* Clarified face-touch timer behavior during phone-alert suppression (Requirement 4).
* Added precise definition of "touching" to reduce false positives (Requirement 2).
* Added anti-gaming rule for rapid trigger toggling (Requirement 5).
* Added camera-permission-denied and feed-loss error handling (Requirement 6).
* Added measurement methodology for False Positive Rate KPI.
* Added reference-hardware note for CPU usage KPI.

## Changelog (v2 → v3)
* Added new Drowsiness / Eye-Closure Detection requirement (Requirement 4): >5s closed eyes triggers a wake-up sound, with an optional Silent Mode using a visual flash instead.
* Established alert priority order: Drowsiness > Smartphone > Hand-to-Face.
* Added drowsiness override rule to Conflict Resolution — drowsiness always preempts other alerts.
* Added eye-closure-specific false positive risk (glasses, looking down) to Technical Risks.
* Updated False Positive Rate KPI to cover all three trigger types.
