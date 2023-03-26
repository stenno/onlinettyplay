const { DecompressionStream: GzipStream } = require('@stardazed/streams-compression');
const { FrameStorage } = require('../storage/FrameStorage');

// const delay = (data) => (duration) => (signal) => new Promise((resolve, reject) => {
//   const handle = setTimeout(() => resolve(data), duration);
//   signal?.addEventListener('abort', () => {
//     clearTimeout(handle);
//     reject(new Error('aborted'));
//   });
// });

class Parser extends EventTarget {
  constructor() {
    super();
    this.stream = null;
    this.withDecompression = false;
    this.storage = new FrameStorage();
  }

  setDB(database) {
    this.storage.db = database;
  }

  static decompress(stream) {
    return stream.pipeThrough(new GzipStream('gzip'));
  }

  triggerChunkParsed(index) {
    const evt = new CustomEvent('parser:chunk', { detail: index });
    this.dispatchEvent(evt);
  }

  triggerDoneParsing(bytes, frames) {
    const evt = new CustomEvent('parser:done', { detail: [bytes, frames] });
    this.dispatchEvent(evt);
  }

  async createAllSnapshots(rows, columns) {
    const snapshots = await this.storage.createSnapshots(rows, columns);
    return snapshots;
  }

  async getFrame(index) {
    const framedata = await this.storage.getFramedata(index);
    const worker = new Worker(new URL('../workers/parseFrame.js', import.meta.url));
    return new Promise((resolve) => {
      worker.onmessage = ({ data: frame }) => {
        worker.terminate();
        resolve(frame);
      };
      worker.postMessage(framedata);
    });
  }

  async parse(chunksize) {
    const database = await FrameStorage.openDB();
    this.setDB(database);
    await this.storage.clearStore();
    await this.storage.clearSnapshotStore();
    const maybeDecompressed = this.withDecompression ? Parser.decompress(this.stream) : this.stream;
    const buffer = await new Response(maybeDecompressed).arrayBuffer();
    const { byteLength } = buffer;
    const worker = new Worker(new URL('../workers/parseTTY.js', import.meta.url));
    worker.onmessage = ({ data: frames }) => {
      if (frames[0] === 'done') {
        this.triggerDoneParsing(byteLength, frames[1]);
        worker.terminate();
      } else {
        this.triggerChunkParsed(frames.lastIndex);
        this.storage.addToStore(frames);
      }
    };
    // worker.postMessage(buffer, [buffer]);
    worker.postMessage({ buffer, chunksize });
  }
}

export {
  Parser,
};
