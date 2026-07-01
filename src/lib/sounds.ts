// Web Audio API sound effects — no audio files needed
let ctx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
	if (typeof window === 'undefined') return null;
	if (!ctx) {
		try {
			ctx = new AudioContext();
		} catch {
			return null;
		}
	}
	// Resume if suspended (CORS autoplay policy)
	if (ctx.state === 'suspended') {
		ctx.resume();
	}
	return ctx;
}

function playTone(frequency: number, duration: number, type: OscillatorType = 'sine', volume = 0.15) {
	const ac = getAudioContext();
	if (!ac) return;
	const osc = ac.createOscillator();
	const gain = ac.createGain();
	osc.type = type;
	osc.frequency.value = frequency;
	gain.gain.setValueAtTime(volume, ac.currentTime);
	gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + duration);
	osc.connect(gain);
	gain.connect(ac.destination);
	osc.start(ac.currentTime);
	osc.stop(ac.currentTime + duration);
}

function playNoise(duration: number, volume = 0.08) {
	const ac = getAudioContext();
	if (!ac) return;
	const bufferSize = ac.sampleRate * duration;
	const buffer = ac.createBuffer(1, bufferSize, ac.sampleRate);
	const data = buffer.getChannelData(0);
	for (let i = 0; i < bufferSize; i++) {
		data[i] = Math.random() * 2 - 1;
	}
	const source = ac.createBufferSource();
	source.buffer = buffer;
	const gain = ac.createGain();
	gain.gain.setValueAtTime(volume, ac.currentTime);
	gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + duration);
	source.connect(gain);
	gain.connect(ac.destination);
	source.start();
}

/** Play a subtle pop sound when selecting an answer */
export function playSelect() {
	playTone(600, 0.08, 'sine', 0.1);
}

/** Play a rising chime when answer is correct */
export function playCorrect() {
	const ac = getAudioContext();
	if (!ac) return;
	// Two ascending notes
	playTone(523, 0.12, 'sine', 0.12);
	setTimeout(() => playTone(659, 0.15, 'sine', 0.12), 100);
}

/** Play a short buzz when answer is wrong */
export function playWrong() {
	playTone(180, 0.25, 'square', 0.08);
	playNoise(0.15, 0.05);
}

/** Play a celebratory fanfare on quiz completion */
export function playComplete() {
	const notes = [523, 659, 784, 1047];
	notes.forEach((freq, i) => {
		setTimeout(() => playTone(freq, 0.25, 'sine', 0.12), i * 120);
	});
}
