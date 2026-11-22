// A few short synthesized sounds (WebAudio, no files): a blip when a card is
// played, a low thud when damage lands, a rising chime for victory and a
// falling sigh for defeat. Created lazily on the first gesture, so browsers
// that block autoplay stay quiet instead of erroring.
export function createAudio() {
  let context = null;
  let muted = false;

  function ensure() {
    if (!context) {
      try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        context = new AudioContext();
      } catch {
        context = null;
      }
    }
    if (context && context.state === 'suspended') context.resume();
    return context;
  }

  function tone(freq, dur, type, gain, when) {
    const ac = ensure();
    if (!ac || muted) return;
    const osc = ac.createOscillator();
    const amp = ac.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    amp.gain.setValueAtTime(gain, ac.currentTime + when);
    amp.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + when + dur);
    osc.connect(amp);
    amp.connect(ac.destination);
    osc.start(ac.currentTime + when);
    osc.stop(ac.currentTime + when + dur);
  }

  return {
    unlock() {
      ensure();
    },
    toggleMute() {
      muted = !muted;
      return muted;
    },
    isMuted() {
      return muted;
    },
    playCard() {
      tone(520, 0.09, 'triangle', 0.12, 0);
      tone(780, 0.1, 'triangle', 0.1, 0.05);
    },
    damage() {
      tone(140, 0.16, 'sawtooth', 0.14, 0);
    },
    heal() {
      tone(660, 0.12, 'sine', 0.1, 0);
      tone(880, 0.14, 'sine', 0.08, 0.07);
    },
    win() {
      [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.22, 'triangle', 0.12, i * 0.11));
    },
    lose() {
      [392, 330, 262, 196].forEach((f, i) => tone(f, 0.24, 'sine', 0.1, i * 0.12));
    },
  };
}
