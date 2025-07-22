const audioContext = new (window.AudioContext || window.webkitAudioContext)();

const ambientTracks = {};
const gainNodes = {};
let backgroundMuted = false;
let soundInitialised = false;

const backgroundTracks = [
  { file: 'assets/background_loop.wav', icon: '🔈1' },
  { file: 'assets/background_loop_alt1.wav', icon: '🔈2' },
  { file: 'assets/silent_loop.wav', icon: '🔇' }
];

let currentBackgroundIndex = 0;

export async function initSound() {

  if (soundInitialised) return;  // prevent double-load
  soundInitialised = true;

  if (audioContext.state === 'suspended') {
    await audioContext.resume();
  }

  if (!ambientTracks['background']) {
    await loadAndLoop('background', 'assets/background_loop.wav', 0);
    const now = audioContext.currentTime;
    gainNodes['background'].gain.setValueAtTime(0, now);
    gainNodes['background'].gain.linearRampToValueAtTime(0.25, now + 2);
  }

  if (!gainNodes['rock']) await loadAndLoop('rock', 'assets/rock_loop.wav');
  if (!gainNodes['paper']) await loadAndLoop('paper', 'assets/paper_loop.wav');
  if (!gainNodes['scissors']) await loadAndLoop('scissors', 'assets/scissors_loop.wav');
}

async function loadAndLoop(name, url, volume = 0) {
  console.log(`🔁 loadAndLoop: ${name} → ${url}`);
  const res = await fetch(url);
  const buf = await res.arrayBuffer();
  const decoded = await audioContext.decodeAudioData(buf);

  const source = audioContext.createBufferSource();
  source.buffer = decoded;
  source.loop = true;

  const gain = audioContext.createGain();
  gain.gain.value = volume;

  source.connect(gain).connect(audioContext.destination);
  source.start();

  ambientTracks[name] = source;
  gainNodes[name] = gain;

  return source;
}

function mapSpeedToPlaybackRate(speed) {
  const minSpeed = 0.2;
  const maxSpeed = 3.0;
  const t = (speed - minSpeed) / (maxSpeed - minSpeed);
  const eased = 0.5 + 0.25 * Math.sin((t - 0.5) * Math.PI);
  return 0.95 + eased * 0.2;
}

export function updateSoundMix(speedMultiplier, rockCount, paperCount, scissorsCount) {
  if (
    !ambientTracks['background'] ||
    !gainNodes.rock ||
    !gainNodes.paper ||
    !gainNodes.scissors
  ) return;

  const total = rockCount + paperCount + scissorsCount;
  if (total === 0) return;

  const ratios = {
    rock: rockCount / total,
    paper: paperCount / total,
    scissors: scissorsCount / total
  };

  ['rock', 'paper', 'scissors'].forEach(type => {
    const ratio = ratios[type];
    const target = Math.max(0, (ratio - 0.5) * 2);
    const maxVolume = 0.5;
    const desiredVolume = Math.min(target * maxVolume, maxVolume);

    const current = gainNodes[type].gain.value;
    gainNodes[type].gain.value += (desiredVolume - current) * 0.05;
  });

  // Adjust playback rate of background only if unmuted
  const source = ambientTracks['background'];
  if (!backgroundMuted && source && gainNodes['background']?.gain.value > 0.001) {
    const targetRate = mapSpeedToPlaybackRate(speedMultiplier);
    source.playbackRate.value += (targetRate - source.playbackRate.value) * 0.05;
  }
}

export async function cycleBackgroundTrack() {
  currentBackgroundIndex = (currentBackgroundIndex + 1) % backgroundTracks.length;
  const { file, icon } = backgroundTracks[currentBackgroundIndex];

  // Stop and disconnect existing background track
  if (ambientTracks['background']) {
    try {
      ambientTracks['background'].stop();
      ambientTracks['background'].disconnect();
    } catch (e) {}
    delete ambientTracks['background'];
  }

  if (gainNodes['background']) {
    try {
      gainNodes['background'].disconnect();
    } catch (e) {}
    delete gainNodes['background'];
  }

  console.log('🎵 Switching background to:', file);
  await loadAndLoop('background', file, file.includes('silent') ? 0 : 0.25);

  return icon;
}

export async function playVictorySound() {
  try {
    const res = await fetch('assets/victory.wav');
    const buf = await res.arrayBuffer();
    const decoded = await audioContext.decodeAudioData(buf);

    const source = audioContext.createBufferSource();
    source.buffer = decoded;

    const gain = audioContext.createGain();
    gain.gain.setValueAtTime(0.05, audioContext.currentTime);

    source.connect(gain);
    gain.connect(audioContext.destination);

    source.start(audioContext.currentTime);
  } catch (err) {
    console.warn('⚠️ Could not play victory sound:', err);
  }
}

export function silenceSpriteLoops() {
  ['rock', 'paper', 'scissors'].forEach(type => {
    if (gainNodes[type]) {
      gainNodes[type].gain.setValueAtTime(0, audioContext.currentTime);
    }
  });
}

