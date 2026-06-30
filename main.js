import { VisionProcessor } from './vision.js';
import { detector } from './detector.js';
import { alertSystem } from './audio.js';

document.addEventListener('DOMContentLoaded', async () => {
  const startBtn = document.getElementById('start-btn');
  const stopBtn = document.getElementById('stop-btn');
  const statusIndicator = document.getElementById('status-indicator');
  const statusText = document.getElementById('status-text');
  const videoElement = document.getElementById('webcam');
  const canvasElement = document.getElementById('output_canvas');
  const silentModeToggle = document.getElementById('silent-mode-toggle');
  
  let visionProcessor = new VisionProcessor(videoElement, canvasElement);
  let mediaStream = null;
  let modelsLoaded = false;
  
  // Settings
  silentModeToggle.addEventListener('change', (e) => {
    detector.setSilentMode(e.target.checked);
  });
  
  async function requestCamera() {
    try {
      mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 640 }, 
          height: { ideal: 480 },
          facingMode: 'user'
        } 
      });
      videoElement.srcObject = mediaStream;
      // Wait for video to be ready
      await new Promise((resolve) => {
        videoElement.onloadedmetadata = () => {
          resolve();
        };
      });
      return true;
    } catch (err) {
      console.error("Camera access denied or error:", err);
      return false;
    }
  }

  function releaseCamera() {
    if (mediaStream) {
      mediaStream.getTracks().forEach(track => {
        track.stop(); // Explicitly stop to turn off hardware light and save battery
      });
      videoElement.srcObject = null;
      mediaStream = null;
    }
  }
  
  startBtn.addEventListener('click', async () => {
    startBtn.disabled = true;
    statusIndicator.className = 'status-indicator loading';
    statusText.innerText = 'Requesting Camera...';
    
    // 1. Request Camera
    const hasCamera = await requestCamera();
    if (!hasCamera) {
      statusIndicator.className = 'status-indicator error';
      statusText.innerText = 'Error: Camera permission denied or not found.';
      startBtn.disabled = false;
      return;
    }
    
    // 2. Load Models if not loaded
    if (!modelsLoaded) {
      const success = await visionProcessor.initialize((msg) => {
        statusText.innerText = msg;
      });
      
      if (!success) {
        statusIndicator.className = 'status-indicator error';
        statusText.innerText = 'Failed to load AI models.';
        releaseCamera();
        startBtn.disabled = false;
        return;
      }
      modelsLoaded = true;
    }
    
    // 3. Start Session
    document.querySelector('.video-container').classList.remove('hidden');
    document.getElementById('video-placeholder').classList.add('hidden');
    document.getElementById('stats-container').classList.remove('hidden');
    startBtn.classList.add('hidden');
    stopBtn.classList.remove('hidden');
    startBtn.disabled = false;
    
    statusIndicator.className = 'status-indicator active';
    statusText.innerText = 'Focus Session Active';
    
    visionProcessor.start();
  });
  
  stopBtn.addEventListener('click', () => {
    // 1. Stop AI Loop
    visionProcessor.stop();
    
    // 2. Release Camera Hardware
    releaseCamera();
    
    // 3. Stop Audio
    alertSystem.stopAll();
    
    // 4. Update UI
    document.querySelector('.video-container').classList.add('hidden');
    document.getElementById('video-placeholder').classList.remove('hidden');
    document.getElementById('stats-container').classList.add('hidden');
    stopBtn.classList.add('hidden');
    startBtn.classList.remove('hidden');
    
    statusIndicator.className = 'status-indicator offline';
    statusText.innerText = 'Session Stopped. Battery saved.';
  });
});
