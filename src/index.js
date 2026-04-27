/**
 * Cloudflare Worker - Tongcraft CDN API
 * 
 * Provides API for querying player avatars
 * 
 * Routes:
 *   GET /avatars/:uuid.png       - Get player avatar
 *   GET /api/player/:name        - Get player info by name
 *   GET /api/player/:name/avatar - Get avatar URL by name
 *   GET /api/players             - List all players
 *   GET /api/health              - Health check
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    // Handle preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // Route: GET /avatars/:uuid.png
      if (path.startsWith('/avatars/')) {
        return await handleAvatar(path, env, corsHeaders);
      }

      // Route: GET /api/player/:name
      if (path.match(/^\/api\/player\/[^/]+$/)) {
        const name = path.split('/')[3];
        return await handlePlayerInfo(name, env, corsHeaders);
      }

      // Route: GET /api/player/:name/avatar
      if (path.match(/^\/api\/player\/[^/]+\/avatar$/)) {
        const name = path.split('/')[3];
        return await handlePlayerAvatar(name, env, corsHeaders);
      }

      // Route: GET /api/players
      if (path === '/api/players') {
        return await handlePlayersList(env, corsHeaders);
      }

      // Route: GET /api/health
      if (path === '/api/health') {
        return new Response(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // 404
      return new Response(JSON.stringify({ error: 'Not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  },
};

/**
 * Handle avatar file requests
 * GET /avatars/:uuid.png
 */
async function handleAvatar(path, env, corsHeaders) {
  const filename = path.split('/').pop();
  
  // Validate filename format (UUID.png)
  if (!filename.match(/^[0-9a-f]{32}\.png$/i) && !filename.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.png$/i)) {
    return new Response(JSON.stringify({ error: 'Invalid filename format' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Get from R2
  const object = await env.AVATARS_BUCKET.get(`avatars/${filename}`);
  
  if (!object) {
    return new Response(JSON.stringify({ error: 'Avatar not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const headers = {
    ...corsHeaders,
    'Content-Type': 'image/png',
    'Cache-Control': 'public, max-age=86400',
    'ETag': object.httpMetadata?.etag || '',
  };

  return new Response(object.body, { headers });
}

/**
 * Handle player info by name
 * GET /api/player/:name
 */
async function handlePlayerInfo(name, env, corsHeaders) {
  const metaFile = await env.AVATARS_BUCKET.get('data/avatars-meta.json');
  
  if (!metaFile) {
    return new Response(JSON.stringify({ error: 'Metadata not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const meta = await metaFile.json();
  
  // Find player by name (case-insensitive)
  const entry = Object.entries(meta).find(([_, info]) => 
    info.name && info.name.toLowerCase() === name.toLowerCase()
  );

  if (!entry) {
    return new Response(JSON.stringify({ error: 'Player not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const [uuid, info] = entry;
  const cdnBase = env.CDN_BASE || '';
  
  return new Response(JSON.stringify({
    uuid,
    name: info.name,
    avatarUrl: `${cdnBase}/avatars/${uuid}.png`,
    updatedAt: info.updatedAt,
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/**
 * Handle player avatar URL by name
 * GET /api/player/:name/avatar
 */
async function handlePlayerAvatar(name, env, corsHeaders) {
  const metaFile = await env.AVATARS_BUCKET.get('data/avatars-meta.json');
  
  if (!metaFile) {
    return new Response(JSON.stringify({ error: 'Metadata not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const meta = await metaFile.json();
  
  // Find player by name
  const entry = Object.entries(meta).find(([_, info]) => 
    info.name && info.name.toLowerCase() === name.toLowerCase()
  );

  if (!entry) {
    return new Response(JSON.stringify({ error: 'Player not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const [uuid] = entry;
  const cdnBase = env.CDN_BASE || '';
  
  return new Response(JSON.stringify({
    url: `${cdnBase}/avatars/${uuid}.png`,
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/**
 * Handle players list
 * GET /api/players
 */
async function handlePlayersList(env, corsHeaders) {
  const metaFile = await env.AVATARS_BUCKET.get('data/avatars-meta.json');
  
  if (!metaFile) {
    return new Response(JSON.stringify({ players: [] }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const meta = await metaFile.json();
  const cdnBase = env.CDN_BASE || '';
  
  const players = Object.entries(meta).map(([uuid, info]) => ({
    uuid,
    name: info.name,
    avatarUrl: `${cdnBase}/avatars/${uuid}.png`,
    updatedAt: info.updatedAt,
  }));

  return new Response(JSON.stringify({ 
    count: players.length,
    players 
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
