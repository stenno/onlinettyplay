import { Terminal } from 'xterm';
import { parseStream, createSequence, runSequence } from './stream/TTYStream';
// import BrowserStorage from './storage/BrowserStorage';
import DefaultStorage from './storage/DefaultStorage';

const storage = new DefaultStorage();

const $fileInput = document.querySelector('[type=file]');
const $rowInput = document.querySelector('.dimensions [name=rows]');
const $columnInput = document.querySelector('.dimensions [name=columns]');

const $setDimensionsButton = document.querySelector('.dimensions .setdimensions');
const $loadButton = document.querySelector('.load');
const $runButton = document.querySelector('.run');
const $stopButton = document.querySelector('.stop');
const $loadStatus = document.querySelector('.status');
const $frameCounter = document.querySelector('.frames');

let abortAutoplay = null;
let currentFrame = 0;

const MIN_COLUMNS = 80;
const MIN_ROWS = 24;

$rowInput.value = MIN_ROWS;
$columnInput.value = MIN_COLUMNS;

const term = new Terminal({ rows: MIN_ROWS, columns: MIN_COLUMNS });
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

const getUserDimensions = () => ({
  rows: +$rowInput.value,
  columns: +$columnInput.value,
});

const stopPlayback = (controller, resetFrame) => {
  controller?.abort();
  if (resetFrame) {
    currentFrame = 0;
  }
};

$setDimensionsButton.addEventListener('click', () => {
  const { rows, columns } = getUserDimensions();
  stopPlayback(abortAutoplay);
  $loadStatus.textContent = 'Paused playback';
  term.reset();
  term.resize(Math.max(MIN_COLUMNS, columns), Math.max(MIN_ROWS, rows));
});

$loadButton.addEventListener('click', async () => {
  $loadStatus.textContent = 'Started loading, please wait...';
  const stream = readFromInput();
  parseStream(stream, storage, (bytes, frames) => {
    $loadStatus.textContent = `Done loading ${bytes} bytes / ${frames} frames.`;
    $frameCounter.textContent = currentFrameString(0, storage.frameCount);
  });
});

$stopButton.addEventListener('click', () => {
  $loadStatus.textContent = 'Stopped playback';
  stopPlayback(abortAutoplay, true);
});

$runButton.addEventListener('click', async () => {
  // abort existing sequence
  // this feels very spaghetti, maybe play and pause should just be seperated
  if (abortAutoplay?.signal?.aborted === false) {
    // pause mode
    stopPlayback(abortAutoplay);
    return;
  }
  $loadStatus.textContent = 'Started playback';
  abortAutoplay = new AbortController();
  const sequenceGen = createSequence(storage)(currentFrame)();
  try {
    currentFrame = await runSequence(abortAutoplay, sequenceGen, frameHandler);
  } catch (error) {
    $loadStatus.textContent = 'Paused playback';
  } finally {
    if (currentFrame === storage.frameCount - 1) {
      $loadStatus.textContent = 'Finished playback';
    }
  }
});
