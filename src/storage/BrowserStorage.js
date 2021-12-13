import DefaultStorage from './DefaultStorage';

const defaultPrefix = 'ttyrec';

class BrowserStorage extends DefaultStorage {
  constructor(prefix = defaultPrefix) {
    super();
    this.storagePrefix = prefix;
  }

  getStorageKey(index) {
    const { storagePrefix } = this;
    return `${storagePrefix}.${index}`;
  }

  async addFrame(frame) {
    const { frameCount } = this;
    const key = this.getStorageKey(frameCount);
    // i am aware of Storage.key but don't want to rely on it
    localStorage.setItem(key, JSON.stringify(frame));
    this.frameCount += 1;
    return frame;
  }

  getFrame(index) {
    const key = this.getStorageKey(index);
    const item = JSON.parse(localStorage.getItem(key));
    return item;
  }

  reset() {
    this.frameCount = 0;
    localStorage.clear();
  }
}

export default BrowserStorage;
