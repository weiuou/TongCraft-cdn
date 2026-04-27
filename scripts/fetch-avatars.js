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
const SKINS_DIR = path.join(__dirname, '..', 'skins');
const DATA_DIR = path.join(__dirname, '..', 'data');

async function readJson(filePath, fallback) {
  try {
    return JSON.parse(await fs.readFile(filePath, 'utf-8'));
  } catch {
    return fallback;
  }
}

async function writeJson(filePath, data) {
  await fs.writeFile(filePath, JSON.stringify(data, null, 2) + '\n');
}

async function getSkinProfile(uuid) {
  const res = await fetch(`https://sessionserver.mojang.com/session/minecraft/profile/${uuid}`);
  if (!res.ok) throw new Error(`Profile fetch failed: ${res.status}`);
  const data = await res.json();
  const prop = data.properties?.find(p => p.name === 'textures');
  if (!prop) throw new Error('No textures property');
  const textures = JSON.parse(Buffer.from(prop.value, 'base64').toString('utf-8'));
  const skin = textures.textures?.SKIN;
  const skinUrl = skin?.url;
  if (!skinUrl) throw new Error('No skin URL');
  return {
    skinUrl,
    skinModel: skin.metadata?.model === 'slim' ? 'slim' : 'classic',
    skinTextureUpdatedAt: textures.timestamp ? new Date(textures.timestamp).toISOString() : null
  };
}

async function fetchAndCrop(uuid) {
  const skinProfile = await getSkinProfile(uuid);
  const { skinUrl, skinModel, skinTextureUpdatedAt } = skinProfile;
  const res = await fetch(skinUrl);
  if (!res.ok) throw new Error(`Skin download failed: ${res.status}`);
  const skinBuffer = Buffer.from(await res.arrayBuffer());

  const { width, height } = await sharp(skinBuffer).metadata();
  if (width !== 64 || (height !== 32 && height !== 64)) {
    throw new Error(`Unexpected skin size: ${width}x${height}`);
  }

  await fs.writeFile(path.join(SKINS_DIR, `${uuid}.png`), skinBuffer);

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

  return {
    skinUrl,
    skinModel,
    skinTextureUpdatedAt,
    width,
    height,
    updatedAt: new Date().toISOString()
  };
}

async function main() {
  await fs.mkdir(AVATARS_DIR, { recursive: true });
  await fs.mkdir(SKINS_DIR, { recursive: true });

  const playersPath = path.join(DATA_DIR, 'players.json');
  const metaPath = path.join(DATA_DIR, 'avatars-meta.json');
  const playersData = await readJson(playersPath, { players: [], lastUpdated: null });
  const meta = await readJson(metaPath, {});
  const { players } = playersData;
  const args = process.argv.slice(2);
  const targets = args.length > 0
    ? players.filter(p => args.includes(p.name))
    : players;

  let ok = 0, fail = 0;
  for (const player of targets) {
    process.stdout.write(`  ${player.name} (${player.uuid})... `);
    try {
      const result = await fetchAndCrop(player.uuid);
      player.hasAvatar = true;
      player.avatarUpdatedAt = result.updatedAt;
      player.skinModel = result.skinModel;
      player.skinUrl = result.skinUrl;
      player.skinTextureUpdatedAt = result.skinTextureUpdatedAt;
      meta[player.uuid] = {
        ...(meta[player.uuid] || {}),
        uuid: player.uuid,
        name: player.name,
        filename: `${player.uuid}.png`,
        updatedAt: result.updatedAt,
        skinModel: result.skinModel,
        skinUrl: result.skinUrl,
        skinTextureUpdatedAt: result.skinTextureUpdatedAt,
        skinWidth: result.width,
        skinHeight: result.height
      };
      console.log(`ok (${result.skinModel})`);
      ok++;
    } catch (e) {
      console.log(`FAILED: ${e.message}`);
      fail++;
    }
    await new Promise(r => setTimeout(r, 200));
  }

  playersData.lastUpdated = new Date().toISOString();
  await writeJson(playersPath, playersData);
  await writeJson(metaPath, meta);

  console.log(`\nDone! ${ok} ok, ${fail} failed.`);
}

main().catch(console.error);
