// =====================================================================
// Synthesizes rich audio live in-browser: fanfares, funny boings, page warps & gems!
const AudioManager = {
  ctx: null,

  init: function () {
    if (!this.ctx) {
      try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioContext();
      } catch (err) { }
    }
  },

  vibrate: function (pattern) {
    // Telegram Mini App Haptics
    if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.HapticFeedback) {
      try {
        const haptic = window.Telegram.WebApp.HapticFeedback;
        if (pattern === 'error' || (Array.isArray(pattern) && pattern.length === 3)) {
          haptic.notificationOccurred('error');
        } else if (pattern === 'success' || pattern === 'levelup') {
          haptic.notificationOccurred('success');
        } else {
          haptic.impactOccurred('light');
        }
      } catch (e) { }
    }
    // Standard Web Vibration API
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(pattern);
      } catch (e) { }
    }
  },

  play: function (type) {
    try {
      this._playInternal(type);
    } catch (err) {
      // Never let audio glitches block Submit / Continue clicks
    }
  },

  _playInternal: function (type) {
    this.init(); // Guarantee audio context exists
    if (type === 'click') this.vibrate(10);
    else if (type === 'chip') this.vibrate(15);
    else if (type === 'success') this.vibrate([25, 35, 45, 35, 60]);
    else if (type === 'error') this.vibrate([50, 40, 50]);
    else if (type === 'levelup') this.vibrate([35, 50, 35, 50, 90]);
    else if (type === 'gem') this.vibrate([15, 25, 15]);
    else if (type === 'fanfare') this.vibrate([40, 50, 40, 50, 40, 60, 120]);

    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') {
      try { this.ctx.resume(); } catch (e) { }
    }

    const now = this.ctx.currentTime;

    switch (type) {
      case 'fanfare': {
        // Triumphant "Pa-na-na-na-na-naaa!" Victory Trumpet Fanfare
        // Notes: G4 (392Hz), C5 (523.25Hz), E5 (659.25Hz), G5 (783.99Hz), E5 (659.25Hz), G5 (783.99Hz)
        const notes = [
          { freq: 392.00, start: 0.00, duration: 0.09, vol: 0.25 }, // Pa
          { freq: 523.25, start: 0.10, duration: 0.09, vol: 0.27 }, // Na
          { freq: 659.25, start: 0.20, duration: 0.09, vol: 0.29 }, // Na
          { freq: 783.99, start: 0.30, duration: 0.16, vol: 0.30 }, // Na
          { freq: 659.25, start: 0.48, duration: 0.10, vol: 0.27 }, // Na
          { freq: 783.99, start: 0.60, duration: 0.65, vol: 0.35 }  // NAAAA!
        ];

        notes.forEach(n => {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          const filter = this.ctx.createBiquadFilter();

          osc.type = 'triangle';
          osc.frequency.setValueAtTime(n.freq, now + n.start);

          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(2800, now + n.start);

          const tStart = now + n.start;
          const tEnd = tStart + n.duration;

          // Standard Web Audio gain envelope (0.0001 prevents WebKit exponential ramp DOM exceptions)
          gain.gain.setValueAtTime(0.0001, tStart);
          gain.gain.linearRampToValueAtTime(n.vol, tStart + 0.015);
          gain.gain.exponentialRampToValueAtTime(0.0001, tEnd);

          osc.connect(filter);
          filter.connect(gain);
          gain.connect(this.ctx.destination);

          osc.start(tStart);
          osc.stop(tEnd);
        });
        break;
      }
      case 'click': {
        // Soft futuristic glass tap (No more heavy drum thud!)
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain); gain.connect(this.ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(1100, now + 0.04);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
        osc.start(now); osc.stop(now + 0.04);
        break;
      }
      case 'chip': {
        // Soft dual-tone crystal tech harmony
        [659.25, 880].forEach((freq, idx) => {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.connect(gain); gain.connect(this.ctx.destination);
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + idx * 0.02);
          gain.gain.setValueAtTime(0.06, now + idx * 0.02);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.02 + 0.08);
          osc.start(now + idx * 0.02);
          osc.stop(now + idx * 0.02 + 0.08);
        });
        break;
      }
      case 'success': {
        // Glorious soft 3-note arpeggio chord (C5 - E5 - G5)
        [523.25, 659.25, 783.99].forEach((freq, idx) => {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.connect(gain); gain.connect(this.ctx.destination);
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + idx * 0.07);
          gain.gain.setValueAtTime(0, now + idx * 0.07);
          gain.gain.linearRampToValueAtTime(0.18, now + idx * 0.07 + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.07 + 0.35);
          osc.start(now + idx * 0.07);
          osc.stop(now + idx * 0.07 + 0.35);
        });
        break;
      }
      case 'error': {
        // Soft, funny cartoon "boing / oopsie" sound (Gentle sine frequency bend, no harsh buzzing!)
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain); gain.connect(this.ctx.destination);
        osc.type = 'sine'; // Soft pure wave
        osc.frequency.setValueAtTime(320, now);
        osc.frequency.exponentialRampToValueAtTime(200, now + 0.12);
        osc.frequency.linearRampToValueAtTime(260, now + 0.22);
        osc.frequency.exponentialRampToValueAtTime(150, now + 0.38);

        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
        osc.start(now); osc.stop(now + 0.38);
        break;
      }
      case 'warp': {
        // Soft futuristic ambient slide for stage transition
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain); gain.connect(this.ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.exponentialRampToValueAtTime(700, now + 0.25);
        gain.gain.setValueAtTime(0.01, now);
        gain.gain.linearRampToValueAtTime(0.12, now + 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        osc.start(now); osc.stop(now + 0.25);
        break;
      }
      case 'gem': {
        // Sparkling high-pitched double chime
        [1046.50, 1567.98].forEach((freq, idx) => {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.connect(gain); gain.connect(this.ctx.destination);
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + idx * 0.08);
          gain.gain.setValueAtTime(0.15, now + idx * 0.08);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.25);
          osc.start(now + idx * 0.08);
          osc.stop(now + idx * 0.08 + 0.25);
        });
        break;
      }
      case 'levelup': {
        // Triumph victory trumpet fanfare
        [440, 554.37, 659.25, 880].forEach((freq, idx) => {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.connect(gain); gain.connect(this.ctx.destination);
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, now + idx * 0.1);
          gain.gain.setValueAtTime(0, now + idx * 0.1);
          gain.gain.linearRampToValueAtTime(0.25, now + idx * 0.1 + 0.03);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.1 + 0.5);
          osc.start(now + idx * 0.1);
          osc.stop(now + idx * 0.1 + 0.5);
        });
        break;
      }
    }
  }
};

// =====================================================================
// VoiceManager: Educational Text-to-Speech Engine
// =====================================================================
const VoiceManager = {
  synth: typeof window !== 'undefined' ? window.speechSynthesis : null,
  enabledKey: 'osmosis_voice_enabled',
  selectedVoice: null,
  _currentUtterance: null,
  _currentText: '',
  _currentOptions: null,
  _lastCharIndex: 0,
  _isPaused: false,
  _resumeWatchdog: null,

  init: function () {
    if (!this.synth) return;
    if (this.selectedVoice) return;

    const findVoice = () => {
      const voices = this.synth.getVoices();
      if (!voices || voices.length === 0) return;
      // Preference: Natural, Google, British/US English voices
      this.selectedVoice = voices.find(v => (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Serena')) && v.lang.startsWith('en')) ||
        voices.find(v => v.lang === 'en-GB') ||
        voices.find(v => v.lang.startsWith('en')) ||
        voices[0];
    };

    findVoice();
    if (this.synth.onvoiceschanged !== undefined) {
      this.synth.onvoiceschanged = findVoice;
    }
  },

  isEnabled: function () {
    const val = localStorage.getItem(this.enabledKey);
    return val === null ? true : val === 'true';
  },

  setEnabled: function (enabled) {
    localStorage.setItem(this.enabledKey, enabled ? 'true' : 'false');
    if (!enabled) this.stop();
  },

  toggle: function () {
    const nextState = !this.isEnabled();
    this.setEnabled(nextState);
    return nextState;
  },

  cleanTextForSpeech: function (text) {
    if (!text) return '';
    return text
      .replace(/\$\$\\frac\{([^}]+)\}\{([^}]+)\}\$\$/g, '$1 over $2')
      .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '$1 over $2')
      .replace(/\\sqrt\{([^}]+)\}/g, 'square root of $1')
      .replace(/\^2\b/g, ' squared')
      .replace(/\^3\b/g, ' cubed')
      .replace(/\\pm/g, ' plus or minus ')
      .replace(/\\times/g, ' times ')
      .replace(/\\cdot/g, ' dot ')
      .replace(/\\alpha/g, ' alpha ')
      .replace(/\\beta/g, ' beta ')
      .replace(/\\gamma/g, ' gamma ')
      .replace(/\\pi/g, ' pi ')
      .replace(/\$+/g, '')
      .replace(/\\[a-zA-Z]+/g, ' ')
      .replace(/[{}]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  },

  speak: function (text, options = {}) {
    if (!this.synth) return;
    if (!this.isEnabled() && !options.force) return;

    this.init();
    const wasSpeaking = !!(this.synth.speaking || this.synth.pending || this._isPaused);
    // Stop any in-flight or paused speech, clearing Chrome queue locks
    this.stop();

    const cleaned = options._isContinuation ? text : this.cleanTextForSpeech(text);
    if (!cleaned) return;

    if (!options._isContinuation) {
      this._currentText = cleaned;
      this._currentOptions = options;
      this._lastCharIndex = 0;
    }
    this._isPaused = false;

    const utterance = new SpeechSynthesisUtterance(cleaned);
    this._currentUtterance = utterance; // Keep reference to prevent GC in Chrome

    if (this.selectedVoice) utterance.voice = this.selectedVoice;

    // Clear, comfortable educational pacing
    utterance.rate = options.rate || 0.92;
    utterance.pitch = options.pitch || 1.0;
    utterance.volume = options.volume || 1.0;

    utterance.onboundary = (e) => {
      if (typeof e.charIndex === 'number' && e.charIndex > 0) {
        if (options._isContinuation) {
          this._lastCharIndex += e.charIndex;
        } else {
          this._lastCharIndex = e.charIndex;
        }
      }
    };

    utterance.onend = (e) => {
      this._isPaused = false;
      this._currentUtterance = null;
      if (options.onend) options.onend(e);
    };

    utterance.onerror = (e) => {
      // Normal cancellation / interruption should not trigger error handlers
      if (e && (e.error === 'canceled' || e.error === 'interrupted')) {
        return;
      }
      this._isPaused = false;
      this._currentUtterance = null;
      if (options.onerror) options.onerror(e);
    };

    const doSpeak = () => {
      try {
        if (this.synth.paused) {
          this.synth.resume();
        }
        this.synth.speak(utterance);
      } catch (err) {
        console.warn('VoiceManager speak error:', err);
        if (options.onerror) options.onerror(err);
      }
    };

    // If previous speech was cancelled, give Chrome/Safari audio thread 35ms to clear queue
    if (wasSpeaking) {
      setTimeout(doSpeak, 35);
    } else {
      doSpeak();
    }
  },

  stop: function () {
    this._isPaused = false;
    this._currentUtterance = null;
    if (this._resumeWatchdog) {
      clearTimeout(this._resumeWatchdog);
      this._resumeWatchdog = null;
    }
    if (this.synth) {
      try {
        // Critical: unpause first before cancelling so Chrome resets its paused lock
        if (this.synth.paused) {
          this.synth.resume();
        }
        this.synth.cancel();
      } catch (err) { }
    }
  },

  pause: function () {
    if (!this.synth) return;
    this._isPaused = true;
    try {
      this.synth.pause();
    } catch (err) { }
  },

  resume: function () {
    if (!this.synth) return;
    this._isPaused = false;

    try {
      this.synth.resume();
    } catch (err) { }

    // Chrome Watchdog: Chrome on Windows frequently fails to resume paused audio
    if (this._resumeWatchdog) clearTimeout(this._resumeWatchdog);
    this._resumeWatchdog = setTimeout(() => {
      if (this._isPaused) return; // Still paused, do nothing

      // Check if Chrome synth is stalled or frozen in paused state
      if (!this.synth.speaking || this.synth.paused) {
        try {
          if (this.synth.paused) this.synth.resume();
          this.synth.cancel();
        } catch (e) { }

        // Seamlessly continue from the paused word/character
        if (this._currentText && this._lastCharIndex < this._currentText.length) {
          const remainingText = this._currentText.slice(this._lastCharIndex);
          if (remainingText.trim()) {
            const nextOpts = Object.assign({}, this._currentOptions, { _isContinuation: true });
            this.speak(remainingText, nextOpts);
          }
        }
      }
    }, 150);
  },

  togglePause: function () {
    if (!this.synth) return false;
    if (this.isPaused()) {
      this.resume();
      return false; // unpaused / playing
    } else if (this.isSpeaking()) {
      this.pause();
      return true; // paused
    }
    return false;
  },

  isPaused: function () {
    return this._isPaused || !!(this.synth && this.synth.paused);
  },

  isSpeaking: function () {
    return !!(this.synth && this.synth.speaking) || this._isPaused;
  }
};

if (typeof window !== 'undefined') {
  window.VoiceManager = VoiceManager;
  try {
    VoiceManager.init();
  } catch (e) {
    console.warn('VoiceManager init caught:', e);
  }
}

if (typeof window !== 'undefined') {
  window.AudioManager = AudioManager;
}
