const audioContext = new (window.AudioContext || window.webkitAudioContext)();

const ambientTracks = {};
const gainNodes = {};
let nervousSource = null;

export async function initSound() {
  if (audioContext.state === 'suspended') {
    await audioContext.resume();
  }

  // Load nervous background loop
  nervousSource = await loadAndLoop('nervous', 'assets/nervous_loop.wav', 0.4);

  // Load dominance loops at 0 volume
  await loadAndLoop('rock', 'assets/rock_loop.wav');
  await loadAndLoop('paper', 'assets/paper_loop.wav');
  await loadAndLoop('scissors', 'assets/scissors_loop.wav');
}

async function loadAndLoop(name, url, volume = 0) {
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
  const eased = 0.5 + 0.25 * Math.sin((t - 0.5) * Math.PI);  // ease-in-out
  return 0.95 + eased * 0.2;
}

export function updateSoundMix(speedMultiplier, rockCount, paperCount, scissorsCount) {
  if (!nervousSource || !gainNodes.rock) return;

  const total = rockCount + paperCount + scissorsCount;
  if (total === 0) return;

  const ratios = {
    rock: rockCount / total,
    paper: paperCount / total,
    scissors: scissorsCount / total
  };

  const maxType = Object.entries(ratios).sort((a, b) => b[1] - a[1])[0][0];

  ['rock', 'paper', 'scissors'].forEach(type => {
    const target = type === maxType ? 0.5 : 0;
    const current = gainNodes[type].gain.value;
    gainNodes[type].gain.value += (target - current) * 0.05;
  });

  // Adjust nervous playback rate subtly
  const targetRate = mapSpeedToPlaybackRate(speedMultiplier);
  nervousSource.playbackRate.value += (targetRate - nervousSource.playbackRate.value) * 0.05;
}
