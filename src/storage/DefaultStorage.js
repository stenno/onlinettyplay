class DefaultStorage {
  frames = [];

  constructor() {
    this.reset();
  }

  async addFrame(frame) {
    this.frames = [...this.frames, frame];
    return frame;
  }

  async getFrame(index) {
    return this.frames[index];
  }

  reset() {
    this.frames = [];
    return true;
  }
}

export default DefaultStorage;
