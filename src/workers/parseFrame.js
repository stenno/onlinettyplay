const AnsiParser = require('node-ansiparser');
const { ExtendedAnsiTerminal } = require('../terminal/ExtendedAnsiTerminal');
self.onmessage = ({ data }) => {
    const { snapshot, tempPayload: payload, payloadOffset: offset, byteLength } = data;
    const term = ExtendedAnsiTerminal.deserialize(snapshot.snapshot);
    const parser = new AnsiParser(term);
    const reqPayload = payload.slice(0, offset + byteLength);
    parser.parse(reqPayload);
    const rows = term.screen.buffer.map((row) => row.toHTML());
    self.postMessage(rows);
};