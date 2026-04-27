/**
 * Fetch skins from Mojang and crop to face avatars for all whitelisted players
 *
 * Usage:
 *   node scripts/fetch-avatars.js          # All players
 *   node scripts/fetch-avatars.js <name>   # Single player
 */

import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AVATARS_DIR = path.join(__dirname, '..', 'avatars');
const DATA_DIR = path.join(__dirname, '..', 'data');

async function getSkinUrl(uuid) {
  const res = await fetch(`https://sessionserver.mojang.com/session/minecraft/profile/${uuid}`);
  if (!res.ok) throw new Error(`Profile fetch failed: ${res.status}`);
  const data = await res.json();
  const prop = data.properties?.find(p => p.name === 'textures');
  if (!prop) throw new Error('No textures property');
  const textures = JSON.parse(Buffer.from(prop.value, 'base64').toString('utf-8'));
  const skinUrl = textures.textures?.SKIN?.url;
  if (!skinUrl) throw new Error('No skin URL');
  return skinUrl;
}

async function fetchAndCrop(uuid) {
  const skinUrl = await getSkinUrl(uuid);
  const res = await fetch(skinUrl);
  if (!res.ok) throw new Error(`Skin download failed: ${res.status}`);
  const skinBuffer = Buffer.from(await res.arrayBuffer());

  const { width, height } = await sharp(skinBuffer).metadata();
  if (width !== 64 || (height !== 32 && height !== 64)) {
    throw new Error(`Unexpected skin size: ${width}x${height}`);
  }

  const baseHead = await sharp(skinBuffer)
    .extract({ left: 8, top: 8, width: 8, height: 8 })
    .resize(64, 64, { kernel: 'nearest' })
    .toBuffer();

  const hatLayer = await sharp(skinBuffer)
    .extract({ left: 40, top: 8, width: 8, height: 8 })
    .resize(64, 64, { kernel: 'nearest' })
    .toBuffer();

  await sharp(baseHead)
    .composite([{ input: hatLayer, blend: 'over' }])
    .png()
    .toFile(path.join(AVATARS_DIR, `${uuid}.png`));
}

async function main() {
  await fs.mkdir(AVATARS_DIR, { recursive: true });

  const { players } = JSON.parse(await fs.readFile(path.join(DATA_DIR, 'players.json'), 'utf-8'));
  const args = process.argv.slice(2);
  const targets = args.length > 0
    ? players.filter(p => args.includes(p.name))
    : players;

  let ok = 0, fail = 0;
  for (const player of targets) {
    process.stdout.write(`  ${player.name} (${player.uuid})... `);
    try {
      await fetchAndCrop(player.uuid);
      console.log('ok');
      ok++;
    } catch (e) {
      console.log(`FAILED: ${e.message}`);
      fail++;
    }
    await new Promise(r => setTimeout(r, 200));
  }

  console.log(`\nDone! ${ok} ok, ${fail} failed.`);
}

main().catch(console.error);
