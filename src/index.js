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

let abortAutoplay = null;

const term = new Terminal();
term.open(document.querySelector('#terminal'));

const drawHandler = (data) => {
  term.write(data);
};

const readFromInput = () => {
  const { files } = $fileInput;
  return files[0].stream();
};

$loadButton.addEventListener('click', async () => {
  $loadStatus.textContent = 'Started loading, please wait...';
  const stream = readFromInput();
  parseStream(stream, storage, (bytes) => { $loadStatus.textContent = `Done loading ${bytes} bytes.`; });
});

$stopButton.addEventListener('click', () => {
  $loadStatus.textContent = 'Stopped playback';
  abortAutoplay?.abort();
});

$runButton.addEventListener('click', async () => {
  $loadStatus.textContent = 'Started playback';
  abortAutoplay = new AbortController();
  const sequenceGen = createSequence(storage)(0)();
  await runSequence(abortAutoplay, sequenceGen, drawHandler);
  $loadStatus.textContent = 'Finished playback';
});
