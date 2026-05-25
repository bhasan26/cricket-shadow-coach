// Web Speech Synthesis and Oscillator-based Audio Synthesizers for Hands-free coaching.

let lastSpokenTime = 0;
const SPEECH_THROTTLE_MS = 3500; // Speak at most once every 3.5s to avoid clutter

/**
 * Speak a coaching prompt using Web Speech API
 * @param {string} text - Message to speak
 * @param {boolean} force - If true, bypasses throttle and cancels active speech
 */
export function speakCoachingCue(text, force = false) {
  if (!('speechSynthesis' in window)) return;

  const now = Date.now();
  if (!force && now - lastSpokenTime < SPEECH_THROTTLE_MS) {
    return; // Throttled
  }

  if (force) {
    window.speechSynthesis.cancel(); // Abort previous statements immediately
  }

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 1.05; // Slightly faster for responsiveness
  utterance.pitch = 1.0;
  
  // Find a high-quality English voice if possible
  const voices = window.speechSynthesis.getVoices();
  const englishVoice = voices.find(v => v.lang.includes('en-') && !v.name.includes('Google'));
  if (englishVoice) utterance.voice = englishVoice;

  lastSpokenTime = now;
  window.speechSynthesis.speak(utterance);
}

/**
 * Play a synthesizer chime using Web Audio Context
 * @param {number} frequency - Pitch in Hz
 * @param {number} duration - Time in seconds
 * @param {string} type - Oscillator type ('sine', 'square', 'sawtooth', 'triangle')
 */
export function playSynthBeep(frequency, duration = 0.15, type = 'sine') {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.type = type;
    osc.frequency.value = frequency;
    
    // Smooth volume envelope to prevent clicking
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch (err) {
    // Audio context may be blocked by browser user gesture policies
  }
}

/**
 * Synthesize a 3-count training alert countdown
 * @param {number} step - Current step (3, 2, 1, or 0 for GO)
 */
export function playCountdownStep(step) {
  if (step > 0) {
    // standard high beep
    playSynthBeep(880, 0.12, 'sine');
  } else {
    // "GO" double chirp
    playSynthBeep(1200, 0.08, 'sine');
    setTimeout(() => playSynthBeep(1500, 0.18, 'sine'), 80);
  }
}

export function playAutoStartSound() {
  playSynthBeep(1000, 0.08, 'sine');
  setTimeout(() => playSynthBeep(1300, 0.12, 'sine'), 60);
}

export function playAutoStopSound() {
  playSynthBeep(600, 0.12, 'sine');
  setTimeout(() => playSynthBeep(450, 0.20, 'sine'), 100);
}

/**
 * Unlock Web Audio and Speech policies on iOS Safari / Mobile browsers on first gesture
 */
export function unlockMobileAudio() {
  try {
    if ('speechSynthesis' in window) {
      const u = new SpeechSynthesisUtterance('');
      window.speechSynthesis.speak(u);
    }
    // High sub-audible oscillator chime to unlock AudioContext
    playSynthBeep(22000, 0.01);
    console.log('Mobile web audio and voice pipelines successfully authorized.');
  } catch (e) {
    // Silently ignore unlock errors
  }
}
