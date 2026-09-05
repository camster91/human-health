import sharp from 'sharp';
import { readFileSync } from 'fs';

const svg = readFileSync('public/icon.svg');

// Generate 192x192 for PWA
await sharp(svg)
  .resize(192, 192)
  .png()
  .toFile('public/icon-192.png');

console.log('✓ Generated icon-192.png (192x192)');

// Generate 512x512 for PWA
await sharp(svg)
  .resize(512, 512)
  .png()
  .toFile('public/icon-512.png');

console.log('✓ Generated icon-512.png (512x512)');

// Generate 180x180 for Apple touch icon
await sharp(svg)
  .resize(180, 180)
  .png()
  .toFile('public/apple-touch-icon.png');

console.log('✓ Generated apple-touch-icon.png (180x180)');
