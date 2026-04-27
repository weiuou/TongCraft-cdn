/**
 * Crop Minecraft skin textures to face avatars
 * Extracts head (8x8) + hat layer (8x8) from skin, outputs 64x64 avatar
 *
 * Usage:
 *   node scripts/crop-avatars.js          # Process all avatars/
 *   node scripts/crop-avatars.js <uuid>   # Process single file
 */

import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AVATARS_DIR = path.join(__dirname, '..', 'avatars');

async function cropSkinToAvatar(inputPath, outputPath) {
  const img = sharp(inputPath);
  const { width, height } = await img.metadata();

  // Validate it's a skin texture (64x32 old or 64x64 new)
  if (width !== 64 || (height !== 32 && height !== 64)) {
    console.warn(`  Skipping ${path.basename(inputPath)}: unexpected size ${width}x${height}`);
    return false;
  }

  // Extract base head layer: x=8, y=8, w=8, h=8
  const baseHead = await sharp(inputPath)
    .extract({ left: 8, top: 8, width: 8, height: 8 })
    .toBuffer();

  // Extract hat/overlay layer: x=40, y=8, w=8, h=8
  const hatLayer = await sharp(inputPath)
    .extract({ left: 40, top: 8, width: 8, height: 8 })
    .toBuffer();

  // Composite hat over base head, then scale to 64x64
  await sharp(baseHead)
    .resize(8, 8)
    .composite([{ input: hatLayer, blend: 'over' }])
    .resize(64, 64, { kernel: 'nearest' })
    .png()
    .toFile(outputPath);

  return true;
}

async function main() {
  const args = process.argv.slice(2);

  let files;
  if (args.length > 0) {
    files = args.map(a => (a.endsWith('.png') ? a : `${a}.png`));
  } else {
    const all = await fs.readdir(AVATARS_DIR);
    files = all.filter(f => f.endsWith('.png') && f !== '_tmp_skin.png');
  }

  let ok = 0, skip = 0;
  for (const filename of files) {
    const filePath = path.join(AVATARS_DIR, filename);
    console.log(`Processing ${filename}...`);
    const result = await cropSkinToAvatar(filePath, filePath);
    result ? ok++ : skip++;
  }

  console.log(`\nDone! ${ok} cropped, ${skip} skipped.`);
}

main().catch(console.error);
