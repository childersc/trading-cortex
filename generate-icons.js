const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function createPNG(size) {
  const width = size;
  const height = size;

  const rawData = Buffer.alloc(height * (width * 4 + 1));

  for (let y = 0; y < height; y++) {
    const rowOffset = y * (width * 4 + 1);
    rawData[rowOffset] = 0; // Filter: None

    for (let x = 0; x < width; x++) {
      const pixelOffset = rowOffset + 1 + x * 4;

      const cornerRadius = size * 0.22;
      const clampedX = Math.max(Math.min(x, width - 1 - cornerRadius), cornerRadius);
      const clampedY = Math.max(Math.min(y, height - 1 - cornerRadius), cornerRadius);
      const cDist = Math.sqrt((x - clampedX) ** 2 + (y - clampedY) ** 2);

      if (cDist > cornerRadius + 0.5) {
        rawData[pixelOffset] = 0;
        rawData[pixelOffset + 1] = 0;
        rawData[pixelOffset + 2] = 0;
        rawData[pixelOffset + 3] = 0;
        continue;
      }

      let rCol = 22, gCol = 26, bCol = 36, aCol = 255;

      const pad = Math.round(size * 0.22);
      const boxLeft = pad;
      const boxRight = width - pad;
      const boxTop = pad;
      const boxBottom = height - pad;

      const inBox = x >= boxLeft && x < boxRight && y >= boxTop && y < boxBottom;
      const borderWidth = Math.max(1, Math.round(size * 0.08));
      const isBorder = inBox && (
        x < boxLeft + borderWidth ||
        x >= boxRight - borderWidth ||
        y < boxTop + borderWidth ||
        y >= boxBottom - borderWidth
      );

      if (isBorder) {
        rCol = 16;
        gCol = 185;
        bCol = 129;
      } else if (inBox) {
        rCol = Math.round(22 * 0.65 + 16 * 0.35);
        gCol = Math.round(26 * 0.65 + 185 * 0.35);
        bCol = Math.round(36 * 0.65 + 129 * 0.35);
      }

      const midY = Math.round(height * 0.5);
      if (inBox && !isBorder && Math.abs(y - midY) <= Math.max(0, Math.round(size * 0.04)) && x >= boxLeft + borderWidth + 2 && x < boxRight - borderWidth - 2) {
        rCol = 52;
        gCol = 211;
        bCol = 153;
      }

      rawData[pixelOffset] = rCol;
      rawData[pixelOffset + 1] = gCol;
      rawData[pixelOffset + 2] = bCol;
      rawData[pixelOffset + 3] = aCol;
    }
  }

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const ihdrChunk = createChunk('IHDR', ihdr);
  const compressed = zlib.deflateSync(rawData);
  const idatChunk = createChunk('IDAT', compressed);
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function createChunk(type, data) {
  const length = data.length;
  const chunk = Buffer.alloc(4 + 4 + length + 4);
  chunk.writeUInt32BE(length, 0);
  chunk.write(type, 4);
  data.copy(chunk, 8);

  const crc = crc32(Buffer.concat([Buffer.from(type), data]));
  chunk.writeUInt32BE(crc >>> 0, 8 + length);
  return chunk;
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = (c >>> 8) ^ table[(c ^ buf[i]) & 0xff];
  }
  return (c ^ 0xffffffff) >>> 0;
}

const table = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  table[i] = c;
}

const iconsDir = path.join(__dirname, 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

[16, 32, 48, 128].forEach(size => {
  const png = createPNG(size);
  fs.writeFileSync(path.join(iconsDir, `icon${size}.png`), png);
  console.log(`Generated icon${size}.png`);
});
