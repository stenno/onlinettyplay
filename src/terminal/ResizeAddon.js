const handleResize = (injTerm, callback) => () => {
  const term = injTerm;
  const buffer = term.buffer.active;
  const extendRows = buffer.viewportY;
  const newRows = Math.max(term.rows, term.rows + extendRows);
  if (term.rows < newRows) {
    const oldWrite = term.write;
    term.write = () => 0;
    term.reset();
    term.resize(term.cols, newRows);
    callback(term);
    term.write = oldWrite;
  }
};

class ResizeAddon {
  terminal = null;

  disposables = [];

  constructor(callback = () => 0) {
    this.callback = callback;
  }

  activate(terminal) {
    this.terminal = terminal;
    this.disposables.push(this.terminal.onLineFeed(handleResize(this.terminal, this.callback)));
  }

  dispose() {
    this.disposables.forEach((d) => d.dispose());
  }
}

export default ResizeAddon;
