# 🎯 Focus Buddy

**Focus Buddy** is a privacy-first, AI-powered study companion that runs entirely in your web browser. Using your webcam, it monitors your posture, eyes, and hands in real-time to prevent distractions, drowsiness, and fidgeting, helping you maintain deep focus during work or study sessions.

Since all machine learning models run locally on your device via TensorFlow.js and MediaPipe, **no video data or personal information ever leaves your browser.**

---

## ✨ Features

- 💤 **Drowsiness Detection**: Monitors your eye aspect ratio. If you close your eyes or doze off for more than 5 seconds, a voice assistant will instantly wake you up.
- 🤦 **Face-Touch Prevention**: Tracks your hand landmarks. If your hands touch your face, an instant visual red alert and voice warning will tell you to remove them, preventing fidgeting and skin irritation.
- 📱 **Object-in-Hand Detection**: Combines object detection (COCO-SSD) and hand tracking. If it detects you holding *any* recognizable object (like a mobile phone, remote, or cup) instead of focusing, it draws an amber bounding box and tells you to keep it aside.
- 📊 **Live Session Dashboard**: Tracks your distractions in real-time, displaying tallies for "Sleeps", "Objects", and "Touches" so you can gamify and measure your focus.
- 🤫 **Silent Mode**: Need to study in a quiet environment? Toggle silent mode to receive visual flashes instead of voice alerts.

---

## 🛠️ Technology Stack

- **Frontend**: HTML5, Vanilla JavaScript, CSS3 (Modern Glassmorphism UI)
- **Bundler**: [Vite](https://vitejs.dev/) for lightning-fast HMR and building.
- **Computer Vision Models**:
  - [@mediapipe/tasks-vision](https://developers.google.com/mediapipe): Used for highly accurate, real-time Face Landmarks (eye blink detection) and Hand Landmarks (face touching).
  - [@tensorflow/tfjs](https://www.tensorflow.org/js) & [@tensorflow-models/coco-ssd](https://github.com/tensorflow/tfjs-models/tree/master/coco-ssd): Used for generic object detection to determine if you are holding distractions.

---

## 🚀 Getting Started

### Prerequisites
Make sure you have [Node.js](https://nodejs.org/) installed on your machine.

### Installation

1. **Clone the repository** (or download the source code):
   ```bash
   git clone https://github.com/your-username/focus-buddy.git
   cd focus-buddy
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the development server**:
   ```bash
   npm run dev
   ```

4. **Open in Browser**:
   Open the Local URL (usually `http://localhost:5173`) provided in your terminal. You must grant the browser permission to access your webcam for the application to work.

---

## 🧠 How it Works (Architecture)

1. **`main.js`**: Initializes the Vite app, handles UI state (Start/Stop), and manages the webcam stream.
2. **`vision.js`**: Loads the AI models and processes the video frame-by-frame. It calculates the Eye Aspect Ratio (EAR) for drowsiness, runs AABB intersection between hand bounding boxes and object bounding boxes, and draws the debug overlays on the canvas.
3. **`detector.js`**: The state machine. It takes the booleans from `vision.js` and applies timers, cooldowns, and priority logic (e.g., triggering instant feedback for face touches, but waiting 5 seconds for drowsiness).
4. **`audio.js`**: Wraps the Web Speech API (`SpeechSynthesisUtterance`) to provide vocal alerts for distractions.

---

## 🔒 Privacy

Focus Buddy is built with privacy at its core. 
- It does **not** connect to any external APIs for image processing.
- All AI inference is done on the edge (in your local browser memory).
- No images, video frames, or session statistics are ever uploaded to a server or saved to disk.

---

## 📄 License

This project is open-source and available under the [MIT License](LICENSE).
