import DefaultStorage from './storage/DefaultStorage';
import { parseStream, createSequence, runSequence } from './stream/TTYStream';

const { Terminal } = require('xterm');

// import BrowserStorage from './storage/BrowserStorage';

const AnsiParser = require('node-ansiparser');

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
const $urlInput = document.querySelector('input[name=url]');
const $urlButton = document.querySelector('.url-loader button');
const $useGzipCheckbox = document.querySelector('[name=use-gzip]');

const ResizeAddon = require('./terminal/ResizeAddon').default;

let abortAutoplay = null;
let currentFrame = 0;

const MIN_COLUMNS = 80;
const MIN_ROWS = 24;

$rowInput.value = MIN_ROWS;
$columnInput.value = MIN_COLUMNS;

const term = new Terminal({ rows: MIN_ROWS, columns: MIN_COLUMNS });

term.open(document.querySelector('#terminal'));
term.loadAddon(new ResizeAddon());

const parseCols = (dataStr) => {
  let newCols = 0;
  const colTerm = {
    inst_p: (data) => {
      newCols = data.length;
    },
  };
  const parser = new AnsiParser(colTerm);
  parser.parse(dataStr);
  return newCols;
};

const currentFrameString = (current, max) => `Frame: ${current}/${max}`;

const frameHandler = ({ index, payload }) => {
  const { frameCount } = storage;
  $frameCounter.textContent = currentFrameString(index, frameCount);
  const newCols = Math.max(term.cols, parseCols(payload));
  term.write(payload);
  if (newCols > term.cols) {
    term.reset();
    term.resize(newCols, term.rows);
  }
};

const readFromInput = () => {
  const { files } = $fileInput;
  return files[0].stream();
};

const loadCB = (bytes, frames) => {
  $loadStatus.textContent = `Done loading ${bytes} bytes / ${frames} frames.`;
  $frameCounter.textContent = currentFrameString(0, storage.frameCount);
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
  const withDecompression = $useGzipCheckbox.checked;
  const stream = readFromInput();
  parseStream(stream, withDecompression, storage, loadCB);
});

$urlButton.addEventListener('click', async () => {
  $loadStatus.textContent = 'Started downloading, please wait...';
  try {
    const url = $urlInput.value;
    const response = await fetch(url).then((resp) => resp.body);
    const withDecompression = $useGzipCheckbox.checked;
    parseStream(response, withDecompression, storage, loadCB);
  } catch (err) {
    $loadStatus.textContent = 'Error loading from URL';
  }
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
