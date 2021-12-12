const TTYREC_HEADER_SIZE = 12; // bytes, 3 x Uint32

const delay = (data) => (duration) => (signal) => new Promise((resolve, reject) => {
  const handle = setTimeout(() => resolve(data), duration);
  signal?.addEventListener('abort', () => {
    clearTimeout(handle);
    reject(new Error('aborted'));
  });
});

const splitStream = new TransformStream({ // eslint-disable-line no-undef
  start() {},
  transform(chunk, controller) {
    chunk.forEach((char) => controller.enqueue(char));
  },
});

const rawParserStream = new TransformStream({ // eslint-disable-line no-undef
  start() {
    this.header = null;
    this.headerBuffer = [];
    this.payload = [];
  },
  transform(chunk, controller) {
    if (this.headerBuffer.length < TTYREC_HEADER_SIZE) {
      this.headerBuffer = Uint8Array.from([...this.headerBuffer, chunk]);
      if (this.headerBuffer.length === TTYREC_HEADER_SIZE) {
        const [timestamp, usec, byteLength] = new Uint32Array(this.headerBuffer.buffer);
        this.header = { timestamp, usec, byteLength };
      }
    } else if (this.payload.length < this.header.byteLength) {
      this.payload = Uint8Array.from([...this.payload, chunk]);
      if (this.payload.length === this.header.byteLength) {
        const { header, payload } = this;
        const decoder = new TextDecoder();
        controller.enqueue(JSON.stringify({ header, payload: decoder.decode(payload) }));
        this.headerBuffer = [];
        this.payload = [];
      }
    }
  },
});

const parseStream = async (stream, storageHandler, doneHandler) => stream
  .pipeThrough(new DecompressionStream('gzip')) // eslint-disable-line no-undef
  .pipeThrough(splitStream)
  .pipeThrough(rawParserStream)
  .pipeTo(new WritableStream({
    write(chunk) {
      const { header: { timestamp, usec }, payload } = JSON.parse(chunk);
      const toMillisec = timestamp * 1e3 + Math.floor(usec / 1e3);
      const frame = {
        timestamp: toMillisec,
        payload,
      };
      storageHandler.addFrame(frame);
      console.log('adding');
    },
    close() {
      doneHandler();
    },
    abort() {
      console.log('error');
    }
  }));

// https://eslint.org/docs/rules/no-await-in-loop#when-not-to-use-it
const createSequence = (storageHandler) => (offset) => (limit = Infinity) => async function* () {
  let currentIndex = offset;
  let currentFrame;
  let nextFrame;
  while (currentIndex < limit) {
    // eslint-disable-next-line no-await-in-loop
    currentFrame = await storageHandler.getFrame(currentIndex);
    console.log('createsequence currentFrame', currentFrame);
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
