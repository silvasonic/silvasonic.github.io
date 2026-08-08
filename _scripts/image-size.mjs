// Read intrinsic pixel dimensions straight from image bytes.
// Supports WebP (VP8/VP8L/VP8X), PNG and JPEG - the formats used on this site.
// Shared by add-dimensions.mjs and verify.mjs.

export function dimensions(buf) {
  // WebP: RIFF....WEBP then a format-specific chunk
  if (buf.subarray(0, 4).toString('latin1') === 'RIFF' && buf.subarray(8, 12).toString('latin1') === 'WEBP') {
    const fmt = buf.subarray(12, 16).toString('latin1');
    if (fmt === 'VP8X') return [1 + buf.readUIntLE(24, 3), 1 + buf.readUIntLE(27, 3)];
    if (fmt === 'VP8 ') return [buf.readUInt16LE(26) & 0x3fff, buf.readUInt16LE(28) & 0x3fff];
    if (fmt === 'VP8L') {
      const n = buf.readUInt32LE(21);
      return [(n & 0x3fff) + 1, ((n >> 14) & 0x3fff) + 1];
    }
    throw new Error(`unrecognised WebP chunk: ${fmt}`);
  }

  // PNG: width/height are big-endian at fixed offsets in the IHDR chunk
  if (buf[0] === 0x89 && buf[1] === 0x50) return [buf.readUInt32BE(16), buf.readUInt32BE(20)];

  // JPEG: walk the segment chain to the start-of-frame marker
  let i = 2;
  while (i < buf.length) {
    if (buf[i] !== 0xff) { i++; continue; }
    const marker = buf[i + 1];
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc)
      return [buf.readUInt16BE(i + 7), buf.readUInt16BE(i + 5)]; // width, height
    i += 2 + buf.readUInt16BE(i + 2);
  }
  throw new Error('could not determine dimensions');
}
