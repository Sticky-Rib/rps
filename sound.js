// ============================
// Audio Engine for RPS Game
// ----------------------------
// This module handles background loops, sprite-based ambient sounds,
// and dynamic audio mixing based on game state.
// All code was integrated, understood, and tested by Simon Nitschke.
// ChatGPT was used as a coding assistant for clarity, learning, and structure.
// ============================

const audioContext = new (window.AudioContext || window.webkitAudioContext)();

const ambientTracks = {}; // Store ambient tracks like background music
const gainNodes = {}; // Store gain nodes for each sprite sound type
const backgroundTracks = [ // icons using emojis
  { file: 'assets/background_loop.wav', icon: '🔈1' },
  { file: 'assets/background_loop_alt1.wav', icon: '🔈2' },
  { file: 'assets/silent_loop.wav', icon: '🔇' }
];

let soundInitialised = false;
let currentBackgroundIndex = 0;

// =========================================
// Internal helper functions
// =========================================

async function loadAndLoop(name, url, volume = 0) { // Core function to load and loop sound tracks
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
}

function mapSpeedToPlaybackRate(speed) { // Map the background sound speed to the slider value
  const minSpeed = 0.1;
  const maxSpeed = 3.0;
  const t = (speed - minSpeed) / (maxSpeed - minSpeed);
  const eased = 0.5 + 0.25 * Math.sin((t - 0.5) * Math.PI); // Make the mapping non-linear
  return 0.95 + eased * 0.2;
}

// =========================================
// Export functions called in other modules
// =========================================

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

export function updateSoundMix(speedMultiplier, rockCount, paperCount, scissorsCount) { // Update the sound mix based on sprite counts
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

  ['rock', 'paper', 'scissors'].forEach(type => { // Adjust the number of sprites where the sound fades in
    const ratio = ratios[type];
    const target = Math.max(0, (ratio - 0.5) * 2);
    const maxVolume = 0.5;
    const desiredVolume = Math.min(target * maxVolume, maxVolume);

    const current = gainNodes[type].gain.value;
    gainNodes[type].gain.value += (desiredVolume - current) * 0.05;
  });

  // Adjust playback rate of background only if unmuted
  const source = ambientTracks['background'];
  if (source && gainNodes['background']?.gain.value > 0.001) {
    const targetRate = mapSpeedToPlaybackRate(speedMultiplier);
    source.playbackRate.value += (targetRate - source.playbackRate.value) * 0.05;
  }
}

export async function cycleBackgroundTrack() { // Cycle through background tracks
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

  console.log('🎵 Switching background to:', file); // added for debugging
  await loadAndLoop('background', file, file.includes('silent') ? 0 : 0.25);

  return icon;
}

export async function playVictorySound() { // Play a victory sound when the game ends
  try {
    const res = await fetch('assets/victory.wav');
    const buf = await res.arrayBuffer();
    const decoded = await audioContext.decodeAudioData(buf);

    const source = audioContext.createBufferSource();
    source.buffer = decoded;

    const gain = audioContext.createGain();
    gain.gain.setValueAtTime(0.05, audioContext.currentTime); // Really quiet for fanefare track - may need to adjust if changed

    source.connect(gain);
    gain.connect(audioContext.destination);

    source.start(audioContext.currentTime);
  } catch (err) {
    console.warn('⚠️ Could not play victory sound:', err);
  }
}

export function silenceSpriteLoops() { // Stop the sprite sound when the simulation stops
  ['rock', 'paper', 'scissors'].forEach(type => {
    if (gainNodes[type]) {
      gainNodes[type].gain.setValueAtTime(0, audioContext.currentTime);
    }
  });
}

export async function preloadAudioAssets() {
  const preloadList = [
    'assets/background_loop.wav',
    'assets/background_loop_alt1.wav',
    'assets/silent_loop.wav',
    'assets/rock_loop.wav',
    'assets/paper_loop.wav',
    'assets/scissors_loop.wav',
    'assets/victory.wav'
  ];

  for (const file of preloadList) {
    try {
      const res = await fetch(file);
      const buf = await res.arrayBuffer();
      await audioContext.decodeAudioData(buf);
      console.log(`📦 Preloaded: ${file}`);
    } catch (err) {
      console.warn(`⚠️ Failed to preload ${file}`, err);
    }
  }
}