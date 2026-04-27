import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import http from 'http';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = parseInt(process.argv.find((_, i, a) => a[i - 1] === '--port') || '3000');
const AVATARS_DIR = path.join(__dirname, '..', 'avatars');
const SKINS_DIR = path.join(__dirname, '..', 'skins');
const DATA_DIR = path.join(__dirname, '..', 'data');

const avatarCache = new Map();
const skinCache = new Map();
const playersData = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'players.json'), 'utf-8'));
const players = playersData.players || [];

fs.readdirSync(AVATARS_DIR)
  .filter(f => f.endsWith('.png'))
  .forEach(f => {
    avatarCache.set(f.replace('.png', ''), fs.readFileSync(path.join(AVATARS_DIR, f)));
  });

if (fs.existsSync(SKINS_DIR)) {
  fs.readdirSync(SKINS_DIR)
    .filter(f => f.endsWith('.png'))
    .forEach(f => {
      skinCache.set(f.replace('.png', ''), fs.readFileSync(path.join(SKINS_DIR, f)));
    });
}

const html = generateHTML(players, avatarCache.size);

function assetPath(pathname) {
  return process.env.STATIC_EXPORT ? pathname.replace(/^\//, '') : pathname;
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function generateHTML(players, count) {
  const cards = players.map(p => {
    const has = avatarCache.has(p.uuid);
    const name = escapeHTML(p.name);
    const uuid = escapeHTML(p.uuid);
    const img = has ? `<img src="${assetPath(`/avatars/${uuid}.png`)}" loading="lazy" alt="${name}">` : `<div class="na">${name[0] || '?'}</div>`;
    const model = escapeHTML(p.skinModel || 'unknown');
    const texture = p.skinUrl ? 'Texture ready' : 'Name lookup';
    return `<article class="card" data-name="${name.toLowerCase()}" data-uuid="${uuid}">
      <div class="avatar">${img}</div>
      <div class="brand">${name}</div>
      <div class="meta">${model} · ${texture}</div>
      <div class="actions">
        <button type="button" class="swatch" onclick="copyAvatar('${uuid}')" title="Copy avatar URL">头像</button>
        <button type="button" onclick="copyGive('${uuid}')" title="Copy Minecraft give command">指令</button>
        <button type="button" onclick="open3d('${uuid}')" title="Open 3D viewer">3D</button>
      </div>
    </article>`;
  }).join('');

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Tongcraft CDN</title><style>
*{margin:0;padding:0;box-sizing:border-box}
:root{--bg:#f7f7f5;--fg:#111;--muted:#666;--line:#d9d9d6;--card:#fff;--soft:#f1f1ef;--accent:#111}
body{font-family:Inter,ui-sans-serif,system-ui,-apple-system,sans-serif;background:var(--bg);color:var(--fg);padding:20px 34px 34px}
body.dark{--bg:#151515;--fg:#f5f5f5;--muted:#aaa;--line:#333;--card:#202020;--soft:#2a2a2a;--accent:#f5f5f5}
header{display:flex;align-items:flex-start;justify-content:space-between;gap:24px;margin-bottom:28px}
header h1{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:25px;font-weight:800;letter-spacing:.2px}
header p{font-size:14px;margin-top:8px;color:var(--fg)}
.header-actions{display:flex;gap:16px;align-items:center;color:var(--fg);font-size:13px;white-space:nowrap}
.header-actions button{border:0;background:transparent;color:inherit;cursor:pointer;font:inherit;padding:4px 2px}
.bar{display:grid;grid-template-columns:minmax(220px,1fr) auto auto auto;gap:14px;align-items:end;margin-bottom:20px}
.control{display:flex;flex-direction:column;gap:6px;font-size:13px;color:var(--muted)}
.control input{width:100%;height:34px;border:1px solid var(--line);border-radius:3px;background:var(--card);color:var(--fg);padding:0 12px;font-size:14px;outline:none}
.control input:focus{border-color:var(--fg)}
.group{display:flex;border:1px solid var(--line);border-radius:3px;overflow:hidden;background:var(--card);height:34px}
.group button{min-width:34px;border:0;border-right:1px solid var(--line);background:var(--card);color:var(--fg);font-weight:700;cursor:pointer;padding:0 9px}
.group button:last-child{border-right:0}
.group button.on,.group button:hover{background:var(--accent);color:var(--bg)}
.count{font-size:13px;color:var(--muted);align-self:center;white-space:nowrap}
.g{display:grid;grid-template-columns:repeat(auto-fill,minmax(184px,1fr));gap:8px}
.card{min-height:181px;border:1px solid var(--line);border-radius:5px;background:var(--card);display:grid;grid-template-rows:1fr auto auto 28px;overflow:hidden;box-shadow:0 1px 2px rgba(0,0,0,.08)}
.card:hover{box-shadow:0 2px 10px rgba(0,0,0,.12);transform:translateY(-1px)}
.avatar{height:116px;display:flex;align-items:center;justify-content:center;padding:18px;background:var(--card)}
.avatar img{width:80px;height:80px;border-radius:10px;image-rendering:pixelated;object-fit:cover}
.na{width:80px;height:80px;border-radius:10px;display:flex;align-items:center;justify-content:center;background:#111;color:#fff;font-size:32px;font-weight:800}
.brand{font-size:16px;font-weight:700;line-height:1.2;padding:0 12px 4px;word-break:break-word;color:var(--fg)}
.meta{font-size:11px;color:var(--muted);padding:0 12px 8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.actions{display:grid;grid-template-columns:1fr 45px 39px;border-top:1px solid var(--line);height:28px}
.actions button{border:0;border-right:1px solid var(--line);background:var(--card);color:var(--fg);font-size:12px;font-weight:700;cursor:pointer}
.actions button:last-child{border-right:0}
.actions button:hover{background:var(--soft)}
.actions .swatch{background:#111;color:#fff;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}
body.dark .actions .swatch{background:#f5f5f5;color:#111}
.t{position:fixed;bottom:24px;left:50%;transform:translateX(-50%) translateY(12px);padding:9px 18px;background:#111;color:#fff;border-radius:6px;font-size:13px;opacity:0;transition:.2s;pointer-events:none;white-space:nowrap;z-index:200}
.t.on{opacity:1;transform:translateX(-50%) translateY(0)}
@media (max-width:780px){body{padding:16px}.bar{grid-template-columns:1fr 1fr}.count{grid-column:1 / -1}.g{grid-template-columns:repeat(auto-fill,minmax(150px,1fr))}}
.viewer-backdrop{position:fixed;inset:0;z-index:100;background:rgba(0,0,0,.62);display:flex;align-items:center;justify-content:center;padding:28px}
.viewer-modal{width:min(980px,100%);height:min(720px,calc(100vh - 56px));background:#161616;color:#fff;border:1px solid rgba(255,255,255,.12);border-radius:8px;box-shadow:0 24px 80px rgba(0,0,0,.45);display:grid;grid-template-columns:240px 1fr;overflow:hidden}
.viewer-panel{background:#202020;border-right:1px solid rgba(255,255,255,.1);padding:16px;display:flex;flex-direction:column;gap:12px}
.viewer-top{display:flex;align-items:center;justify-content:space-between;gap:12px}
.viewer-title{font-size:14px;font-weight:700}
.viewer-close{width:30px;height:30px;border:1px solid rgba(255,255,255,.16);background:#2b2b2b;color:#fff;border-radius:6px;cursor:pointer;font-size:18px;line-height:1}
.viewer-close:hover{background:#383838}
.viewer-panel select{width:100%;padding:8px 10px;border:1px solid #444;border-radius:6px;background:#2f2f2f;color:#fff;font-size:13px;outline:none}
.viewer-meta{font-size:12px;color:#aaa;line-height:1.6;word-break:break-all}
.viewer-meta strong{display:block;color:#fff;font-size:13px;line-height:1.35;margin-bottom:4px}
.viewer-parts{display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:12px;color:#ddd}
.viewer-part{display:flex;align-items:center;gap:7px;min-height:24px;cursor:pointer;user-select:none}
.viewer-part input{width:14px;height:14px;accent-color:#fff}
.viewer-part-wide{grid-column:1 / -1}
.viewer-part-actions{display:flex;gap:8px}
.viewer-part-actions button{flex:1;padding:6px 8px;border:1px solid rgba(255,255,255,.16);border-radius:6px;background:#2b2b2b;color:#fff;font-size:12px;cursor:pointer}
.viewer-part-actions button:hover{background:#383838}
.viewer-control-label{font-size:12px;color:#aaa;display:flex;flex-direction:column;gap:6px}
.viewer-stage{position:relative;min-width:0;background:#1a1a1a}
.viewer-stage canvas{position:absolute;inset:0;width:100%;height:100%;display:block}
.viewer-loading{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);font-size:13px;color:#888;pointer-events:none}
.viewer-hint{position:absolute;bottom:14px;left:50%;transform:translateX(-50%);font-size:12px;color:#666;pointer-events:none;white-space:nowrap}
@media (max-width:720px){
  .viewer-backdrop{padding:12px}
  .viewer-modal{height:calc(100vh - 24px);grid-template-columns:1fr;grid-template-rows:auto 1fr}
  .viewer-panel{border-right:0;border-bottom:1px solid rgba(255,255,255,.1)}
}
</style></head><body>
<header>
  <div><h1>Tongcraft Heads</h1><p>${players.length} 个玩家头颅 · ${count} 张头像缓存</p></div>
  <div class="header-actions"><button type="button" onclick="toggleTheme()">◐ 主题</button><button type="button" onclick="copyVisibleGive()">⛏ 复制当前指令</button></div>
</header>
<div class="bar">
  <label class="control">搜索<input id="q" placeholder="按玩家名或 UUID 搜索..." oninput="f()"></label>
  <label class="control">排序<div class="group"><button type="button" class="on" id="sortName" onclick="sortCards('name')">A-Z</button><button type="button" id="sortUuid" onclick="sortCards('uuid')">UUID</button></div></label>
  <label class="control">主题<div class="group"><button type="button" onclick="setTheme(false)">☼</button><button type="button" onclick="setTheme(true)">☾</button></div></label>
  <span class="count" id="cnt">${players.length} players</span>
</div>
<div class="g" id="grid">${cards}</div>
<div class="t" id="t">Copied!</div>
<div id="viewer-root"></div>
<script type="importmap">
{
  "imports": {
    "react": "https://esm.sh/react@18.3.1",
    "react-dom/client": "https://esm.sh/react-dom@18.3.1/client",
    "three": "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js",
    "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/"
  }
}
</script>
<script>window.__PLAYERS__ = ${JSON.stringify(players.map(p => ({ uuid: p.uuid, name: p.name, skinModel: p.skinModel || null, skinUrl: p.skinUrl || null })))};</script>
<script>
function toast(message){var t=document.getElementById('t');t.textContent=message;t.classList.add('on');setTimeout(function(){t.classList.remove('on')},1400)}
function giveCommand(uuid){var p=(window.__PLAYERS__||[]).find(function(player){return player.uuid===uuid});var id=p&&p.name?p.name:uuid;return '/give @p minecraft:player_head[minecraft:profile='+JSON.stringify(id)+'] 1'}
function copyText(text,message){navigator.clipboard.writeText(text).then(function(){toast(message)})}
function copyAvatar(uuid){copyText(new URL('avatars/'+uuid+'.png', location.href).href,'头像 URL 已复制')}
function copyGive(uuid){copyText(giveCommand(uuid),'give 头颅指令已复制')}
function copyVisibleGive(){var commands=Array.from(document.querySelectorAll('.card')).filter(function(c){return c.style.display!=='none'}).map(function(c){return giveCommand(c.dataset.uuid)});copyText(commands.join(String.fromCharCode(10)),commands.length+' 条 give 指令已复制')}
function f(){var q=document.getElementById('q').value.toLowerCase(),n=0;document.querySelectorAll('.card').forEach(function(c){var show=(c.dataset.name+' '+c.dataset.uuid).includes(q);c.style.display=show?'':'none';if(show)n++});document.getElementById('cnt').textContent=n+' players'}
function sortCards(key){var grid=document.getElementById('grid');Array.from(grid.children).sort(function(a,b){return a.dataset[key].localeCompare(b.dataset[key])}).forEach(function(card){grid.appendChild(card)});document.getElementById('sortName').classList.toggle('on',key==='name');document.getElementById('sortUuid').classList.toggle('on',key==='uuid')}
function setTheme(dark){document.body.classList.toggle('dark',dark);localStorage.setItem('theme',dark?'dark':'light')}
function toggleTheme(){setTheme(!document.body.classList.contains('dark'))}
function open3d(uuid){window.dispatchEvent(new CustomEvent('open-3d-viewer',{detail:{uuid:uuid}}))}
window.copyAvatar=copyAvatar;window.copyGive=copyGive;window.copyVisibleGive=copyVisibleGive;window.f=f;window.sortCards=sortCards;window.setTheme=setTheme;window.toggleTheme=toggleTheme;window.open3d=open3d;
setTheme(localStorage.getItem('theme')==='dark')
</script>
<script type="module">
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const players = window.__PLAYERS__ || [];
const h = React.createElement;
const PARTS = [
  ['head', 'Head'],
  ['body', 'Body'],
  ['rightArm', 'Right Arm'],
  ['leftArm', 'Left Arm'],
  ['rightLeg', 'Right Leg'],
  ['leftLeg', 'Left Leg'],
  ['outerLayer', 'Outer Layer']
];
const DEFAULT_VISIBILITY = Object.fromEntries(PARTS.map(([key]) => [key, true]));
const ANIMATIONS = [
  ['none', 'None'],
  ['idle', 'Idle'],
  ['walk', 'Walk'],
  ['run', 'Run'],
  ['wave', 'Wave'],
  ['crouch', 'Crouch']
];

function getRegion(img, u, v, uw, uh) {
  const c = document.createElement('canvas');
  c.width = uw;
  c.height = uh;
  c.getContext('2d').drawImage(img, u, v, uw, uh, 0, 0, uw, uh);
  const tex = new THREE.CanvasTexture(c);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  return tex;
}

function makeSkinCanvas(img) {
  if (img.naturalWidth === 64 && img.naturalHeight === 64) return img;
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 64;
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, 64, 64);
  ctx.drawImage(img, 0, 0);
  const copyFace = (sx, sy, sw, sh, dx, dy) => {
    ctx.save();
    ctx.translate(dx + sw, dy);
    ctx.scale(-1, 1);
    ctx.drawImage(c, sx, sy, sw, sh, 0, 0, sw, sh);
    ctx.restore();
  };
  copyFace(4, 16, 4, 4, 20, 48);
  copyFace(8, 16, 4, 4, 24, 48);
  copyFace(8, 20, 4, 12, 16, 52);
  copyFace(4, 20, 4, 12, 20, 52);
  copyFace(0, 20, 4, 12, 24, 52);
  copyFace(12, 20, 4, 12, 28, 52);
  copyFace(44, 16, 4, 4, 36, 48);
  copyFace(48, 16, 4, 4, 40, 48);
  copyFace(48, 20, 4, 12, 32, 52);
  copyFace(44, 20, 4, 12, 36, 52);
  copyFace(40, 20, 4, 12, 40, 52);
  copyFace(52, 20, 4, 12, 44, 52);
  return c;
}

function isSlimSkin(img) {
  if (img.naturalWidth !== 64 || img.naturalHeight !== 64) return false;
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 64;
  const ctx = c.getContext('2d');
  ctx.drawImage(img, 0, 0);
  const data = ctx.getImageData(0, 0, 64, 64).data;
  const alphaAt = (x, y) => data[(y * 64 + x) * 4 + 3];
  const columnTransparent = (x, y1, y2) => {
    for (let y = y1; y <= y2; y++) if (alphaAt(x, y) !== 0) return false;
    return true;
  };
  return columnTransparent(47, 16, 31) && columnTransparent(54, 20, 31) && columnTransparent(47, 32, 47) && columnTransparent(54, 36, 47);
}

function partMats(img, front, back, left, right, top, bottom, fw, fh, dw) {
  const t = (x, y, w, h) => new THREE.MeshBasicMaterial({ map: getRegion(img, x, y, w, h), transparent: true, alphaTest: 0.5 });
  return [t(...right, dw, fh), t(...left, dw, fh), t(...top, fw, dw), t(...bottom, fw, dw), t(...front, fw, fh), t(...back, fw, fh)];
}

function addOverlay(img, parent, front, back, left, right, top, bottom, fw, fh, dw) {
  const S = 1 / 8;
  const E = S * 0.64;
  const mats = partMats(img, front, back, left, right, top, bottom, fw, fh, dw);
  mats.forEach(m => { m.depthWrite = false; });
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(S * fw + E, S * fh + E, S * dw + E), mats);
  mesh.renderOrder = 1;
  parent.add(mesh);
  return mesh;
}

function markPart(object, part) {
  object.userData.part = part;
  return object;
}

function markOuter(object, part) {
  object.userData.part = part;
  object.userData.outerLayer = true;
  return object;
}

function rememberBase(object) {
  object.userData.basePosition = object.position.clone();
  object.userData.baseRotation = object.rotation.clone();
  return object;
}

function applyPartVisibility(group, visibility) {
  group.traverse(object => {
    const part = object.userData.part;
    if (!part) return;
    object.visible = Boolean(visibility[part]) && (!object.userData.outerLayer || Boolean(visibility.outerLayer));
  });
  window.__partVisibility = { ...visibility };
}

function resetBone(object) {
  if (!object?.userData.basePosition || !object?.userData.baseRotation) return;
  object.position.copy(object.userData.basePosition);
  object.rotation.copy(object.userData.baseRotation);
}

function animateBones(group, action, elapsed) {
  const head = group.getObjectByName('head');
  const body = group.getObjectByName('body');
  const rightArm = group.getObjectByName('rightArm');
  const leftArm = group.getObjectByName('leftArm');
  const rightLeg = group.getObjectByName('rightLeg');
  const leftLeg = group.getObjectByName('leftLeg');
  const bones = [head, body, rightArm, leftArm, rightLeg, leftLeg];
  if (bones.some(bone => !bone)) return;
  bones.forEach(resetBone);

  if (!action || action === 'none') return;

  if (action === 'idle') {
    const breathe = Math.sin(elapsed * 2.2);
    body.position.y += breathe * 0.015;
    head.rotation.y = Math.sin(elapsed * 0.9) * 0.08;
    rightArm.rotation.x = 0.08 + Math.sin(elapsed * 1.7) * 0.04;
    leftArm.rotation.x = 0.08 - Math.sin(elapsed * 1.7) * 0.04;
    return;
  }

  if (action === 'walk' || action === 'run') {
    const speed = action === 'run' ? 8.5 : 4.4;
    const swing = action === 'run' ? 0.9 : 0.55;
    const t = elapsed * speed;
    const s = Math.sin(t) * swing;
    const bounce = Math.abs(Math.cos(t)) * (action === 'run' ? 0.055 : 0.025);
    body.position.y += bounce;
    rightArm.rotation.x = -s;
    leftArm.rotation.x = s;
    rightLeg.rotation.x = s;
    leftLeg.rotation.x = -s;
    rightArm.rotation.z = action === 'run' ? 0.12 : 0.04;
    leftArm.rotation.z = action === 'run' ? -0.12 : -0.04;
    head.rotation.x = Math.sin(t * 0.5) * 0.035;
    return;
  }

  if (action === 'wave') {
    rightArm.rotation.z = -1.25 + Math.sin(elapsed * 7) * 0.35;
    rightArm.rotation.x = -0.15;
    leftArm.rotation.x = 0.12;
    head.rotation.z = Math.sin(elapsed * 2.4) * 0.08;
    return;
  }

  if (action === 'crouch') {
    body.rotation.x = 0.22;
    body.position.y -= 0.16;
    head.position.z -= 0.12;
    head.position.y -= 0.1;
    rightArm.rotation.x = 0.35;
    leftArm.rotation.x = 0.35;
    rightLeg.rotation.x = -0.22;
    leftLeg.rotation.x = -0.22;
  }
}

function buildPlayer(group, img, model, uuid) {
  while (group.children.length) group.remove(group.children[0]);
  const S = 1 / 8;
  const skin = makeSkinCanvas(img);
  const slim = model === 'slim' || (!model && isSlimSkin(img));
  const armWidth = slim ? 3 : 4;
  const armX = S * (8 / 2 + armWidth / 2);
  const rightArmBase = slim
    ? { front:[44,20], back:[51,20], left:[40,20], right:[48,20], top:[44,16], bottom:[47,16] }
    : { front:[44,20], back:[52,20], left:[40,20], right:[48,20], top:[44,16], bottom:[48,16] };
  const rightArmOverlay = slim
    ? { front:[44,36], back:[51,36], left:[40,36], right:[48,36], top:[44,32], bottom:[47,32] }
    : { front:[44,36], back:[52,36], left:[40,36], right:[48,36], top:[44,32], bottom:[48,32] };
  const leftArmBase = slim
    ? { front:[36,52], back:[43,52], left:[32,52], right:[40,52], top:[36,48], bottom:[39,48] }
    : { front:[36,52], back:[44,52], left:[32,52], right:[40,52], top:[36,48], bottom:[40,48] };
  const leftArmOverlay = slim
    ? { front:[52,52], back:[59,52], left:[48,52], right:[56,52], top:[52,48], bottom:[55,48] }
    : { front:[52,52], back:[60,52], left:[48,52], right:[56,52], top:[52,48], bottom:[56,48] };

  window.__viewerState = { uuid, skinModel: slim ? 'slim' : 'classic', sourceModel: model || 'fallback', armWidth };

  const headGroup = new THREE.Group();
  headGroup.name = 'head';
  markPart(headGroup, 'head');
  headGroup.position.y = S * (12 / 2 + 8 / 2);
  rememberBase(headGroup);
  group.add(headGroup);
  headGroup.add(new THREE.Mesh(new THREE.BoxGeometry(S * 8, S * 8, S * 8), partMats(skin, [8,8], [24,8], [0,8], [16,8], [8,0], [16,0], 8, 8, 8)));
  markOuter(addOverlay(skin, headGroup, [40,8], [56,8], [32,8], [48,8], [40,0], [48,0], 8, 8, 8), 'head');

  const bodyGroup = new THREE.Group();
  bodyGroup.name = 'body';
  markPart(bodyGroup, 'body');
  rememberBase(bodyGroup);
  group.add(bodyGroup);
  bodyGroup.add(new THREE.Mesh(new THREE.BoxGeometry(S * 8, S * 12, S * 4), partMats(skin, [20,20], [32,20], [16,20], [28,20], [20,16], [28,16], 8, 12, 4)));
  markOuter(addOverlay(skin, bodyGroup, [20,36], [32,36], [16,36], [28,36], [20,32], [28,32], 8, 12, 4), 'body');

  const rArmGroup = new THREE.Group();
  rArmGroup.name = 'rightArm';
  markPart(rArmGroup, 'rightArm');
  rArmGroup.position.set(-armX, S * 6, 0);
  rememberBase(rArmGroup);
  group.add(rArmGroup);
  const rArmMesh = new THREE.Mesh(new THREE.BoxGeometry(S * armWidth, S * 12, S * 4), partMats(skin, rightArmBase.front, rightArmBase.back, rightArmBase.left, rightArmBase.right, rightArmBase.top, rightArmBase.bottom, armWidth, 12, 4));
  rArmMesh.position.y = -S * 6;
  rArmGroup.add(rArmMesh);
  const rArmOuter = markOuter(addOverlay(skin, rArmGroup, rightArmOverlay.front, rightArmOverlay.back, rightArmOverlay.left, rightArmOverlay.right, rightArmOverlay.top, rightArmOverlay.bottom, armWidth, 12, 4), 'rightArm');
  rArmOuter.position.y = -S * 6;

  const lArmGroup = new THREE.Group();
  lArmGroup.name = 'leftArm';
  markPart(lArmGroup, 'leftArm');
  lArmGroup.position.set(armX, S * 6, 0);
  rememberBase(lArmGroup);
  group.add(lArmGroup);
  const lArmMesh = new THREE.Mesh(new THREE.BoxGeometry(S * armWidth, S * 12, S * 4), partMats(skin, leftArmBase.front, leftArmBase.back, leftArmBase.left, leftArmBase.right, leftArmBase.top, leftArmBase.bottom, armWidth, 12, 4));
  lArmMesh.position.y = -S * 6;
  lArmGroup.add(lArmMesh);
  const lArmOuter = markOuter(addOverlay(skin, lArmGroup, leftArmOverlay.front, leftArmOverlay.back, leftArmOverlay.left, leftArmOverlay.right, leftArmOverlay.top, leftArmOverlay.bottom, armWidth, 12, 4), 'leftArm');
  lArmOuter.position.y = -S * 6;

  const rLegGroup = new THREE.Group();
  rLegGroup.name = 'rightLeg';
  markPart(rLegGroup, 'rightLeg');
  rLegGroup.position.set(-S * 2, -S * 6, 0);
  rememberBase(rLegGroup);
  group.add(rLegGroup);
  const rLegMesh = new THREE.Mesh(new THREE.BoxGeometry(S * 4, S * 12, S * 4), partMats(skin, [4,20], [12,20], [0,20], [8,20], [4,16], [8,16], 4, 12, 4));
  rLegMesh.position.y = -S * 6;
  rLegGroup.add(rLegMesh);
  const rLegOuter = markOuter(addOverlay(skin, rLegGroup, [4,36], [12,36], [0,36], [8,36], [4,32], [8,32], 4, 12, 4), 'rightLeg');
  rLegOuter.position.y = -S * 6;

  const lLegGroup = new THREE.Group();
  lLegGroup.name = 'leftLeg';
  markPart(lLegGroup, 'leftLeg');
  lLegGroup.position.set(S * 2, -S * 6, 0);
  rememberBase(lLegGroup);
  group.add(lLegGroup);
  const lLegMesh = new THREE.Mesh(new THREE.BoxGeometry(S * 4, S * 12, S * 4), partMats(skin, [20,52], [28,52], [16,52], [24,52], [20,48], [24,48], 4, 12, 4));
  lLegMesh.position.y = -S * 6;
  lLegGroup.add(lLegMesh);
  const lLegOuter = markOuter(addOverlay(skin, lLegGroup, [4,52], [12,52], [0,52], [8,52], [4,48], [8,48], 4, 12, 4), 'leftLeg');
  lLegOuter.position.y = -S * 6;
}

function ViewerModal() {
  const [open, setOpen] = useState(false);
  const [uuid, setUuid] = useState(players[0]?.uuid || '');
  const [loading, setLoading] = useState(false);
  const [visibility, setVisibility] = useState(DEFAULT_VISIBILITY);
  const [autoRotate, setAutoRotate] = useState(false);
  const [animation, setAnimation] = useState('idle');
  const canvasRef = useRef(null);
  const viewerRef = useRef(null);
  const visibilityRef = useRef(visibility);
  const autoRotateRef = useRef(autoRotate);
  const animationRef = useRef(animation);
  const player = useMemo(() => players.find(p => p.uuid === uuid) || players[0], [uuid]);

  useEffect(() => {
    visibilityRef.current = visibility;
  }, [visibility]);

  useEffect(() => {
    autoRotateRef.current = autoRotate;
    window.__autoRotate = autoRotate;
  }, [autoRotate]);

  useEffect(() => {
    animationRef.current = animation;
    window.__viewerAnimation = animation;
  }, [animation]);

  useEffect(() => {
    const onOpen = event => {
      setUuid(event.detail.uuid);
      setOpen(true);
    };
    window.addEventListener('open-3d-viewer', onOpen);
    return () => window.removeEventListener('open-3d-viewer', onOpen);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = event => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  useEffect(() => {
    if (!open || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a1a);
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
    camera.position.set(0, 0, 5);
    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 2;
    controls.maxDistance = 10;
    const playerGroup = new THREE.Group();
    scene.add(playerGroup);
    scene.add(new THREE.AmbientLight(0xffffff, 1.2));
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(2, 3, 3);
    scene.add(dirLight);

    const resize = () => {
      const box = canvas.parentElement.getBoundingClientRect();
      renderer.setSize(box.width, box.height, false);
      camera.aspect = box.width / box.height;
      camera.updateProjectionMatrix();
    };
    resize();
    window.addEventListener('resize', resize);

    let frame = 0;
    const clock = new THREE.Clock();
    const animate = () => {
      frame = requestAnimationFrame(animate);
      animateBones(playerGroup, animationRef.current, clock.getElapsedTime());
      if (autoRotateRef.current) {
        playerGroup.rotation.y += 0.01;
      }
      controls.update();
      renderer.render(scene, camera);
    };
    animate();
    viewerRef.current = { playerGroup, resize };

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', resize);
      controls.dispose();
      renderer.dispose();
      viewerRef.current = null;
    };
  }, [open]);

  useEffect(() => {
    if (!open || !player || !viewerRef.current) return;
    setLoading(true);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      buildPlayer(viewerRef.current.playerGroup, img, player.skinModel, player.uuid);
      applyPartVisibility(viewerRef.current.playerGroup, visibilityRef.current);
      viewerRef.current.resize();
      setLoading(false);
    };
    img.onerror = () => {
      if (player.skinUrl && img.src !== player.skinUrl) img.src = player.skinUrl;
      else setLoading(false);
    };
    img.src = 'skins/' + player.uuid + '.png?' + Date.now();
  }, [open, player]);

  useEffect(() => {
    if (!viewerRef.current) return;
    applyPartVisibility(viewerRef.current.playerGroup, visibility);
  }, [visibility]);

  const setAllParts = checked => {
    setVisibility(Object.fromEntries(PARTS.map(([key]) => [key, checked])));
  };

  const togglePart = key => {
    setVisibility(current => ({ ...current, [key]: !current[key] }));
  };

  if (!open || !player) return null;
  return h('div', { className: 'viewer-backdrop', onMouseDown: () => setOpen(false) },
    h('div', { className: 'viewer-modal', onMouseDown: event => event.stopPropagation() },
      h('aside', { className: 'viewer-panel' },
        h('div', { className: 'viewer-top' },
          h('div', { className: 'viewer-title' }, '3D Player Viewer'),
          h('button', { className: 'viewer-close', type: 'button', onClick: () => setOpen(false), 'aria-label': 'Close viewer' }, 'x')
        ),
        h('select', { value: player.uuid, onChange: event => setUuid(event.target.value) },
          players.map(p => h('option', { key: p.uuid, value: p.uuid }, p.name))
        ),
        h('div', { className: 'viewer-meta' },
          h('strong', null, player.name),
          h('div', null, 'UUID: ' + player.uuid),
          h('div', null, 'Model: ' + (player.skinModel || 'unknown'))
        ),
        h('label', { className: 'viewer-part viewer-part-wide' },
          h('input', { type: 'checkbox', checked: autoRotate, onChange: () => setAutoRotate(value => !value) }),
          h('span', null, 'Auto Rotate')
        ),
        h('label', { className: 'viewer-control-label' },
          h('span', null, 'Animation'),
          h('select', { value: animation, onChange: event => setAnimation(event.target.value) },
            ANIMATIONS.map(([value, label]) => h('option', { key: value, value }, label))
          )
        ),
        h('div', { className: 'viewer-parts' },
          PARTS.map(([key, label]) => h('label', { key, className: key === 'outerLayer' ? 'viewer-part viewer-part-wide' : 'viewer-part' },
            h('input', { type: 'checkbox', checked: visibility[key], onChange: () => togglePart(key) }),
            h('span', null, label)
          )),
          h('div', { className: 'viewer-part-actions viewer-part-wide' },
            h('button', { type: 'button', onClick: () => setAllParts(true) }, 'All'),
            h('button', { type: 'button', onClick: () => setAllParts(false) }, 'None')
          )
        )
      ),
      h('div', { className: 'viewer-stage' },
        h('canvas', { id: 'viewer-canvas', ref: canvasRef }),
        loading ? h('div', { className: 'viewer-loading' }, 'Loading skin...') : null,
        h('div', { className: 'viewer-hint' }, 'Drag to rotate - Scroll to zoom')
      )
    )
  );
}

createRoot(document.getElementById('viewer-root')).render(h(ViewerModal));
window.__reactViewerReady = true;
</script></body></html>`;
}

function viewerHTML(players, selected) {
  const options = players.map(p => `<option value="${p.uuid}" ${selected && selected.uuid === p.uuid ? 'selected' : ''}>${p.name}</option>`).join('');
  const defaultPlayer = selected || players[0] || null;
  const defaultUUID = defaultPlayer ? defaultPlayer.uuid : '';
  const defaultName = defaultPlayer ? defaultPlayer.name : '';
  const defaultModel = defaultPlayer?.skinModel || 'unknown';

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>3D Player Viewer - Tongcraft CDN</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:system-ui,-apple-system,sans-serif;background:#1a1a1a;color:#fff;overflow:hidden}
#panel{position:fixed;top:16px;left:16px;z-index:100;background:#222;border-radius:10px;padding:16px;width:220px;box-shadow:0 4px 20px rgba(0,0,0,.5)}
#panel h2{font-size:14px;font-weight:600;margin-bottom:12px;color:#fff}
#panel select{width:100%;padding:8px 10px;border:1px solid #444;border-radius:6px;background:#333;color:#fff;font-size:13px;outline:none;margin-bottom:12px}
#panel select:focus{border-color:#666}
#info{font-size:12px;color:#aaa;line-height:1.5}
#info span{color:#fff}
#canvas{position:fixed;top:0;left:0;width:100vw;height:100vh}
#hint{position:fixed;bottom:16px;left:50%;transform:translateX(-50%);font-size:12px;color:#666}
</style>
</head>
<body>
<div id="panel">
<h2>3D Player Viewer</h2>
<select id="sel" onchange="loadPlayer()">${options}</select>
<div id="info">
<div>Name: <span id="pname">${defaultName}</span></div>
<div>UUID: <span id="puuid">${defaultUUID}</span></div>
<div>Model: <span id="pmodel">${defaultModel}</span></div>
</div>
</div>
<canvas id="canvas"></canvas>
<div id="hint">Drag to rotate &middot; Scroll to zoom</div>
<script type="importmap">
{
  "imports": {
    "three": "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js",
    "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/"
  }
}
</script>
<script>const players = ${JSON.stringify(players.map(p => ({ uuid: p.uuid, name: p.name, skinModel: p.skinModel || null, skinUrl: p.skinUrl || null })))};</script>
<script type="module">
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const canvas = document.getElementById('canvas');
const sel = document.getElementById('sel');
const pname = document.getElementById('pname');
const puuid = document.getElementById('puuid');
const pmodel = document.getElementById('pmodel');

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1a1a);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 0, 5);

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 2;
controls.maxDistance = 10;

const playerGroup = new THREE.Group();
scene.add(playerGroup);

const textureLoader = new THREE.TextureLoader();
let bodyMesh = null;
let headMesh = null;

function getRegion(img, u, v, uw, uh) {
  const c = document.createElement('canvas');
  c.width = uw; c.height = uh;
  c.getContext('2d').drawImage(img, u, v, uw, uh, 0, 0, uw, uh);
  const tex = new THREE.CanvasTexture(c);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  return tex;
}

function makeSkinCanvas(img) {
  if (img.naturalWidth === 64 && img.naturalHeight === 64) return img;

  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 64;
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, 64, 64);
  ctx.drawImage(img, 0, 0);

  const copyFace = (sx, sy, sw, sh, dx, dy) => {
    ctx.save();
    ctx.translate(dx + sw, dy);
    ctx.scale(-1, 1);
    ctx.drawImage(c, sx, sy, sw, sh, 0, 0, sw, sh);
    ctx.restore();
  };

  // Legacy 64x32 skins only define the right arm/leg. Populate the 1.8+ left limb slots.
  copyFace(4, 16, 4, 4, 20, 48);   // left leg top
  copyFace(8, 16, 4, 4, 24, 48);   // left leg bottom
  copyFace(8, 20, 4, 12, 16, 52);  // left leg right (inner)
  copyFace(4, 20, 4, 12, 20, 52);  // left leg front
  copyFace(0, 20, 4, 12, 24, 52);  // left leg left (outer)
  copyFace(12, 20, 4, 12, 28, 52); // left leg back

  copyFace(44, 16, 4, 4, 36, 48);  // left arm top
  copyFace(48, 16, 4, 4, 40, 48);  // left arm bottom
  copyFace(48, 20, 4, 12, 32, 52); // left arm right (inner)
  copyFace(44, 20, 4, 12, 36, 52); // left arm front
  copyFace(40, 20, 4, 12, 40, 52); // left arm left (outer)
  copyFace(52, 20, 4, 12, 44, 52); // left arm back

  return c;
}

function isSlimSkin(img) {
  if (img.naturalWidth !== 64 || img.naturalHeight !== 64) return false;

  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 64;
  const ctx = c.getContext('2d');
  ctx.drawImage(img, 0, 0);
  const data = ctx.getImageData(0, 0, 64, 64).data;
  const alphaAt = (x, y) => data[(y * 64 + x) * 4 + 3];
  const columnTransparent = (x, y1, y2) => {
    for (let y = y1; y <= y2; y++) {
      if (alphaAt(x, y) !== 0) return false;
    }
    return true;
  };

  return (
    columnTransparent(47, 16, 31) &&
    columnTransparent(54, 20, 31) &&
    columnTransparent(47, 32, 47) &&
    columnTransparent(54, 36, 47)
  );
}

// UV coords: [x, y] on 64x64 skin. Three.js face order: +x, -x, +y, -y, +z, -z (right,left,top,bottom,front,back)
// Ref project order: front, back, left, right, top, bottom
function partMats(img, front, back, left, right, top, bottom, fw, fh, sw, sh, dw, dh) {
  const t = (x, y, w, h) => new THREE.MeshBasicMaterial({ map: getRegion(img, x, y, w, h), transparent: true, alphaTest: 0.5 });
  return [t(...right, dw, fh), t(...left, dw, fh), t(...top, fw, dw), t(...bottom, fw, dw), t(...front, fw, fh), t(...back, fw, fh)];
}

function addOverlay(img, parent, front, back, left, right, top, bottom, fw, fh, dw) {
  const S = 1/8, E = S * 0.64;
  const mats = partMats(img, front, back, left, right, top, bottom, fw, fh, dw, dw, dw, dw);
  mats.forEach(m => { m.depthWrite = false; });
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(S*fw+E, S*fh+E, S*dw+E), mats);
  mesh.renderOrder = 1;
  parent.add(mesh);
}

function buildPlayer(img, model) {
  while (playerGroup.children.length) playerGroup.remove(playerGroup.children[0]);
  const S = 1/8;
  const skin = makeSkinCanvas(img);
  const slim = model === 'slim' || (!model && isSlimSkin(img));
  const armWidth = slim ? 3 : 4;
  const armX = S * (8 / 2 + armWidth / 2);
  const rightArmBase = slim
    ? { front:[44,20], back:[51,20], left:[40,20], right:[48,20], top:[44,16], bottom:[47,16] }
    : { front:[44,20], back:[52,20], left:[40,20], right:[48,20], top:[44,16], bottom:[48,16] };
  const rightArmOverlay = slim
    ? { front:[44,36], back:[51,36], left:[40,36], right:[48,36], top:[44,32], bottom:[47,32] }
    : { front:[44,36], back:[52,36], left:[40,36], right:[48,36], top:[44,32], bottom:[48,32] };
  const leftArmBase = slim
    ? { front:[36,52], back:[43,52], left:[32,52], right:[40,52], top:[36,48], bottom:[39,48] }
    : { front:[36,52], back:[44,52], left:[32,52], right:[40,52], top:[36,48], bottom:[40,48] };
  const leftArmOverlay = slim
    ? { front:[52,52], back:[59,52], left:[48,52], right:[56,52], top:[52,48], bottom:[55,48] }
    : { front:[52,52], back:[60,52], left:[48,52], right:[56,52], top:[52,48], bottom:[56,48] };
  window.__viewerState = {
    uuid: sel.value,
    skinModel: slim ? 'slim' : 'classic',
    sourceModel: model || 'fallback',
    armWidth
  };

  // Head (front,back,left,right,top,bottom, fw,fh,dw)
  const headGroup = new THREE.Group();
  headGroup.position.y = S*(12/2 + 8/2);
  playerGroup.add(headGroup);
  headMesh = new THREE.Mesh(new THREE.BoxGeometry(S*8,S*8,S*8),
    partMats(skin,[8,8],[24,8],[0,8],[16,8],[8,0],[16,0], 8,8,8,8,8,8));
  headGroup.add(headMesh);
  addOverlay(skin, headGroup,[40,8],[56,8],[32,8],[48,8],[40,0],[48,0], 8,8,8);

  // Body
  const bodyGroup = new THREE.Group();
  playerGroup.add(bodyGroup);
  bodyMesh = new THREE.Mesh(new THREE.BoxGeometry(S*8,S*12,S*4),
    partMats(skin,[20,20],[32,20],[16,20],[28,20],[20,16],[28,16], 8,12,4,12,4,4));
  bodyGroup.add(bodyMesh);
  addOverlay(skin, bodyGroup,[20,36],[32,36],[16,36],[28,36],[20,32],[28,32], 8,12,4);

  // Right arm
  const rArmGroup = new THREE.Group();
  rArmGroup.position.set(-armX, 0, 0);
  playerGroup.add(rArmGroup);
  rArmGroup.add(new THREE.Mesh(new THREE.BoxGeometry(S*armWidth,S*12,S*4),
    partMats(skin, rightArmBase.front, rightArmBase.back, rightArmBase.left, rightArmBase.right, rightArmBase.top, rightArmBase.bottom, armWidth, 12, 4, 12, 4, 4)));
  addOverlay(skin, rArmGroup, rightArmOverlay.front, rightArmOverlay.back, rightArmOverlay.left, rightArmOverlay.right, rightArmOverlay.top, rightArmOverlay.bottom, armWidth, 12, 4);

  // Left arm
  const lArmGroup = new THREE.Group();
  lArmGroup.position.set(armX, 0, 0);
  playerGroup.add(lArmGroup);
  lArmGroup.add(new THREE.Mesh(new THREE.BoxGeometry(S*armWidth,S*12,S*4),
    partMats(skin, leftArmBase.front, leftArmBase.back, leftArmBase.left, leftArmBase.right, leftArmBase.top, leftArmBase.bottom, armWidth, 12, 4, 12, 4, 4)));
  addOverlay(skin, lArmGroup, leftArmOverlay.front, leftArmOverlay.back, leftArmOverlay.left, leftArmOverlay.right, leftArmOverlay.top, leftArmOverlay.bottom, armWidth, 12, 4);

  // Right leg
  const rLegGroup = new THREE.Group();
  rLegGroup.position.set(-S*2, -S*(12/2+12/2), 0);
  playerGroup.add(rLegGroup);
  rLegGroup.add(new THREE.Mesh(new THREE.BoxGeometry(S*4,S*12,S*4),
    partMats(skin,[4,20],[12,20],[0,20],[8,20],[4,16],[8,16], 4,12,4,12,4,4)));
  addOverlay(skin, rLegGroup,[4,36],[12,36],[0,36],[8,36],[4,32],[8,32], 4,12,4);

  // Left leg
  const lLegGroup = new THREE.Group();
  lLegGroup.position.set(S*2, -S*(12/2+12/2), 0);
  playerGroup.add(lLegGroup);
  lLegGroup.add(new THREE.Mesh(new THREE.BoxGeometry(S*4,S*12,S*4),
    partMats(skin,[20,52],[28,52],[16,52],[24,52],[20,48],[24,48], 4,12,4,12,4,4)));
  addOverlay(skin, lLegGroup,[4,52],[12,52],[0,52],[8,52],[4,48],[8,48], 4,12,4);
}

function loadPlayer() {
  const uuid = sel.value;
  const player = players.find(p => p.uuid === uuid);
  if (!player) return;
  pname.textContent = player.name;
  puuid.textContent = player.uuid;
  pmodel.textContent = player.skinModel || 'unknown';
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => buildPlayer(img, player.skinModel);
  img.onerror = () => {
    if (player.skinUrl && img.src !== player.skinUrl) img.src = player.skinUrl;
  };
  img.src = 'skins/' + uuid + '.png?' + Date.now();
}

const light = new THREE.AmbientLight(0xffffff, 1.2);
scene.add(light);
const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
dirLight.position.set(2, 3, 3);
scene.add(dirLight);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

if (sel.options.length > 0) loadPlayer();

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}
animate();
</script>
</body>
</html>`;
}

const server = http.createServer((req, res) => {
  if (req.url.startsWith('/avatars/')) {
    const uuid = path.basename(req.url.split('?')[0], '.png');
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

  if (req.url.startsWith('/skins/')) {
    const uuid = path.basename(req.url.split('?')[0], '.png');
    const buf = skinCache.get(uuid);
    if (buf) {
      res.writeHead(200, { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=86400' });
      res.end(buf);
    } else {
      res.writeHead(404);
      res.end('Not found');
    }
    return;
  }

  if (req.url.startsWith('/3d/')) {
    const uuid = path.basename(req.url, '.json');
    const player = players.find(p => p.uuid === uuid);
    if (player) {
      res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=86400' });
      res.end(JSON.stringify(player));
    } else {
      res.writeHead(404);
      res.end('Not found');
    }
    return;
  }

  if (req.url === '/3d' || req.url.startsWith('/3d?')) {
    const url = new URL(req.url, 'http://localhost');
    const selected = url.searchParams.get('player') || '';
    const selectedPlayer = selected ? players.find(p => p.uuid === selected || p.name === selected) : null;
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' });
    res.end(viewerHTML(players, selectedPlayer));
    return;
  }

  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' });
  res.end(html);
});

async function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) await copyDir(from, to);
    else fs.copyFileSync(from, to);
  }
}

async function exportStatic() {
  const outDir = path.join(__dirname, '..', 'dist');
  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'index.html'), html);
  fs.writeFileSync(path.join(outDir, '.nojekyll'), '');
  await copyDir(AVATARS_DIR, path.join(outDir, 'avatars'));
  await copyDir(SKINS_DIR, path.join(outDir, 'skins'));
  console.log(`Exported GitHub Pages site to ${outDir}`);
  console.log(`${players.length} players, ${avatarCache.size} avatars`);
}

if (process.env.STATIC_EXPORT) {
  await exportStatic();
} else {
  server.listen(PORT, () => {
    console.log(`http://localhost:${PORT}`);
    console.log(`${players.length} players, ${avatarCache.size} avatars (cached in memory)`);
  });
}
