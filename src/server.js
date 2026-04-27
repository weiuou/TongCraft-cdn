import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import http from 'http';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = parseInt(process.argv.find((_, i, a) => a[i - 1] === '--port') || '3000');
const AVATARS_DIR = path.join(__dirname, '..', 'avatars');
const DATA_DIR = path.join(__dirname, '..', 'data');

// Pre-load everything into memory at startup
const avatarCache = new Map();
const playersData = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'players.json'), 'utf-8'));
const players = playersData.players || [];

fs.readdirSync(AVATARS_DIR)
  .filter(f => f.endsWith('.png'))
  .forEach(f => {
    avatarCache.set(f.replace('.png', ''), fs.readFileSync(path.join(AVATARS_DIR, f)));
  });

const html = generateHTML(players, avatarCache.size);

function generateHTML(players, count) {
  const cards = players.map(p => {
    const has = avatarCache.has(p.uuid);
    const img = has ? `<img src="/avatars/${p.uuid}.png" loading="lazy">` : `<div class="na">${p.name[0]}</div>`;
    return `<div class="c" onclick="copy('${p.uuid}',this)"><div class="a">${img}</div><div class="n">${p.name}</div></div>`;
  }).join('');

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Tongcraft CDN</title><style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:system-ui,-apple-system,sans-serif;background:#fff;color:#111}
header{padding:24px 32px 0;border-bottom:1px solid #e5e5e5}
header h1{font-size:20px;font-weight:700;letter-spacing:-.3px}
header p{color:#888;font-size:13px;margin:2px 0 16px}
.bar{display:flex;align-items:center;gap:16px;padding:14px 32px;border-bottom:1px solid #e5e5e5;position:sticky;top:0;background:#fff;z-index:10}
.bar input{padding:7px 14px;border:1px solid #ddd;border-radius:6px;font-size:13px;outline:none;width:220px}
.bar input:focus{border-color:#111}
.bar span{font-size:13px;color:#888}
.g{display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:1px;background:#e5e5e5;border-top:1px solid #e5e5e5}
.c{display:flex;flex-direction:column;align-items:center;gap:10px;padding:20px 12px 16px;background:#fff;cursor:pointer;transition:background .1s}
.c:hover{background:#f5f5f5}
.c:active{background:#eee}
.a{width:72px;height:72px;border-radius:8px;overflow:hidden;background:#f0f0f0;flex-shrink:0}
.a img{width:100%;height:100%;image-rendering:pixelated}
.na{width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#111;color:#fff;font-size:28px;font-weight:700}
.n{font-size:12px;font-weight:500;text-align:center;word-break:break-all;line-height:1.3;color:#111}
.t{position:fixed;bottom:24px;left:50%;transform:translateX(-50%) translateY(12px);padding:9px 18px;background:#111;color:#fff;border-radius:6px;font-size:13px;opacity:0;transition:.2s;pointer-events:none;white-space:nowrap}
.t.on{opacity:1;transform:translateX(-50%) translateY(0)}
</style></head><body>
<header><h1>Tongcraft CDN</h1><p>${players.length} players &middot; ${count} avatars</p></header>
<div class="bar"><input id="q" placeholder="Search players..." oninput="f()"><span id="cnt">${players.length} players</span></div>
<div class="g">${cards}</div>
<div class="t" id="t">URL copied!</div>
<script>
function f(){var q=document.getElementById('q').value.toLowerCase(),n=0;document.querySelectorAll('.c').forEach(c=>{var show=c.querySelector('.n').textContent.toLowerCase().includes(q);c.style.display=show?'':'none';if(show)n++});document.getElementById('cnt').textContent=n+' players'}
function copy(uuid,el){var url=location.origin+'/avatars/'+uuid+'.png';navigator.clipboard.writeText(url).then(function(){var t=document.getElementById('t');t.classList.add('on');setTimeout(function(){t.classList.remove('on')},1400)})}
</script></body></html>`;
}

const server = http.createServer((req, res) => {
  if (req.url.startsWith('/avatars/')) {
    const uuid = path.basename(req.url, '.png');
    const buf = avatarCache.get(uuid);
    if (buf) {
      res.writeHead(200, { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=86400' });
      res.end(buf);
    } else {
      res.writeHead(404);
      res.end('Not found');
    }
    return;
  }

  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' });
  res.end(html);
});

server.listen(PORT, () => {
  console.log(`http://localhost:${PORT}`);
  console.log(`${players.length} players, ${avatarCache.size} avatars (cached in memory)`);
});
