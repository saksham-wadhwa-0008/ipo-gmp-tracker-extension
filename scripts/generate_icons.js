const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// CRC32 table
const crcTable = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    if (c & 1) c = 0xedb88320 ^ (c >>> 1);
    else c = c >>> 1;
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);

  const typeBuf = Buffer.from(type, 'ascii');
  const typeAndData = Buffer.concat([typeBuf, data]);

  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(typeAndData), 0);

  return Buffer.concat([len, typeAndData, crcBuf]);
}

function createPng(width, height, pixelFn) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData.writeUInt8(8, 8); // bit depth 8
  ihdrData.writeUInt8(6, 9); // color type 6: RGBA
  ihdrData.writeUInt8(0, 10); // compression
  ihdrData.writeUInt8(0, 11); // filter
  ihdrData.writeUInt8(0, 12); // interlace
  const ihdrChunk = makeChunk('IHDR', ihdrData);

  // Raw image data with 0 filter byte per scanline
  const scanlineLen = 1 + width * 4;
  const rawData = Buffer.alloc(height * scanlineLen);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * scanlineLen;
    rawData[rowOffset] = 0; // Filter None
    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;
      const [r, g, b, a] = pixelFn(x, y, width, height);
      rawData[pxOffset] = r;
      rawData[pxOffset + 1] = g;
      rawData[pxOffset + 2] = b;
      rawData[pxOffset + 3] = a;
    }
  }

  const deflated = zlib.deflateSync(rawData);
  const idatChunk = makeChunk('IDAT', deflated);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function renderIconPixel(x, y, w, h) {
  const nx = x / w;
  const ny = y / h;

  // Rounded rectangle mask (radius ~ 22%)
  const rCorner = 0.22;
  const dx = Math.max(0, Math.abs(nx - 0.5) - (0.5 - rCorner));
  const dy = Math.max(0, Math.abs(ny - 0.5) - (0.5 - rCorner));
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist > rCorner) {
    return [0, 0, 0, 0]; // Transparent outside
  }

  // Dark background gradient (#0F172A to #1E293B)
  const bgR = Math.round(15 + 15 * ny);
  const bgG = Math.round(23 + 18 * ny);
  const bgB = Math.round(42 + 25 * ny);

  // Trend line points: (0.18, 0.78), (0.35, 0.65), (0.55, 0.70), (0.72, 0.45), (0.88, 0.28)
  const pts = [
    [0.18, 0.78],
    [0.35, 0.65],
    [0.52, 0.70],
    [0.70, 0.45],
    [0.86, 0.28]
  ];

  // Check distance to trend polyline
  let minDist = 999;
  for (let i = 0; i < pts.length - 1; i++) {
    const p1 = pts[i];
    const p2 = pts[i + 1];
    // line segment distance
    const l2 = (p2[0] - p1[0]) ** 2 + (p2[1] - p1[1]) ** 2;
    let t = ((nx - p1[0]) * (p2[0] - p1[0]) + (ny - p1[1]) * (p2[1] - p1[1])) / l2;
    t = Math.max(0, Math.min(1, t));
    const projX = p1[0] + t * (p2[0] - p1[0]);
    const projY = p1[1] + t * (p2[1] - p1[1]);
    const d = Math.sqrt((nx - projX) ** 2 + (ny - projY) ** 2);
    if (d < minDist) minDist = d;
  }

  // Line thickness scaled to size
  const strokeRadius = 0.045;
  if (minDist <= strokeRadius) {
    // Bright emerald green trend line (#10B981 to #34D399)
    return [52, 211, 153, 255];
  }

  // Check node circles at endpoints
  for (const pt of pts) {
    const dNode = Math.sqrt((nx - pt[0]) ** 2 + (ny - pt[1]) ** 2);
    if (dNode <= 0.055) {
      return [16, 185, 129, 255];
    }
  }

  // Green area fill under trend line
  // Approximate line height at nx
  let lineY = 1.0;
  for (let i = 0; i < pts.length - 1; i++) {
    if (nx >= pts[i][0] && nx <= pts[i + 1][0]) {
      const t = (nx - pts[i][0]) / (pts[i + 1][0] - pts[i][0]);
      lineY = pts[i][1] + t * (pts[i + 1][1] - pts[i][1]);
      break;
    }
  }
  if (nx >= pts[0][0] && nx <= pts[pts.length - 1][0] && ny >= lineY && ny <= 0.85) {
    const alpha = Math.min(0.35, (ny - lineY) * 1.2);
    const r = Math.round(bgR * (1 - alpha) + 16 * alpha);
    const g = Math.round(bgG * (1 - alpha) + 185 * alpha);
    const b = Math.round(bgB * (1 - alpha) + 129 * alpha);
    return [r, g, b, 255];
  }

  // Border stroke
  if (dist > rCorner - 0.035) {
    return [51, 65, 85, 255]; // #334155
  }

  return [bgR, bgG, bgB, 255];
}

const iconsDir = path.join(__dirname, '..', 'icons');
[16, 32, 48, 128].forEach(size => {
  const pngBuf = createPng(size, size, renderIconPixel);
  const outPath = path.join(iconsDir, `icon${size}.png`);
  fs.writeFileSync(outPath, pngBuf);
  console.log(`Generated ${outPath} (${pngBuf.length} bytes)`);
});
