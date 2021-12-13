import { Terminal } from 'xterm';

import { parseStream, createSequence, runSequence } from './stream/TTYStream';
// import BrowserStorage from './storage/BrowserStorage';
import DefaultStorage from './storage/DefaultStorage';

const storage = new DefaultStorage();

const $fileInput = document.querySelector('[type=file]');
const $loadButton = document.querySelector('.load');
const $runButton = document.querySelector('.run');
const $stopButton = document.querySelector('.stop');
const $loadStatus = document.querySelector('.status');
const $frameCounter = document.querySelector('.frames');

let abortAutoplay = null;
let currentFrame = 0;

const term = new Terminal();
term.open(document.querySelector('#terminal'));

const currentFrameString = (current, max) => `Frame: ${current}/${max}`;

const frameHandler = ({ index, payload }) => {
  const { frameCount } = storage;
  $frameCounter.textContent = currentFrameString(index, frameCount);
  term.write(payload);
};

const readFromInput = () => {
  const { files } = $fileInput;
  return files[0].stream();
};

$loadButton.addEventListener('click', async () => {
  $loadStatus.textContent = 'Started loading, please wait...';
  const stream = readFromInput();
  parseStream(stream, storage, (bytes) => {
    $loadStatus.textContent = `Done loading ${bytes} bytes.`;
    $frameCounter.textContent = currentFrameString(0, storage.frameCount);
  });
});

$stopButton.addEventListener('click', () => {
  $loadStatus.textContent = 'Stopped playback';
  abortAutoplay?.abort();
  currentFrame = 0;
});

$runButton.addEventListener('click', async () => {
  // abort existing sequence
  if (abortAutoplay?.signal?.aborted === false) {
    // pause mode
    $loadStatus.textContent = 'Paused playback';
    abortAutoplay?.abort();
    return;
  }
  $loadStatus.textContent = 'Started playback';
  abortAutoplay = new AbortController();
  const sequenceGen = createSequence(storage)(currentFrame)();
  currentFrame = await runSequence(abortAutoplay, sequenceGen, frameHandler);
  if (currentFrame === storage.frameCount - 1) {
    $loadStatus.textContent = 'Finished playback';
  }
});
