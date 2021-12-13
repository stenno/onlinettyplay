const TTYREC_HEADER_SIZE = 12; // bytes, 3 x Uint32

const delay = (data) => (duration) => (signal) => new Promise((resolve, reject) => {
  const handle = setTimeout(() => resolve(data), duration);
  signal?.addEventListener('abort', () => {
    clearTimeout(handle);
    reject(new Error('aborted'));
  });
});

// eslint-disable-next-line no-undef
const decompress = (stream) => stream.pipeThrough(new DecompressionStream('gzip'));
const parseHeader = (buffer) => {
  const [timestamp, usec, byteLength] = new Uint32Array(buffer);
  return ({ timestamp, usec, byteLength });
};

const parseStream = async (stream, storageHandler, doneHandler) => {
  const decompressed = decompress(stream);
  const buffer = await new Response(decompressed).arrayBuffer();
  const { byteLength: bufferLength } = buffer;
  let offset = 0;
  const decoder = new TextDecoder();
  while (offset < bufferLength) {
    const payloadOffset = offset + TTYREC_HEADER_SIZE;
    const { timestamp, usec, byteLength } = parseHeader(buffer.slice(offset, payloadOffset));
    const payloadBuffer = buffer.slice(payloadOffset, payloadOffset + byteLength);
    const payload = decoder.decode(new Uint8Array(payloadBuffer));
    const toMillisec = timestamp * 1e3 + Math.floor(usec / 1e3);
    const frame = {
      timestamp: toMillisec,
      payload,
    };
    storageHandler.addFrame(frame);
    offset += TTYREC_HEADER_SIZE + byteLength;
  }
  return doneHandler(bufferLength);
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

const runSequence = async (controller, sequence, drawHandler) => {
  const { signal } = controller;
  // eslint-disable-next-line no-restricted-syntax
  for await (const { index, payload, duration } of sequence()) {
    try {
      drawHandler(payload);
      await delay(index)(duration)(signal);
    } catch (e) {
      console.log(e);
      break;
    }
  }
};

export {
  parseStream,
  createSequence,
  runSequence,
};
