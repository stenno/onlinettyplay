class DefaultStorage {
  frames = [];
  frameCount = 0;

  constructor() {
    this.reset();
  }

  async addFrame(frame) {
    this.frames = [...this.frames, frame];
    this.frameCount = this.frames.length;
    return frame;
  }

  async addFrames(frames) {
    this.frames = [...this.frames, ...frames];
    this.frameCount = this.frames.length;
    return frames;
  }

  async getFrame(index) {
    return this.frames[index];
  }

  reset() {
    this.frames = [];
    this.frameCount = 0;
    return true;
  }
}

export default DefaultStorage;
