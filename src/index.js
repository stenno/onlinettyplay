import { Terminal } from 'xterm';

import { parseStream, createSequence, runSequence } from './stream/TTYStream';
// import BrowserStorage from './storage/BrowserStorage';
import DefaultStorage from './storage/DefaultStorage';

const storage = new DefaultStorage();

const $fileInput = document.querySelector('[type=file]');
const $loadButton = document.querySelector('.load');
const $runButton = document.querySelector('.run');
const $stopButton = document.querySelector('.stop');

let abortAutoplay = null;

const term = new Terminal();
term.open(document.querySelector('#terminal'));

const drawHandler = (data) => {
  console.log('draw handler request with', data);
  term.write(data);
};

const readFromInput = () => {
  const { files } = $fileInput;
  return files[0].stream();
};

$loadButton.addEventListener('click', async () => {
  console.log('load button');
  const stream = readFromInput();
  parseStream(stream, storage, () => 'done loading');
});

$stopButton.addEventListener('click', () => {
  abortAutoplay?.abort();
});

$runButton.addEventListener('click', async () => {
  abortAutoplay = new AbortController();
  const sequenceGen = createSequence(storage)(0)(1000);
  const result = await runSequence(abortAutoplay, sequenceGen, drawHandler);
  console.log('done...', result);
});
