// this whole thing needs serious refactoring - don't worry about it
const databaseName = 'ttyrec';
const storeName = 'frames';
const snapshotStoreName = 'snapshots';
class FrameStorage {
  constructor() {
    this.db = null;
    this.databaseName = databaseName;
    this.storeName = storeName;
    this.snapshotStoreName = snapshotStoreName;
  }

  static async openDB() {
    const request = indexedDB.open(databaseName, 1);
    request.onupgradeneeded = (evt) => {
      const store = evt.currentTarget.result.createObjectStore(storeName, {
        keyPath: 'lastIndex',
        autoIncrement: false,
      });
      store.createIndex('lastIndex', 'lastIndex', { unique: true });
      store.createIndex('payloadOffset', 'payloadOffset', { unique: true });
      store.createIndex('byteLength', 'byteLength', { unique: false });
      const snapshotStore = evt.currentTarget.result.createObjectStore(snapshotStoreName, {
        keyPath: 'index',
        autoIncrement: false,
      });
      snapshotStore.createIndex('index', 'index', { unique: true });
    };
    return new Promise((resolve, reject) => {
      request.onsuccess = function () {
        const db = this.result;
        resolve(db);
      };
      request.onerror = function (error) {
        reject(error);
      };
    });
  }

  getStore(frameStoreName, mode) {
    const transaction = this.db.transaction(frameStoreName, mode);
    return transaction.objectStore(frameStoreName);
  }

  async getKeys() {
    const store = this.getStore(this.storeName, 'readwrite');
    const request = store.getAllKeys();
    return new Promise((resolve, reject) => {
      request.onsuccess = (event) => resolve(event.currentTarget.result);
      request.onerror = (error) => reject(error);
    });
  }

  async clearStore() {
    const store = this.getStore(this.storeName, 'readwrite');
    const request = store.clear();
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(true);
      request.onerror = (error) => reject(error);
    });
  }

  async clearSnapshotStore() {
    const store = this.getStore(this.snapshotStoreName, 'readwrite');
    const request = store.clear();
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(true);
      request.onerror = (error) => reject(error);
    });
  }

  async addToStore(frameChunk) {
    const store = this.getStore(this.storeName, 'readwrite');
    const request = store.add(frameChunk);
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(true);
      request.onerror = (error) => reject(error);
    });
  }

  async addToSnapshotStore(snapshot) {
    const store = this.getStore(this.snapshotStoreName, 'readwrite');
    const request = store.add(snapshot);
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(true);
      request.onerror = (error) => reject(error);
    });
  }

  async getChunkForIndex(index) {
    const store = this.getStore(this.storeName, 'readonly');
    const range = IDBKeyRange.lowerBound(index);
    const request = store.index('lastIndex').get(range);
    return new Promise((resolve, reject) => {
      request.onsuccess = (event) => resolve(event.currentTarget.result);
      request.onerror = (error) => reject(error);
    });
  }

  async getSnapshot(chunkIndex) {
    const store = this.getStore(this.snapshotStoreName, 'readonly');
    const request = store.get(chunkIndex);
    return new Promise((resolve, reject) => {
      request.onsuccess = (event) => resolve(event.currentTarget.result);
      request.onerror = (error) => reject(error);
    });
  }

  async getFramedata(frameIndex) {
    const { lastIndex, tempPayload, frames } = await this.getChunkForIndex(frameIndex);
    const { payloadOffset, timestamp, byteLength } = frames.find(({ index }) => index === frameIndex) ?? {};
    if (payloadOffset === undefined) {
      return Promise.reject();
    }
    const snapshot = await this.getSnapshot(lastIndex);
    return ({
      snapshot,
      tempPayload,
      payloadOffset,
      timestamp,
      byteLength,
    });
  }

  async createCheckpoint(index, prevState, maxRows, maxCols) {
    const chunk = await this.getChunkForIndex(index);
    const checkpointWorker = new Worker(new URL('../workers/checkpoint.js', import.meta.url));
    return new Promise((resolve) => {
      checkpointWorker.onmessage = ({ data }) => {
        checkpointWorker.terminate();
        resolve(data);
      };
      const msgObject = {
        prevState,
        chunk: chunk.tempPayload,
        maxRows,
        maxCols,
      };
      checkpointWorker.postMessage(msgObject);
    });
  }

  async createSnapshots(rows, columns) {
    const indices = await this.getKeys();
    let prevState = null;
    for (const index of indices) {
      prevState = await this.createCheckpoint(index, prevState, rows, columns);
      await this.addToSnapshotStore({index, snapshot: prevState});
    }
    return indices.length;
  }
}

export {
  FrameStorage,
};
