/**
 * Sync avatars to Cloudflare R2
 * 
 * Requires Cloudflare credentials in environment or .env file
 * 
 * Usage:
 *   node scripts/sync-r2.js                    # Sync all avatars
 *   node scripts/sync-r2.js --delete           # Sync and delete remote orphans
 *   node scripts/sync-r2.js <uuid1> <uuid2>   # Sync specific avatars
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { S3Client, PutObjectCommand, ListObjectsV2Command, DeleteObjectCommand } from '@aws-sdk/client-s3';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AVATARS_DIR = path.join(__dirname, '..', 'avatars');

// Cloudflare R2 configuration
const R2_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || 'tongcraft-avatars';
const R2_PUBLIC_DOMAIN = process.env.R2_PUBLIC_DOMAIN || '';

// Create R2 client
const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

/**
 * List all local avatar files
 */
async function listLocalAvatars() {
  const files = await fs.readdir(AVATARS_DIR);
  return files.filter(f => f.endsWith('.png'));
}

/**
 * List all remote avatar files in R2
 */
async function listRemoteAvatars() {
  const command = new ListObjectsV2Command({
    Bucket: R2_BUCKET_NAME,
    Prefix: 'avatars/',
  });
  
  const response = await r2Client.send(command);
  return (response.Contents || []).map(obj => path.basename(obj.Key));
}

/**
 * Upload a single file to R2
 */
async function uploadToR2(filename) {
  const localPath = path.join(AVATARS_DIR, filename);
  const fileBuffer = await fs.readFile(localPath);
  
  const command = new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: `avatars/${filename}`,
    Body: fileBuffer,
    ContentType: 'image/png',
    CacheControl: 'public, max-age=86400', // 24 hours cache
  });
  
  await r2Client.send(command);
  return `https://${R2_PUBLIC_DOMAIN}/avatars/${filename}`;
}

/**
 * Delete a file from R2
 */
async function deleteFromR2(filename) {
  const command = new DeleteObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: `avatars/${filename}`,
  });
  
  await r2Client.send(command);
}

/**
 * Check if remote file exists and compare with local
 */
async function needsUpload(filename, remoteFiles) {
  if (!remoteFiles.includes(filename)) {
    return true;
  }
  
  // Could also compare file sizes or ETags here
  // For now, we skip files that already exist
  return false;
}

/**
 * Main sync function
 */
async function main() {
  const args = process.argv.slice(2);
  const deleteOrphans = args.includes('--delete');
  const specificFiles = args.filter(a => !a.startsWith('--'));
  
  // Validate environment
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
    console.error('Error: Cloudflare R2 credentials not configured.');
    console.error('');
    console.error('Set the following environment variables:');
    console.error('  CLOUDFLARE_ACCOUNT_ID  - Your Cloudflare account ID');
    console.error('  R2_ACCESS_KEY_ID       - R2 API token access key ID');
    console.error('  R2_SECRET_ACCESS_KEY   - R2 API token secret access key');
    console.error('  R2_BUCKET_NAME         - R2 bucket name (default: tongcraft-avatars)');
    console.error('  R2_PUBLIC_DOMAIN       - Public domain for the bucket');
    process.exit(1);
  }
  
  console.log('Syncing avatars to Cloudflare R2...\n');
  
  // Get local and remote file lists
  const localFiles = specificFiles.length > 0 
    ? specificFiles.map(f => f.endsWith('.png') ? f : `${f}.png`)
    : await listLocalAvatars();
  
  let remoteFiles = [];
  try {
    remoteFiles = await listRemoteAvatars();
  } catch (error) {
    console.warn('Could not list remote files:', error.message);
    console.warn('Will upload all local files.\n');
  }
  
  console.log(`Local: ${localFiles.length} files`);
  console.log(`Remote: ${remoteFiles.length} files\n`);
  
  // Upload new/changed files
  let uploaded = 0;
  let skipped = 0;
  
  for (const filename of localFiles) {
    const shouldUpload = await needsUpload(filename, remoteFiles);
    
    if (shouldUpload) {
      try {
        const url = await uploadToR2(filename);
        console.log(`  Uploaded: ${filename} -> ${url}`);
        uploaded++;
      } catch (error) {
        console.error(`  Failed: ${filename} - ${error.message}`);
      }
    } else {
      console.log(`  Skipped: ${filename} (already exists)`);
      skipped++;
    }
  }
  
  // Delete orphaned remote files
  if (deleteOrphans) {
    const orphaned = remoteFiles.filter(f => !localFiles.includes(f));
    if (orphaned.length > 0) {
      console.log(`\nDeleting ${orphaned.length} orphaned remote file(s)...`);
      for (const filename of orphaned) {
        try {
          await deleteFromR2(filename);
          console.log(`  Deleted: ${filename}`);
        } catch (error) {
          console.error(`  Failed to delete: ${filename} - ${error.message}`);
        }
      }
    }
  }
  
  console.log(`\nDone! ${uploaded} uploaded, ${skipped} skipped.`);
}

main().catch(console.error);
