import * as tf from '@tensorflow/tfjs';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import { FaceLandmarker, HandLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
import { detector } from './detector.js';

export class VisionProcessor {
  constructor(videoElement, canvasElement) {
    this.video = videoElement;
    this.canvas = canvasElement;
    this.ctx = this.canvas.getContext('2d');
    
    this.faceLandmarker = null;
    this.handLandmarker = null;
    this.objectDetector = null;
    
    this.isRunning = false;
    this.lastVideoTime = -1;
    this.animationFrameId = null;
  }

  async initialize(onProgress) {
    try {
      onProgress('Loading TensorFlow backend...');
      await tf.ready();
      
      onProgress('Loading Object Detector (Phone)...');
      this.objectDetector = await cocoSsd.load({ base: 'lite_mobilenet_v2' });
      
      onProgress('Loading MediaPipe Vision Models...');
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
      );
      
      this.faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
          delegate: "GPU"
        },
        outputFaceBlendshapes: true,
        runningMode: "VIDEO",
        numFaces: 1
      });
      
      this.handLandmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
          delegate: "GPU"
        },
        runningMode: "VIDEO",
        numHands: 2
      });
      
      onProgress('Models loaded successfully!');
      return true;
    } catch (error) {
      console.error("Error initializing models:", error);
      onProgress('Error loading models.');
      return false;
    }
  }

  start() {
    this.isRunning = true;
    this.canvas.width = this.video.videoWidth;
    this.canvas.height = this.video.videoHeight;
    detector.resetState();
    this.predictWebcam();
  }

  stop() {
    this.isRunning = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }

  async predictWebcam() {
    if (!this.isRunning) return;

    if (this.video.currentTime !== this.lastVideoTime && this.video.readyState >= 2) {
      this.lastVideoTime = this.video.currentTime;
      const startTimeMs = performance.now();
      
      let isDrowsy = false;
      let hasPhone = false;
      let isHandTouchingFace = false;

      let faceResult = null;
      let handResult = null;

      // 1. Process Face & Drowsiness
      if (this.faceLandmarker) {
        faceResult = this.faceLandmarker.detectForVideo(this.video, startTimeMs);
        
        if (faceResult.faceLandmarks && faceResult.faceLandmarks.length > 0) {
          const faceLms = faceResult.faceLandmarks[0];
          
          // Calculate Eye Aspect Ratio (EAR) for more robust eye-closure detection
          // Right Eye: 33, 160, 158, 133, 153, 144
          const rightEAR = this._calculateEAR(faceLms, 33, 160, 158, 133, 153, 144);
          // Left Eye: 362, 385, 387, 263, 373, 380
          const leftEAR = this._calculateEAR(faceLms, 362, 385, 387, 263, 373, 380);
          
          const avgEAR = (leftEAR + rightEAR) / 2;
          
          // Debug EAR (optional, good for checking threshold)
          // console.log("Avg EAR:", avgEAR.toFixed(3));
          
          // Threshold typically between 0.15 and 0.25
          if (avgEAR < 0.22) {
            isDrowsy = true;
          }
          
          // 2. Process Hand-to-Face if face is detected
          if (this.handLandmarker) {
            handResult = this.handLandmarker.detectForVideo(this.video, startTimeMs);
            
            if (handResult.landmarks && handResult.landmarks.length > 0) {
              for (const handLms of handResult.landmarks) {
                if (this._checkHandFaceContact(handLms, faceLms)) {
                  isHandTouchingFace = true;
                  break;
                }
              }
            }
          }
        }
      }

      let hasObject = false;
      let detectedObjectName = "";

      // 3. Process Object Detection (Phone/Any Object)
      // Limit frequency to save CPU (check every 500ms)
      if (startTimeMs - this.lastObjectCheck > 500 || !this.lastObjectCheck) {
        this.lastObjectCheck = startTimeMs;
        // Detect with a lower minimum score threshold (0.15)
        this.objectDetector.detect(this.video, 20, 0.15).then(predictions => {
          this.lastPredictions = predictions;
        });
      }
      
      if (this.lastPredictions && handResult && handResult.landmarks) {
        // Calculate bounding boxes for all hands
        let handBboxes = [];
        handResult.landmarks.forEach(landmarks => {
          let minX = 1, minY = 1, maxX = 0, maxY = 0;
          landmarks.forEach(lm => {
            if (lm.x < minX) minX = lm.x;
            if (lm.x > maxX) maxX = lm.x;
            if (lm.y < minY) minY = lm.y;
            if (lm.y > maxY) maxY = lm.y;
          });
          handBboxes.push({
            x: minX * this.canvas.width,
            y: minY * this.canvas.height,
            width: (maxX - minX) * this.canvas.width,
            height: (maxY - minY) * this.canvas.height
          });
        });

        // Check if any object intersects with the hand bounding box
        for (const pred of this.lastPredictions) {
          if (pred.class !== 'person' && pred.score > 0.20) {
            const objRect = { x: pred.bbox[0], y: pred.bbox[1], width: pred.bbox[2], height: pred.bbox[3] };
            let inHand = false;
            
            for (const hand of handBboxes) {
              // AABB Collision Detection
              if (objRect.x < hand.x + hand.width &&
                  objRect.x + objRect.width > hand.x &&
                  objRect.y < hand.y + hand.height &&
                  objRect.y + objRect.height > hand.y) {
                inHand = true;
                break;
              }
            }
            
            // If the object is in hand, or if it's explicitly a cell phone (just in case hand tracking misses)
            if (inHand || pred.class === 'cell phone') {
              hasObject = true;
              detectedObjectName = pred.class;
              break;
            }
          }
        }
      }
      
      // Update Detector State Machine
      detector.update({
        isDrowsy,
        hasPhone: hasObject, // Keeping the variable name for compatibility, but it means hasObject
        isHandTouchingFace
      }, startTimeMs);
      
      // Draw landmarks for visual feedback
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      this._drawDebug(faceResult, handResult, this.lastPredictions, isHandTouchingFace);
    }

    // Call this function again to keep predicting
    this.animationFrameId = requestAnimationFrame(() => this.predictWebcam());
  }
  
  _drawDebug(faceResult, handResult, objectPredictions, isHandTouchingFace) {
    const width = this.canvas.width;
    const height = this.canvas.height;
    
    // Draw Face Circle/Oval
    if (faceResult && faceResult.faceLandmarks && faceResult.faceLandmarks.length > 0) {
      const faceLms = faceResult.faceLandmarks[0];
      
      let minX = 1, minY = 1, maxX = 0, maxY = 0;
      faceLms.forEach(lm => {
        if (lm.x < minX) minX = lm.x;
        if (lm.x > maxX) maxX = lm.x;
        if (lm.y < minY) minY = lm.y;
        if (lm.y > maxY) maxY = lm.y;
      });
      
      const centerX = (minX + maxX) / 2 * width;
      const centerY = (minY + maxY) / 2 * height;
      const radiusX = ((maxX - minX) / 2 * width) + 20;
      const radiusY = ((maxY - minY) / 2 * height) + 30;
      
      this.ctx.beginPath();
      this.ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, 2 * Math.PI);
      this.ctx.strokeStyle = isHandTouchingFace ? '#ef4444' : '#3b82f6'; // Red if touching, else blue
      this.ctx.lineWidth = isHandTouchingFace ? 5 : 3;
      this.ctx.stroke();
    }
    
    // Draw Hand Networks
    if (handResult && handResult.landmarks && handResult.landmarks.length > 0) {
      for (const landmarks of handResult.landmarks) {
        this.ctx.fillStyle = '#10b981';
        this.ctx.strokeStyle = '#10b981';
        this.ctx.lineWidth = 2;
        
        // Draw dots
        landmarks.forEach(lm => {
          this.ctx.beginPath();
          this.ctx.arc(lm.x * width, lm.y * height, 4, 0, 2 * Math.PI);
          this.ctx.fill();
        });
        
        // Draw simple connections (fingers to wrist)
        const wrist = landmarks[0];
        [4, 8, 12, 16, 20].forEach(tipIndex => { // Thumb, Index, Middle, Ring, Pinky tips
          this.ctx.beginPath();
          this.ctx.moveTo(wrist.x * width, wrist.y * height);
          for (let i = tipIndex - 3; i <= tipIndex; i++) {
            if (landmarks[i]) {
              this.ctx.lineTo(landmarks[i].x * width, landmarks[i].y * height);
            }
          }
          this.ctx.stroke();
        });
      }
    }
    
    // Draw Object Bounding Box
    if (objectPredictions) {
      objectPredictions.forEach(pred => {
        if (pred.class !== 'person' && pred.score > 0.20) {
          this.ctx.beginPath();
          this.ctx.rect(pred.bbox[0], pred.bbox[1], pred.bbox[2], pred.bbox[3]);
          this.ctx.strokeStyle = '#f59e0b'; // Amber color for any object
          this.ctx.lineWidth = 4;
          this.ctx.stroke();
          
          this.ctx.fillStyle = '#f59e0b';
          this.ctx.font = '18px Arial';
          this.ctx.fillText(`${pred.class} (${Math.round(pred.score * 100)}%)`, pred.bbox[0], pred.bbox[1] > 20 ? pred.bbox[1] - 5 : 20);
        }
      });
    }
  }
  
  _calculateEAR(faceLms, p1, p2, p3, p4, p5, p6) {
    const dist = (pt1, pt2) => Math.sqrt(Math.pow(faceLms[pt1].x - faceLms[pt2].x, 2) + Math.pow(faceLms[pt1].y - faceLms[pt2].y, 2));
    
    // Vertical distances
    const v1 = dist(p2, p6);
    const v2 = dist(p3, p5);
    // Horizontal distance
    const h1 = dist(p1, p4);
    
    // EAR Formula
    return (v1 + v2) / (2.0 * h1);
  }

  _checkHandFaceContact(handLms, faceLms) {
    // Face landmarks typically center around nose (1) and chin (152)
    const nose = faceLms[1];
    const chin = faceLms[152];
    
    // Hand keypoints (8 = index fingertip, 0 = wrist)
    const indexTip = handLms[8];
    const wrist = handLms[0];
    
    // Simple 3D distance check in normalized coordinates
    const dist = (p1, p2) => Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
    
    // Threshold in normalized coordinates (approximate based on screen size, 0.1 is more forgiving)
    const THRESHOLD = 0.1; 
    
    if (dist(indexTip, chin) < THRESHOLD || dist(wrist, chin) < THRESHOLD || dist(indexTip, nose) < THRESHOLD) {
      return true;
    }
    return false;
  }
}
