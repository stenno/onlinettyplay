const delay = (data) => (duration) => (signal) => new Promise((resolve, reject) => {
  const handle = setTimeout(() => resolve(data), duration);
  signal?.addEventListener('abort', () => {
    clearTimeout(handle);
    reject(new Error('aborted'));
  });
});

// eslint-disable-next-line no-undef
const decompress = (stream) => stream.pipeThrough(new DecompressionStream('gzip'));

const parseStream = async (stream, storageHandler, doneHandler) => {
  const decompressed = decompress(stream);
  const buffer = await new Response(decompressed).arrayBuffer();
  const { byteLength } = buffer;
  const worker = new Worker(new URL('../workers/parseTTY.js', import.meta.url));
  worker.onmessage = ({ data: frames }) => {
    if (frames === 'done') {
      doneHandler(byteLength, storageHandler.frameCount);
      worker.terminate();
    }
    storageHandler.addFrames(frames);
  };
  worker.postMessage(buffer, [buffer]);
};

// https://eslint.org/docs/rules/no-await-in-loop#when-not-to-use-it
const createSequence = (storageHandler) => (offset) => (limit = Infinity) => async function* () {
  let currentIndex = offset;
  let currentFrame;
  let nextFrame;
  while (currentIndex < limit) {
    // eslint-disable-next-line no-await-in-loop
    currentFrame = await storageHandler.getFrame(currentIndex);
    if (currentFrame === null) {
      break; // be graceful for now
    }
    // eslint-disable-next-line no-await-in-loop
    nextFrame = await storageHandler.getFrame(currentIndex + 1);
    const { payload, timestamp } = currentFrame;
    const { timestamp: nextTimestamp } = nextFrame ?? {};
    const duration = (nextTimestamp ?? timestamp) - timestamp;
    yield { index: currentIndex, payload, duration };
    currentIndex += 1;
  }
};

const runSequence = async (controller, sequence, frameHandler) => {
  const { signal } = controller;
  // eslint-disable-next-line no-restricted-syntax
  for await (const frame of sequence()) {
    const { index, duration } = frame;
    try {
      frameHandler(frame);
      await delay(index)(duration)(signal);
    } catch (e) { // this handles abortcontroller exceptions
      return index;
    }
  }
  return 0;
};

export {
  parseStream,
  createSequence,
  runSequence,
};
