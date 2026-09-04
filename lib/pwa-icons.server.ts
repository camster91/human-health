import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { deflateSync } from 'node:zlib';

const ORANGE = [200, 71, 18, 255] as const;
const WHITE = [255, 255, 255, 255] as const;
const INK = [23, 26, 31, 255] as const;

function crc32(buffer: Buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer) {
  const typeBytes = Buffer.from(type, 'ascii');
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(Buffer.concat([typeBytes, data])));
  return Buffer.concat([length, typeBytes, data, checksum]);
}

function setPixel(pixels: Uint8Array, size: number, x: number, y: number, colour: readonly number[]) {
  if (x < 0 || y < 0 || x >= size || y >= size) return;
  const index = (y * size + x) * 4;
  pixels[index] = colour[0];
  pixels[index + 1] = colour[1];
  pixels[index + 2] = colour[2];
  pixels[index + 3] = colour[3];
}

function fillCircle(pixels: Uint8Array, size: number, cx: number, cy: number, radius: number, colour: readonly number[]) {
  const r2 = radius * radius;
  for (let y = Math.max(0, Math.floor(cy - radius)); y <= Math.min(size - 1, Math.ceil(cy + radius)); y++) {
    for (let x = Math.max(0, Math.floor(cx - radius)); x <= Math.min(size - 1, Math.ceil(cx + radius)); x++) {
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy <= r2) setPixel(pixels, size, x, y, colour);
    }
  }
}

function drawLine(pixels: Uint8Array, size: number, x0: number, y0: number, x1: number, y1: number, width: number, colour: readonly number[]) {
  const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
  for (let step = 0; step <= steps; step++) {
    const t = step / steps;
    fillCircle(pixels, size, x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, width / 2, colour);
  }
}

export function createHumanHealthPng(size: number) {
  const pixels = new Uint8Array(size * size * 4);
  for (let index = 0; index < pixels.length; index += 4) {
    pixels[index] = ORANGE[0];
    pixels[index + 1] = ORANGE[1];
    pixels[index + 2] = ORANGE[2];
    pixels[index + 3] = 255;
  }

  fillCircle(pixels, size, size * 0.5, size * 0.29, size * 0.105, WHITE);
  drawLine(pixels, size, size * 0.31, size * 0.73, size * 0.39, size * 0.53, size * 0.085, WHITE);
  drawLine(pixels, size, size * 0.39, size * 0.53, size * 0.5, size * 0.47, size * 0.085, WHITE);
  drawLine(pixels, size, size * 0.5, size * 0.47, size * 0.61, size * 0.53, size * 0.085, WHITE);
  drawLine(pixels, size, size * 0.61, size * 0.53, size * 0.69, size * 0.73, size * 0.085, WHITE);

  const heartbeat = [
    [0.18, 0.63], [0.34, 0.63], [0.39, 0.55], [0.47, 0.73], [0.54, 0.59], [0.6, 0.67], [0.82, 0.67],
  ];
  for (let index = 0; index < heartbeat.length - 1; index++) {
    drawLine(pixels, size, heartbeat[index][0] * size, heartbeat[index][1] * size, heartbeat[index + 1][0] * size, heartbeat[index + 1][1] * size, Math.max(3, size * 0.038), INK);
  }

  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    const row = y * (size * 4 + 1);
    raw[row] = 0;
    Buffer.from(pixels.buffer, pixels.byteOffset + y * size * 4, size * 4).copy(raw, row + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([signature, chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

export function ensurePwaIcons() {
  const assets = [
    { name: 'icon-192.png', size: 192 },
    { name: 'icon-512.png', size: 512 },
    { name: 'apple-touch-icon.png', size: 180 },
  ];
  const roots = ['public', ...(existsSync('out') ? ['out'] : [])];
  for (const root of roots) {
    mkdirSync(root, { recursive: true });
    for (const asset of assets) {
      const path = join(root, asset.name);
      if (!existsSync(path)) writeFileSync(path, createHumanHealthPng(asset.size));
    }
  }
}
