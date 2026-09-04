import { readFileSync, rmSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { createHumanHealthPng, ensurePwaIcons } from './pwa-icons.server';

function dimensions(buffer: Buffer) {
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

describe('PWA icon generation', () => {
  it('creates valid PNG signatures at requested dimensions', () => {
    const icon = createHumanHealthPng(192);
    expect([...icon.subarray(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
    expect(dimensions(icon)).toEqual({ width: 192, height: 192 });
  });

  it('prepares every manifest icon for build/export', () => {
    for (const path of ['public/icon-192.png', 'public/icon-512.png', 'public/apple-touch-icon.png']) rmSync(path, { force: true });
    ensurePwaIcons();
    expect(dimensions(readFileSync('public/icon-192.png'))).toEqual({ width: 192, height: 192 });
    expect(dimensions(readFileSync('public/icon-512.png'))).toEqual({ width: 512, height: 512 });
    expect(dimensions(readFileSync('public/apple-touch-icon.png'))).toEqual({ width: 180, height: 180 });
  });
});
