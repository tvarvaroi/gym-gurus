/**
 * GymGurus — PWA + App Store Icon Generator
 *
 * Generates all required icon sizes from the app logo using sharp.
 * Output: client/public/icons/{icon-N.png}
 *
 * Run: node scripts/generate-icons.mjs
 */

import sharp from 'sharp';
import { mkdir, copyFile } from 'fs/promises';
import { existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// Source logo — the highest-resolution logo we have
const SOURCE = resolve(
  ROOT,
  'attached_assets',
  'Sophisticated Logo with Japanese Influences (3)_1757605872884.png'
);

const OUT_DIR = resolve(ROOT, 'client', 'public', 'icons');

// Sizes needed:
//  PWA:           192, 512
//  Apple touch:   180
//  General PWA:   72, 96, 128, 144, 152, 384
//  App Store iOS: 1024
const SIZES = [72, 96, 128, 144, 152, 180, 192, 384, 512, 1024];

async function generate() {
  // Ensure output directory exists
  if (!existsSync(OUT_DIR)) {
    await mkdir(OUT_DIR, { recursive: true });
  }

  console.log(`\n📱  GymGurus Icon Generator`);
  console.log(`    Source : ${SOURCE}`);
  console.log(`    Output : ${OUT_DIR}\n`);

  for (const size of SIZES) {
    const outFile = resolve(OUT_DIR, `icon-${size}.png`);
    await sharp(SOURCE)
      .resize(size, size, {
        fit: 'contain',
        background: { r: 10, g: 10, b: 10, alpha: 1 }, // #0a0a0a — matches app dark bg
      })
      .png({ quality: 90 })
      .toFile(outFile);
    console.log(`    ✓  icon-${size}.png`);
  }

  // apple-touch-icon.png is the 180 copy at root level (required for iOS Safari)
  await copyFile(
    resolve(OUT_DIR, 'icon-180.png'),
    resolve(ROOT, 'client', 'public', 'apple-touch-icon.png')
  );
  console.log(`    ✓  apple-touch-icon.png  (root)\n`);

  // favicon-32.png for the browser tab
  await sharp(SOURCE)
    .resize(32, 32, { fit: 'contain', background: { r: 10, g: 10, b: 10, alpha: 1 } })
    .png({ quality: 90 })
    .toFile(resolve(ROOT, 'client', 'public', 'favicon-32.png'));
  console.log(`    ✓  favicon-32.png  (root)\n`);

  console.log(`  All icons generated successfully.\n`);
}

generate().catch((err) => {
  console.error('Icon generation failed:', err);
  process.exit(1);
});
