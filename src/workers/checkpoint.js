const AnsiParser = require('node-ansiparser');
const { ExtendedAnsiTerminal } = require('../terminal/ExtendedAnsiTerminal');

self.onmessage = ({ data }) => {
  const { prevState, chunk, maxRows = 24, maxCols = 80 } = data;
  const term = prevState ? ExtendedAnsiTerminal.deserialize(prevState) : (new ExtendedAnsiTerminal(maxCols, maxRows,0));
  term.reflow = true; // this does not do anything yet
  const parser = new AnsiParser(term);
  parser.parse(chunk);
  const clone = term.serialize();
  self.postMessage(clone);
};
