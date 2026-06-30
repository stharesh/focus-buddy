export class AudioAlerts {
  constructor() {
    this.synth = window.speechSynthesis;
    // Generate a simple beep sound for wake-up using AudioContext if available, or base64 audio
    this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }

  playVoice(text) {
    if (this.synth.speaking) {
      console.log('Already speaking...');
      return;
    }
    const utterThis = new SpeechSynthesisUtterance(text);
    utterThis.rate = 1.0;
    utterThis.pitch = 1.0;
    this.synth.speak(utterThis);
  }

  playWakeUpAlarm() {
    if (this.synth.speaking) {
      console.log('Already speaking...');
      return;
    }
    const utterThis = new SpeechSynthesisUtterance("Wake up buddy!");
    utterThis.rate = 1.1; // Slightly faster for urgency
    utterThis.pitch = 1.2;
    this.synth.speak(utterThis);
  }

  stopAll() {
    if (this.synth.speaking) {
      this.synth.cancel();
    }
  }
}

export const alertSystem = new AudioAlerts();
