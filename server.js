// 匠心试炼 · 云同步后端（零依赖，Node.js 内置 http）
// 启动: node server.js   然后浏览器打开 http://localhost:3000
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, 'data');
const DATA_FILE = path.join(DATA_DIR, 'accounts.json');
const HTML_FILE = path.join(ROOT, 'engineers-quest-single.html');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
let accounts = {};
try { accounts = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); } catch (e) { accounts = {}; }

function saveAccounts() {
  try { fs.writeFileSync(DATA_FILE, JSON.stringify(accounts, null, 2)); } catch (e) { console.error('save fail', e); }
}

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  const url = new URL(req.url, `http://localhost:${PORT}`);

  // 读进度
  if (url.pathname === '/api/progress' && req.method === 'GET') {
    const name = url.searchParams.get('name');
    if (!name) { res.writeHead(400, { 'Content-Type': 'application/json' }); res.end('{"error":"name required"}'); return; }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ data: accounts[name] || null }));
    return;
  }

  // 存进度
  if (url.pathname === '/api/progress' && req.method === 'POST') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      try {
        const { name, data } = JSON.parse(body);
        if (!name || !data) { res.writeHead(400, { 'Content-Type': 'application/json' }); res.end('{"error":"bad request"}'); return; }
        data._updated = Date.now();
        accounts[name] = data;
        saveAccounts();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' }); res.end('{"error":"' + e.message + '"}');
      }
    });
    return;
  }

  // 排行榜
  if (url.pathname === '/api/leaderboard') {
    const list = Object.values(accounts)
      .filter(a => a && a.name)
      .map(a => ({ name: a.name, best: a.best || 0, done: (a.done || []).length, extDone: (a.extDone || []).length }))
      .sort((a, b) => b.best - a.best || b.done - a.done)
      .slice(0, 20);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(list));
    return;
  }

  // 游戏页面
  if (url.pathname === '/' || url.pathname === '/index.html') {
    fs.readFile(HTML_FILE, (err, data) => {
      if (err) { res.writeHead(500); res.end('game html not found: ' + HTML_FILE); return; }
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(data);
    });
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' }); res.end('Not found');
});

server.listen(PORT, () => {
  console.log('匠心试炼服务器已启动: http://localhost:' + PORT);
  console.log('账号数据文件: ' + DATA_FILE);
});
