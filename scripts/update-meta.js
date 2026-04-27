/**
 * Update avatar metadata
 * 
 * Scans the avatars directory and generates/updates metadata files
 * 
 * Usage:
 *   node scripts/update-meta.js
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AVATARS_DIR = path.join(__dirname, '..', 'avatars');
const DATA_DIR = path.join(__dirname, '..', 'data');

/**
 * Load players.json
 */
async function loadPlayers() {
  try {
    const data = await fs.readFile(path.join(DATA_DIR, 'players.json'), 'utf-8');
    return JSON.parse(data);
  } catch {
    return { players: [], lastUpdated: null };
  }
}

/**
 * Save players.json
 */
async function savePlayers(data) {
  await fs.writeFile(
    path.join(DATA_DIR, 'players.json'),
    JSON.stringify(data, null, 2)
  );
}

/**
 * Generate avatars-meta.json from avatars directory
 */
async function generateMeta() {
  const files = await fs.readdir(AVATARS_DIR);
  const avatarFiles = files.filter(f => f.endsWith('.png'));
  
  const meta = {};
  
  for (const filename of avatarFiles) {
    const uuid = filename.replace('.png', '');
    const filePath = path.join(AVATARS_DIR, filename);
    const stat = await fs.stat(filePath);
    
    // Try to find player name from players.json
    const playersData = await loadPlayers();
    const player = playersData.players.find(p => p.uuid === uuid);
    
    meta[uuid] = {
      uuid,
      name: player ? player.name : null,
      filename,
      size: stat.size,
      createdAt: stat.birthtime.toISOString(),
      updatedAt: stat.mtime.toISOString()
    };
  }
  
  const metaFile = path.join(DATA_DIR, 'avatars-meta.json');
  await fs.writeFile(metaFile, JSON.stringify(meta, null, 2));
  
  return meta;
}

/**
 * Generate CDN URLs file
 */
async function generateCdnUrls(meta) {
  const cdnBase = process.env.CDN_BASE || 'https://tongcraft-cdn.example.com';
  
  const urls = {};
  for (const [uuid, info] of Object.entries(meta)) {
    urls[uuid] = {
      name: info.name,
      url: `${cdnBase}/avatars/${uuid}.png`,
      thumbUrl: `${cdnBase}/avatars/${uuid}.png?size=32`
    };
  }
  
  const urlsFile = path.join(DATA_DIR, 'cdn-urls.json');
  await fs.writeFile(urlsFile, JSON.stringify(urls, null, 2));
  
  return urls;
}

/**
 * Main function
 */
async function main() {
  console.log('Updating metadata...\n');
  
  // Ensure directories exist
  await fs.mkdir(DATA_DIR, { recursive: true });
  
  // Generate metadata
  const meta = await generateMeta();
  const avatarCount = Object.keys(meta).length;
  console.log(`Found ${avatarCount} avatar(s) in avatars/`);
  
  // Generate CDN URLs
  const urls = await generateCdnUrls(meta);
  console.log(`Generated CDN URLs for ${Object.keys(urls).length} avatar(s)`);
  
  // Update players.json with avatar info
  const playersData = await loadPlayers();
  for (const player of playersData.players) {
    if (meta[player.uuid]) {
      player.hasAvatar = true;
      player.avatarUpdatedAt = meta[player.uuid].updatedAt;
    } else {
      player.hasAvatar = false;
    }
  }
  playersData.lastUpdated = new Date().toISOString();
  await savePlayers(playersData);
  console.log('Updated players.json');
  
  console.log('\nDone!');
}

main().catch(console.error);
