# Tongcraft-cdn

CDN service for Tongcraft Minecraft server player avatars.

## Features

- Fetch player avatars from Minecraft API
- Store avatars in Cloudflare R2
- Serve avatars via CDN with caching
- REST API for querying player info

## Project Structure

```
Tongcraft-cdn/
├── avatars/              # Local avatar storage
├── data/                 # Metadata files
│   ├── players.json      # Player data index
│   ├── avatars-meta.json # Avatar metadata
│   └── cdn-urls.json     # CDN URLs
├── scripts/
│   ├── fetch-avatars.js  # Fetch from Minecraft API
│   ├── sync-r2.js        # Sync to Cloudflare R2
│   └── update-meta.js    # Update metadata
├── src/
│   └── index.js          # Cloudflare Worker API
├── wrangler.toml         # Cloudflare config
└── package.json
```

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env` and fill in your Cloudflare R2 credentials:

```bash
cp .env.example .env
```

### 3. Create R2 Bucket

```bash
npx wrangler r2 bucket create tongcraft-avatars
```

## Usage

### Fetch Avatars

Fetch avatars for specific players:

```bash
npm run fetch -- Player1 Player2 Player3
```

Fetch all whitelisted players (requires players.json):

```bash
npm run fetch -- --all --update-meta
```

### Sync to R2

Sync all local avatars to Cloudflare R2:

```bash
npm run sync
```

Sync and delete orphaned remote files:

```bash
npm run sync -- --delete
```

### Update Metadata

Regenerate metadata files:

```bash
npm run update-meta
```

### Deploy API

Deploy the Cloudflare Worker:

```bash
npm run deploy
```

## API Endpoints

### Get Avatar

```
GET /avatars/{uuid}.png
```

Returns the player's skin PNG.

### Get Player Info

```
GET /api/player/{name}
```

Returns player info including avatar URL.

### Get Player Avatar URL

```
GET /api/player/{name}/avatar
```

Returns the avatar CDN URL.

### List Players

```
GET /api/players
```

Returns all players with avatars.

### Health Check

```
GET /api/health
```

Returns API status.

## CDN Usage

Direct avatar access:

```html
<img src="https://your-domain.com/avatars/{uuid}.png" />
```

With custom domain:

```html
<img src="https://tongcraft-cdn.example.com/avatars/{uuid}.png" />
```

## License

MIT
