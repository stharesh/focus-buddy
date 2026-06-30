import { alertSystem } from './audio.js';

export class DistractionDetector {
  constructor() {
    // Thresholds (ms)
    this.THRESHOLDS = {
      drowsiness: 5000,
      phone: 5000,
      hand: 200 // Almost instant (200ms to debounce slight errors)
    };
    
    // Cooldowns for repeat alerts (ms)
    this.COOLDOWNS = {
      drowsiness: 10000,
      phone: 15000,
      hand: 3000 // 3 seconds cooldown so it repeats quickly
    };
    
    // Anti-gaming window (ms)
    this.ANTI_GAMING_GAP = 1000;
    
    this.resetState();
    this.silentMode = false;
    this.stats = {
      drowsiness: 0,
      phone: 0,
      hand: 0
    };
  }

  setSilentMode(isSilent) {
    this.silentMode = isSilent;
  }

  resetState() {
    this.state = {
      drowsiness: { isDetected: false, lastSeen: 0, firstSeen: 0, lastAlert: 0 },
      phone: { isDetected: false, lastSeen: 0, firstSeen: 0, lastAlert: 0 },
      hand: { isDetected: false, lastSeen: 0, firstSeen: 0, lastAlert: 0 }
    };
    this.stats = { drowsiness: 0, phone: 0, hand: 0 };
    this._updateStatsUI();
  }

  _updateStatsUI() {
    const elDrowsy = document.getElementById('stat-drowsy');
    const elPhone = document.getElementById('stat-phone');
    const elHand = document.getElementById('stat-hand');
    
    if (elDrowsy) elDrowsy.innerText = this.stats.drowsiness;
    if (elPhone) elPhone.innerText = this.stats.phone;
    if (elHand) elHand.innerText = this.stats.hand;
  }

  update(detections, timestamp) {
    // detections = { isDrowsy: boolean, hasPhone: boolean, isHandTouchingFace: boolean }
    
    this._processTrigger('drowsiness', detections.isDrowsy, timestamp);
    this._processTrigger('phone', detections.hasPhone, timestamp);
    this._processTrigger('hand', detections.isHandTouchingFace, timestamp);
    
    this._evaluateAlerts(timestamp);
  }

  _processTrigger(type, currentlyDetected, timestamp) {
    const triggerState = this.state[type];
    
    if (currentlyDetected) {
      if (!triggerState.isDetected) {
        // If it was not detected, check if we are within the anti-gaming gap
        if (timestamp - triggerState.lastSeen > this.ANTI_GAMING_GAP || triggerState.firstSeen === 0) {
          // Fresh detection
          triggerState.firstSeen = timestamp;
        }
        // If gap is < 1s, we retain the old firstSeen (anti-gaming)
        triggerState.isDetected = true;
      }
      triggerState.lastSeen = timestamp;
    } else {
      if (triggerState.isDetected) {
        triggerState.isDetected = false;
        // lastSeen is already recorded from the last frame it was true
      }
    }
  }

  _evaluateAlerts(timestamp) {
    // Check durations
    const durations = {
      drowsiness: this._getDuration('drowsiness', timestamp),
      phone: this._getDuration('phone', timestamp),
      hand: this._getDuration('hand', timestamp)
    };
    
    let voiceMessages = [];
    
    // Evaluate independently so stats trigger for all concurrent events
    if (durations.drowsiness >= this.THRESHOLDS.drowsiness) {
      if (this._checkCooldown('drowsiness', timestamp)) {
        this._fireAlert('drowsiness', timestamp);
      }
    } 
    
    // Process phone/object and hand
    if (durations.phone >= this.THRESHOLDS.phone) {
      if (this._checkCooldown('phone', timestamp)) {
        this._fireAlert('phone', timestamp);
        voiceMessages.push("Keep the thing aside");
      }
    }
    
    if (durations.hand >= this.THRESHOLDS.hand) {
      if (this._checkCooldown('hand', timestamp)) {
        this._fireAlert('hand', timestamp);
        voiceMessages.push("Remove your hand from the face");
      }
    }
    
    // Combine simultaneous voice alerts
    if (voiceMessages.length > 0) {
      alertSystem.playVoice(voiceMessages.join(" and "));
    }
  }
  
  _checkCooldown(type, timestamp) {
    const s = this.state[type];
    const cooldown = this.COOLDOWNS[type];
    return (timestamp - s.lastAlert >= cooldown);
  }

  _getDuration(type, timestamp) {
    const s = this.state[type];
    if (!s.isDetected) {
      // If within anti-gaming gap, pretend it's still running for evaluation
      if (timestamp - s.lastSeen <= this.ANTI_GAMING_GAP && s.firstSeen > 0) {
        return timestamp - s.firstSeen;
      }
      return 0;
    }
    return timestamp - s.firstSeen;
  }

  _fireAlert(type, timestamp) {
    const s = this.state[type];
    s.lastAlert = timestamp;
    
    // Increment Stats
    this.stats[type]++;
    this._updateStatsUI();
    
    // Execute the actual alert (Voice is handled in _evaluateAlerts for combining)
    if (type === 'drowsiness') {
      if (this.silentMode) {
        this._showVisualFlash();
      } else {
        alertSystem.playWakeUpAlarm();
      }
    }
  }

  _showVisualFlash() {
    const flashEl = document.getElementById('visual-alert');
    if (flashEl) {
      flashEl.classList.remove('hidden');
      setTimeout(() => {
        flashEl.classList.add('hidden');
      }, 1000);
    }
  }
}

export const detector = new DistractionDetector();
