import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

function createCRC32Table() {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c;
  }
  return table;
}

const crcTable = createCRC32Table();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const len = data.length;
  const buf = Buffer.alloc(12 + len);
  buf.writeUInt32BE(len, 0);
  buf.write(type, 4, 4, 'ascii');
  data.copy(buf, 8);
  const typeAndData = buf.subarray(4, 8 + len);
  buf.writeUInt32BE(crc32(typeAndData), 8 + len);
  return buf;
}

function generatePNG(width, height, isMaskable = false) {
  const header = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 6; // color type: RGBA
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace
  const ihdrChunk = makeChunk('IHDR', ihdrData);

  // Raw image data with filter byte (0) per row
  const rowLength = 1 + width * 4;
  const rawData = Buffer.alloc(height * rowLength);

  const cx = width / 2;
  const cy = height / 2;
  const radius = width * (isMaskable ? 0.48 : 0.44);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowLength;
    rawData[rowOffset] = 0; // No filter

    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Deep blue gradient background
      const ratio = y / height;
      let r = Math.round(30 + ratio * 10);
      let g = Math.round(58 + ratio * 40);
      let b = Math.round(138 + ratio * 60);
      let a = 255;

      if (!isMaskable && dist > radius) {
        // Rounded corners
        const cornerR = width * 0.22;
        const inCornerX = Math.abs(x - cx) > (cx - cornerR);
        const inCornerY = Math.abs(y - cy) > (cy - cornerR);
        if (inCornerX && inCornerY) {
          const cdx = Math.abs(x - cx) - (cx - cornerR);
          const cdy = Math.abs(y - cy) - (cy - cornerR);
          if (cdx * cdx + cdy * cdy > cornerR * cornerR) {
            a = 0;
          }
        }
      }

      // Draw paper sheet in center
      const pw = width * 0.48;
      const ph = height * 0.60;
      const px1 = cx - pw / 2;
      const px2 = cx + pw / 2;
      const py1 = cy - ph / 2;
      const py2 = cy + ph / 2;

      if (a > 0 && x >= px1 && x <= px2 && y >= py1 && y <= py2) {
        // Paper color
        r = 255;
        g = 255;
        b = 255;

        // Paper header banner
        if (y >= py1 + ph * 0.12 && y <= py1 + ph * 0.22 && x >= px1 + pw * 0.15 && x <= px2 - pw * 0.15) {
          r = 30; g = 58; b = 138;
        }

        // Exam question line 1
        if (y >= py1 + ph * 0.32 && y <= py1 + ph * 0.36 && x >= px1 + pw * 0.15 && x <= px2 - pw * 0.15) {
          r = 100; g = 116; b = 139;
        }

        // Exam options
        if (y >= py1 + ph * 0.44 && y <= py1 + ph * 0.48 && x >= px1 + pw * 0.25 && x <= px2 - pw * 0.2) {
          r = 148; g = 163; b = 184;
        }
        if (y >= py1 + ph * 0.54 && y <= py1 + ph * 0.58 && x >= px1 + pw * 0.25 && x <= px2 - pw * 0.3) {
          r = 148; g = 163; b = 184;
        }

        // Answer key section
        if (y >= py1 + ph * 0.72 && y <= py1 + ph * 0.86 && x >= px1 + pw * 0.15 && x <= px2 - pw * 0.15) {
          r = 224; g = 231; b = 255;
        }
      }

      // Floating Mic accent circle
      const micCx = cx + width * 0.24;
      const micCy = cy + height * 0.24;
      const micR = width * 0.14;
      const mdist = Math.sqrt((x - micCx) ** 2 + (y - micCy) ** 2);
      if (mdist <= micR && a > 0) {
        r = 245; g = 158; b = 11; // Amber Gold
        // mic center
        if (Math.abs(x - micCx) < micR * 0.25 && Math.abs(y - micCy) < micR * 0.45) {
          r = 255; g = 255; b = 255;
        }
      }

      rawData[pxOffset] = r;
      rawData[pxOffset + 1] = g;
      rawData[pxOffset + 2] = b;
      rawData[pxOffset + 3] = a;
    }
  }

  const compressedData = zlib.deflateSync(rawData);
  const idatChunk = makeChunk('IDAT', compressedData);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([header, ihdrChunk, idatChunk, iendChunk]);
}

const outDir = path.resolve('public');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

fs.writeFileSync(path.join(outDir, 'pwa-192x192.png'), generatePNG(192, 192, false));
fs.writeFileSync(path.join(outDir, 'pwa-512x512.png'), generatePNG(512, 512, false));
fs.writeFileSync(path.join(outDir, 'pwa-maskable-512x512.png'), generatePNG(512, 512, true));
fs.writeFileSync(path.join(outDir, 'apple-touch-icon.png'), generatePNG(180, 180, false));

console.log('PWA PNG icons generated successfully in /public');
