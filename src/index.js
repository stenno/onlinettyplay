import { Parser } from './stream/Parser';
import './style.css';

const $fileInput = document.querySelector('[type=file]');
const $loadButton = document.querySelector('.load');
const $urlInput = document.querySelector('input[name=url]');
const $urlButton = document.querySelector('button.download');
const $maxRowsInput = document.querySelector('[name=maxrows]');
const $maxColsInput = document.querySelector('[name=maxcols]');
const $jumpInput = document.querySelector('input[name=jump]');
const $jumpButton = document.querySelector('button.dojump');
const $useGzipCheckbox = document.querySelector('[name=use-gzip]');
const $chunkSizeInput = document.querySelector('input[name=chunksize]');
const $debug = document.querySelector('.debug-container > textarea');
const $terminalOutput = document.querySelector('#terminal');

const parser = new Parser();

const debugLog = (message) => {
  $debug.value += `${Date.now()} ${message}\r\n`;
  return $debug.value;
};

const readFromInput = () => {
  const { files } = $fileInput;
  return files[0].stream();
};

const loadCB = async (bytes, frames, starttime) => {
  const now = Date.now();
  debugLog(`Done indexing ${bytes} bytes: ${frames} frames (${now - starttime} ms)`);
  const maxRows = $maxRowsInput.value;
  const maxCols = $maxColsInput.value;
  const numSnapshots = await parser.createAllSnapshots(+maxRows, +maxCols);
  debugLog(`Done creating ${numSnapshots} snapshots (${Date.now() - now} ms)`);
};

$loadButton.addEventListener('click', async () => {
  const starttime = Date.now();
  debugLog('Started loading');
  const withDecompression = $useGzipCheckbox.checked;
  const chunkSize = $chunkSizeInput.value;
  const stream = readFromInput();
  parser.stream = stream;
  parser.withDecompression = withDecompression;
  parser.addEventListener('parser:done', ({ detail: [bytes, frames] }) => loadCB(bytes, frames, starttime));
  parser.parse(+chunkSize);
});

$urlButton.addEventListener('click', async () => {
  debugLog('Started downloading');
  const starttime = Date.now();
  try {
    const url = $urlInput.value;
    const response = await fetch(url).then((resp) => resp.body);
    const withDecompression = $useGzipCheckbox.checked;
    parser.stream = response;
    parser.withDecompression = withDecompression;
    parser.addEventListener('parser:done', ({ detail: [bytes, frames] }) => loadCB(bytes, frames, starttime));
  } catch (err) {
    debugLog('Error loading from URL');
  }
});

$jumpButton.addEventListener('click', async () => {
  const now = Date.now();
  const frame = $jumpInput.value;
  const framedata = await parser.getFrame(+frame);
  $terminalOutput.innerHTML = framedata.join('\n');
  debugLog(`Jumped to frame ${frame} (${Date.now() - now} ms)`);
});
