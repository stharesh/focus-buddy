# Focus Buddy

**Focus Buddy** is an AI-assisted, browser-based computer-vision application that uses webcam input to detect drowsiness, face touching, and distracting objects in real time.

The application runs the computer-vision pipeline in the browser using **MediaPipe, TensorFlow.js, and COCO-SSD**, then applies custom detection logic and a state machine to trigger visual and voice feedback during a focus session.

**Live Demo:** https://focus-buddy-nine.vercel.app/

**Source Code:** https://github.com/stharesh/focus-buddy

---

## Overview

Focus Buddy was built around a simple problem: **how can a browser application help someone stay focused without sending webcam footage to a backend for processing?**

The application combines multiple computer-vision signals:

- **Face landmarks** for eye-closure / drowsiness detection
- **Hand landmarks** for detecting hand-to-face contact
- **Object detection** for identifying distracting objects
- **State-based detection logic** to avoid reacting to short-lived false positives
- **Voice and visual feedback** to alert the user
- **Session statistics** to track detected distractions

The result is a real-time browser application that turns webcam frames into actionable focus feedback.

---

## What It Does

### Drowsiness Detection

Focus Buddy calculates an **Eye Aspect Ratio (EAR)** from facial landmarks.

When measured eye openness remains below the configured threshold for approximately five seconds, the application triggers a wake-up alert.

### Face-Touch Detection

MediaPipe hand and face landmarks are used together to determine whether a hand is sufficiently close to key facial landmarks.

The application uses a short debounce threshold so brief detection noise does not immediately trigger repeated alerts.

### Distracting Object Detection

The application combines:

- **COCO-SSD object detection**
- **MediaPipe hand landmarks**
- **Bounding-box intersection**

When a detected object overlaps with a tracked hand, the application can classify it as an object being held and trigger a distraction alert.

### Real-Time Session Dashboard

During a focus session, the UI maintains counters for:

- Drowsiness events
- Detected objects
- Face-touch events

These metrics are updated in real time as detection events occur.

### Silent Mode

Silent Mode replaces the drowsiness voice alert with a visual warning, making the application suitable for quiet study or work environments.

---

## Computer Vision Pipeline

```text
                    Webcam
                       |
                       v
                Video Frames
                       |
                       v
        +---------------------------+
        |     Vision Processing     |
        +---------------------------+
        |                           |
        |  MediaPipe Face Landmarks |
        |           |               |
        |           v               |
        |       EAR / Eyes          |
        |                           |
        |  MediaPipe Hand Landmarks |
        |           |               |
        |           v               |
        |     Hand / Face Distance  |
        |                           |
        |       COCO-SSD            |
        |           |               |
        |           v               |
        |     Object Detection      |
        +-------------+-------------+
                      |
                      v
             Detection Signals
                      |
                      v
          Distraction State Machine
                      |
          +-----------+-----------+
          v           v           v
      Drowsiness   Object     Face Touch
          |           |           |
          +-----------+-----------+
                      |
                      v
               Alert / Feedback
                 |           |
                 v           v
              Voice       Visual
                      |
                      v
               Session Metrics
```

---

## Engineering Highlights

| Problem | Implementation |
|---|---|
| Eye-closure detection | Eye Aspect Ratio calculated from MediaPipe face landmarks |
| Drowsiness persistence | Five-second detection threshold before alerting |
| Face-touch detection | Hand/face landmark distance checks |
| Object detection | TensorFlow.js + COCO-SSD |
| Object-in-hand detection | Intersection between hand and object bounding boxes |
| Detection stability | Stateful detection with timing and debounce logic |
| Repeated alerts | Event-specific cooldown periods |
| Browser interaction | Web Camera API through `getUserMedia()` |
| Voice feedback | Browser Web Speech API |
| Quiet environments | Silent Mode with visual drowsiness feedback |
| Resource cleanup | Webcam tracks and animation loop explicitly stopped when a session ends |

---

## Detection State Machine

A key part of the application is the separation between **computer-vision detection** and **user-facing alert logic**.

The vision layer produces signals such as:

```text
isDrowsy
hasObject
isHandTouchingFace
```

These signals are passed into a dedicated detection state machine.

The state machine manages:

- Detection start time
- Detection duration
- Short interruptions
- Alert thresholds
- Alert cooldowns
- Session counters
- Silent-mode behavior

For example, drowsiness is not treated as an alert simply because one frame reports low eye openness. The condition must persist long enough to reach the configured threshold.

This separation keeps the computer-vision layer focused on **detection** while the detector manages **behavior and alerting**.

---

## Architecture

The application is divided into small browser-side modules.

### `main.js`

Responsible for application lifecycle and UI behavior.

- Requests webcam permission
- Starts and stops focus sessions
- Initializes the vision processor
- Controls the application UI
- Handles Silent Mode
- Releases the camera when a session ends

### `vision.js`

Responsible for computer-vision processing.

- Initializes TensorFlow.js
- Loads COCO-SSD
- Initializes MediaPipe Face Landmarker
- Initializes MediaPipe Hand Landmarker
- Processes video frames
- Calculates EAR
- Detects hand/face contact
- Performs object/hand bounding-box intersection
- Draws detection overlays

### `detector.js`

Responsible for detection state and alert logic.

- Tracks detection duration
- Applies thresholds
- Applies cooldowns
- Maintains session statistics
- Handles Silent Mode behavior
- Coordinates alerts

### `audio.js`

Provides browser-based audio feedback using:

- Web Speech API
- Speech synthesis
- Audio context initialization

---

## Technology Stack

### Frontend

- HTML5
- CSS3
- Vanilla JavaScript
- Vite

### Computer Vision / AI

- MediaPipe Tasks Vision
- TensorFlow.js
- COCO-SSD

### Browser APIs

- `MediaDevices.getUserMedia()`
- Canvas API
- Web Speech API
- `requestAnimationFrame()`

### Deployment

- Vercel

---

## Privacy-Oriented Architecture

The core computer-vision processing happens in the browser rather than sending webcam frames to an application backend.

The application:

- Requests webcam access directly from the browser
- Processes video frames through client-side computer-vision models
- Does not implement a backend image-processing service
- Does not persist session statistics to a database
- Explicitly stops the webcam tracks when a session ends

The model/runtime assets required by the application are loaded from external CDN/model-hosting URLs, while the webcam processing pipeline itself runs client-side.

---

## Screenshots

Screenshots below document the application running through the live deployment.

> Screenshot assets are being added to the repository separately.

### Focus Buddy Interface

The starting interface provides a clear entry point for beginning a focus session and enabling Silent Mode.

![Focus Buddy Interface](screenshots/focus-buddy-home.png)

### Real-Time Face Tracking

Once a session begins, the application renders the face detection overlay over the webcam stream.

![Real-Time Face Tracking](screenshots/focus-buddy-session.png)

### Face-Touch Detection

Hand and face landmarks are processed together to detect a hand approaching the face.

![Face-Touch Detection](screenshots/focus-buddy-face-touch.png)

### Object Detection

COCO-SSD identifies objects in the camera feed while the application combines object and hand bounding boxes to determine whether an object is being held.

![Object Detection](screenshots/focus-buddy-object-detection.png)

---

## Development Approach

Focus Buddy was developed using an **AI-assisted / vibe-coding workflow**.

AI tools were used extensively throughout development to generate and iterate on the application. The resulting implementation was then tested and refined around the actual browser behavior, computer-vision pipeline, detection thresholds, state management, alerts, and user experience.

This project demonstrates an approach to building an AI-enabled product by combining **AI-assisted software development with hands-on validation and iteration**.

---

## Run Locally

### Prerequisites

- Node.js
- A modern browser with webcam support

### Installation

```bash
git clone https://github.com/stharesh/focus-buddy.git
cd focus-buddy
npm install
```

### Start Development Server

```bash
npm run dev
```

Open the local URL shown by Vite and allow webcam access when prompted.

### Production Build

```bash
npm run build
```

---

## Current Limitations

The current implementation is intentionally lightweight and browser-based.

Some limitations include:

- Object detection depends on the classes recognized by COCO-SSD.
- Hand-to-face detection uses landmark distance heuristics rather than a trained face-touch classifier.
- EAR-based drowsiness detection uses a fixed threshold and may vary across users and camera conditions.
- Real-time inference performance depends on the user's browser, device, GPU support, and camera resolution.
- The application currently focuses on three distraction signals rather than attempting to model overall human attention.

---

## Future Improvements

Potential directions include:

- User-specific calibration for drowsiness thresholds
- More robust hand-to-face classification
- Expanded distraction categories
- Configurable detection thresholds
- Historical session analytics
- Focus-session history and trends
- Improved mobile-device support
- More efficient inference scheduling
- Additional computer-vision signals for focus estimation

---

## Project Structure

```text
focus-buddy/
|
+-- index.html
+-- main.js
+-- vision.js
+-- detector.js
+-- audio.js
+-- style.css
+-- package.json
+-- README.md
+-- screenshots/
|   +-- focus-buddy-home.png
|   +-- focus-buddy-session.png
|   +-- focus-buddy-face-touch.png
|   +-- focus-buddy-object-detection.png
```

---

## Live Application

**Try Focus Buddy:**  
https://focus-buddy-nine.vercel.app/

**Source Code:**  
https://github.com/stharesh/focus-buddy

---

## License

No repository license is currently configured.
