/**
 * Add players to the whitelist
 * 
 * Usage:
 *   node scripts/add-player.js <name> [uuid]
 *   node scripts/add-player.js --file players.txt
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', 'data');
const PLAYERS_FILE = path.join(DATA_DIR, 'players.json');

/**
 * Load existing player data
 */
async function loadPlayers() {
  try {
    const data = await fs.readFile(PLAYERS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return { players: [], lastUpdated: null };
  }
}

/**
 * Save player data
 */
async function savePlayers(data) {
  await fs.writeFile(PLAYERS_FILE, JSON.stringify(data, null, 2));
}

/**
 * Get UUID from Mojang API
 */
async function getUUID(name) {
  const res = await fetch(`https://api.mojang.com/users/profiles/minecraft/${name}`);
  if (!res.ok) {
    throw new Error(`Player not found: ${name}`);
  }
  const data = await res.json();
  return { uuid: data.id, name: data.name };
}

/**
 * Add a single player
 */
async function addPlayer(name, uuid = null) {
  const playersData = await loadPlayers();
  
  // Check if player already exists
  const existing = playersData.players.find(p => 
    p.name.toLowerCase() === name.toLowerCase()
  );
  
  if (existing) {
    console.log(`Player already exists: ${name}`);
    return false;
  }
  
  // Get UUID from API if not provided
  if (!uuid) {
    try {
      const result = await getUUID(name);
      uuid = result.uuid;
      console.log(`  UUID: ${uuid}`);
    } catch (error) {
      console.error(`  Error: ${error.message}`);
      return false;
    }
  }
  
  // Add player
  playersData.players.push({
    name,
    uuid,
    addedAt: new Date().toISOString(),
    hasAvatar: false
  });
  
  await savePlayers(playersData);
  console.log(`  Added: ${name} (${uuid})`);
  return true;
}

/**
 * Add players from file
 */
async function addPlayersFromFile(filePath) {
  const content = await fs.readFile(filePath, 'utf-8');
  const lines = content.split('\n').filter(line => line.trim() && !line.startsWith('#'));
  
  let added = 0;
  for (const line of lines) {
    const parts = line.trim().split(/[,\s]+/);
    const name = parts[0];
    const uuid = parts[1] || null;
    
    if (await addPlayer(name, uuid)) {
      added++;
    }
  }
  
  return added;
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage:');
    console.log('  node scripts/add-player.js <name> [uuid]');
    console.log('  node scripts/add-player.js --file players.txt');
    process.exit(1);
  }
  
  await fs.mkdir(DATA_DIR, { recursive: true });
  
  if (args[0] === '--file') {
    const filePath = args[1];
    if (!filePath) {
      console.error('Error: --file requires a file path');
      process.exit(1);
    }
    
    const added = await addPlayersFromFile(filePath);
    console.log(`\nDone! Added ${added} player(s).`);
  } else {
    const name = args[0];
    const uuid = args[1] || null;
    await addPlayer(name, uuid);
  }
}

main().catch(console.error);
