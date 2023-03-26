const cp437 = require('../terminal/cp437.json');

const TTYREC_HEADER_SIZE = 12; // bytes, 3 x Uint32
const parseHeader = (buffer) => {
  const [timestamp, usec, byteLength] = new Uint32Array(buffer);
  return ({ timestamp, usec, byteLength });
};
const ibmToUnicode = (buffer) => Array.from(buffer, (c) => cp437[c] ?? String.fromCharCode(c)).join('');
/* eslint-disable-next-line no-restricted-globals */
self.onmessage = (e) => {
  const {buffer, chunksize} = e.data;
  const { byteLength: bufferLength } = buffer;
  let offset = 0;
  let tempPayloadOffset = 0;
  let frames = [];
  let index = 0;
  let tempPayload = '';
  // let's be honest, this code is super ugly.
  while (offset < bufferLength) {
    const payloadOffset = offset + TTYREC_HEADER_SIZE;
    const { timestamp, usec, byteLength } = parseHeader(buffer.slice(offset, payloadOffset));
    const payloadBuffer = buffer.slice(payloadOffset, payloadOffset + byteLength);

    const payload = ibmToUnicode(new Uint8Array(payloadBuffer));
    const toMillisec = timestamp * 1e3 + Math.floor(usec / 1e3);
    const frame = {
      timestamp: toMillisec,
      payloadOffset: tempPayloadOffset,
      offset,
      byteLength,
      index,
    };
    frames.push(frame);
    tempPayload += payload;
    tempPayloadOffset += byteLength;
    index += 1;
    if (frames.length >= chunksize) {
      self.postMessage({
        frames,
        tempPayload,
        lastIndex: index,
      });
      frames = [];
      tempPayload = '';
      tempPayloadOffset = 0;
    }
    offset += TTYREC_HEADER_SIZE + byteLength;
  }
  self.postMessage({
    frames,
    tempPayload,
    lastIndex: index,
  });
  self.postMessage(['done', index]); /* eslint-disable-line no-restricted-globals */
};
