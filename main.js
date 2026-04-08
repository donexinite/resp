'use strict';

const {
  app, BrowserWindow, ipcMain, globalShortcut,
  Tray, Menu, desktopCapturer, screen, nativeImage, clipboard, shell, Notification
} = require('electron');
const path  = require('path');
const os    = require('os');
const fs    = require('fs');
const https = require('https');
const { exec, spawn } = require('child_process');

// ── Error handling ─────────────────────────────────────────────────────────────
process.on('uncaughtException',  e => console.error('UNCAUGHT:',  e && e.stack || e));
process.on('unhandledRejection', e => console.error('UNHANDLED:', e));

// ── Constants ──────────────────────────────────────────────────────────────────
const UPDATE_URL   = 'https://raw.githubusercontent.com/donexinite/resp/main';
const PILL_H       = 52;
const PANEL_H      = 660;
const WIN_W_FULL   = 820;
const WIN_W_MINI   = 440;
const SNAP_PX      = 14;        // how close to edge before snap kicks in
const SHORTCUT_KEY = 'CommandOrControl+Shift+Space';

// ── State ──────────────────────────────────────────────────────────────────────
let win          = null;
let tray         = null;
let isExpanded   = false;
let isProtected  = false;
let isTyping     = false;
let isAnimating  = false;

// ── Config (persisted to userData) ─────────────────────────────────────────────
const CONFIG_FILE = path.join(app.getPath('userData'), 'respgpt-config.json');
const DEFAULT_CONFIG = {
  x: null,
  y: null,
  mini: false,
  opacity: 1.0,
  theme: 'dark',
  accent: '#a78bfa',
  activeTab: 'chatgpt',
  shortcutEnabled: true,
  startOnBoot: false,
  alwaysOnTop: true,
  zoomFactors: { chatgpt: 1, claude: 1, gemini: 1, perplexity: 1, walterw: 1 },
  templates: [],          // [{id, title, body}]
  dismissedUpdate: '',
  cleanupPrompted: false, // shown old-install cleanup prompt
};
let config = { ...DEFAULT_CONFIG };

function loadConfig() {
  try {
    const raw = fs.readFileSync(CONFIG_FILE, 'utf8');
    config = { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
    if (!config.zoomFactors) config.zoomFactors = { ...DEFAULT_CONFIG.zoomFactors };
    if (!Array.isArray(config.templates)) config.templates = [];
  } catch (_) { config = { ...DEFAULT_CONFIG }; }
}
function saveConfig() {
  try { fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf8'); } catch (_) {}
}
let saveTimer = null;
function scheduleSave() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => { saveTimer = null; saveConfig(); }, 400);
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function winW() { return config.mini ? WIN_W_MINI : WIN_W_FULL; }

function centeredInitialPos(w) {
  const { workArea } = screen.getPrimaryDisplay();
  return {
    x: Math.round(workArea.x + (workArea.width - w) / 2),
    y: workArea.y + 2,
  };
}

function clampToScreen(x, y, w, h) {
  const display = screen.getDisplayNearestPoint({ x, y }) || screen.getPrimaryDisplay();
  const a = display.workArea;
  const nx = Math.max(a.x, Math.min(x, a.x + a.width  - w));
  const ny = Math.max(a.y, Math.min(y, a.y + a.height - h));
  return { x: nx, y: ny };
}

function animateTo(targetH, done) {
  if (isAnimating) return;
  isAnimating = true;
  const w      = winW();
  const startH = win.getBounds().height;
  const diff   = targetH - startH;
  const steps  = 22;
  const dur    = targetH > PILL_H ? 280 : 200;
  const step_t = dur / steps;
  let   i      = 0;
  const ease   = targetH > PILL_H
    ? t => 1 - Math.pow(1 - t, 3)
    : t => t * (2 - t);
  const id = setInterval(() => {
    i++;
    const t = Math.min(i / steps, 1);
    const h = Math.round(startH + diff * ease(t));
    const b = win.getBounds();
    win.setBounds({ x: b.x, y: b.y, width: w, height: h });
    if (i >= steps) {
      clearInterval(id);
      const b2 = win.getBounds();
      win.setBounds({ x: b2.x, y: b2.y, width: w, height: targetH });
      isAnimating = false;
      if (done) done();
    }
  }, step_t);
}

function doExpand() {
  if (isExpanded || !win) return;
  win.show();
  animateTo(PANEL_H, () => {
    isExpanded = true;
    win.webContents.send('expanded');
    refreshTrayMenu();
  });
}

function doCollapse() {
  if (!isExpanded || !win) return;
  animateTo(PILL_H, () => {
    isExpanded = false;
    win.webContents.send('collapsed');
    refreshTrayMenu();
  });
}

function toggleExpand() {
  if (!win) return;
  if (isAnimating) return;
  if (isExpanded) doCollapse(); else doExpand();
}

// ── Create window ──────────────────────────────────────────────────────────────
function createWindow() {
  loadConfig();

  const w = winW();
  const initial = (config.x != null && config.y != null)
    ? clampToScreen(config.x, config.y, w, PILL_H)
    : centeredInitialPos(w);

  win = new BrowserWindow({
    width:  w,
    height: PILL_H,
    x: initial.x,
    y: initial.y,
    frame:   false,
    transparent: true,
    alwaysOnTop: config.alwaysOnTop,
    skipTaskbar: true,
    resizable:   false,
    hasShadow:   false,
    visibleOnAllWorkspaces: true,
    focusable:   true,
    webPreferences: {
      preload:          path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      sandbox:          false,
      nodeIntegration:  false,
      webviewTag:       true,
      backgroundThrottling: false,
    },
  });

  if (config.alwaysOnTop) win.setAlwaysOnTop(true, 'screen-saver');
  win.setOpacity(config.opacity);
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  // Push config to renderer once DOM ready
  win.webContents.on('did-finish-load', () => {
    win.webContents.send('config-loaded', config);
  });

  // Update checker — on launch + every 30 minutes
  setTimeout(checkUpdates, 4000);
  setInterval(checkUpdates, 30 * 60 * 1000);

  // Old-install cleanup prompt (first launch only)
  if (!config.cleanupPrompted) {
    setTimeout(scanOldInstalls, 6000);
  }
}

// ── IPC (registered once, globally) ────────────────────────────────────────────
function registerIPC() {
  ipcMain.on('toggle-expand',  () => toggleExpand());
  ipcMain.on('collapse-only',  () => doCollapse());
  ipcMain.on('expand-only',    () => doExpand());

  // ── Drag with snap-to-edges ──
  let dragOffsetX = 0, dragOffsetY = 0, dragging = false;
  ipcMain.on('drag-start', (_e, screenX, screenY) => {
    if (!win) return;
    const b = win.getBounds();
    dragOffsetX = screenX - b.x;
    dragOffsetY = screenY - b.y;
    dragging = true;
  });
  ipcMain.on('drag-move', (_e, screenX, screenY) => {
    if (!win || !dragging) return;
    let x = screenX - dragOffsetX;
    let y = screenY - dragOffsetY;
    const b = win.getBounds();
    const display = screen.getDisplayNearestPoint({ x, y }) || screen.getPrimaryDisplay();
    const a = display.workArea;
    // snap
    if (Math.abs(x - a.x) < SNAP_PX) x = a.x;
    if (Math.abs((x + b.width)  - (a.x + a.width))  < SNAP_PX) x = a.x + a.width  - b.width;
    if (Math.abs(y - a.y) < SNAP_PX) y = a.y;
    if (Math.abs((y + b.height) - (a.y + a.height)) < SNAP_PX) y = a.y + a.height - b.height;
    win.setPosition(x, y);
  });
  ipcMain.on('drag-end', () => {
    if (!win) return;
    dragging = false;
    const b = win.getBounds();
    config.x = b.x;
    config.y = b.y;
    scheduleSave();
  });

  // ── Context menu ──
  ipcMain.on('show-context-menu', () => {
    if (!win) return;
    Menu.buildFromTemplate([
      { label: 'RespGPT', enabled: false },
      { type: 'separator' },
      { label: isExpanded ? 'Collapse' : 'Expand', click: toggleExpand },
      { label: 'Mini mode', type: 'checkbox', checked: config.mini, click: () => toggleMini() },
      { label: 'Always on top', type: 'checkbox', checked: config.alwaysOnTop, click: () => setAlwaysOnTop(!config.alwaysOnTop) },
      { type: 'separator' },
      { label: 'Center on screen', click: () => centerPill() },
      { label: 'Reset position', click: () => resetPosition() },
      { type: 'separator' },
      { label: 'Quit RespGPT', click: () => app.quit() },
    ]).popup({ window: win });
  });

  // ── Opacity ──
  ipcMain.on('set-opacity', (_e, val) => {
    if (!win) return;
    config.opacity = val;
    win.setOpacity(val);
    scheduleSave();
  });

  // ── Shield ──
  ipcMain.handle('toggle-protection', () => {
    isProtected = !isProtected;
    try { win.setContentProtection(isProtected); } catch (_) {}
    return isProtected;
  });

  // ── Screenshot ──
  ipcMain.handle('take-screenshot', async () => {
    const prevOp = config.opacity;
    win.setOpacity(0);
    await new Promise(r => setTimeout(r, 180));
    try {
      const display = screen.getPrimaryDisplay();
      const sources = await desktopCapturer.getSources({
        types: ['screen'],
        thumbnailSize: {
          width:  Math.round(display.size.width),
          height: Math.round(display.size.height),
        },
      });
      win.setOpacity(prevOp);
      return sources.length ? sources[0].thumbnail.toDataURL() : null;
    } catch (_) {
      win.setOpacity(prevOp);
      return null;
    }
  });

  // ── Auto-type ──
  ipcMain.handle('type-text', async (_e, text, wpm) => {
    if (isTyping) return false;
    isTyping = true;

    const delay   = Math.max(12, Math.round(60000 / ((wpm || 70) * 5)));
    const txtFile = path.join(os.tmpdir(), 'respgpt_text.txt');
    const ps1File = path.join(os.tmpdir(), 'respgpt_type.ps1');
    const tf      = txtFile.replace(/\\/g, '\\\\');

    fs.writeFileSync(txtFile, text, 'utf8');

    const ps1Lines = [
      'Add-Type -AssemblyName System.Windows.Forms',
      '$t = [System.IO.File]::ReadAllText(\'' + tf + '\', [System.Text.Encoding]::UTF8)',
      '$baseDelay = ' + delay,
      '$rng = New-Object System.Random',
      'for ($i = 0; $i -lt $t.Length; $i++) {',
      '  $c = $t[$i]',
      '  switch ($c) {',
      '    "`n" { [System.Windows.Forms.SendKeys]::SendWait("{ENTER}"); Start-Sleep -Milliseconds ($baseDelay * 3) }',
      '    "`t" { [System.Windows.Forms.SendKeys]::SendWait("{TAB}") }',
      '    "+"  { [System.Windows.Forms.SendKeys]::SendWait("{+}") }',
      '    "^"  { [System.Windows.Forms.SendKeys]::SendWait("{^}") }',
      '    "%"  { [System.Windows.Forms.SendKeys]::SendWait("{%}") }',
      '    "~"  { [System.Windows.Forms.SendKeys]::SendWait("{~}") }',
      '    "("  { [System.Windows.Forms.SendKeys]::SendWait("{(}") }',
      '    ")"  { [System.Windows.Forms.SendKeys]::SendWait("{)}") }',
      '    "{"  { [System.Windows.Forms.SendKeys]::SendWait("{{}") }',
      '    "}"  { [System.Windows.Forms.SendKeys]::SendWait("{}}") }',
      '    default { [System.Windows.Forms.SendKeys]::SendWait($c) }',
      '  }',
      '  if ($c -eq "." -or $c -eq "!" -or $c -eq "?") {',
      '    Start-Sleep -Milliseconds ($baseDelay * 6)',
      '  } elseif ($c -eq "," -or $c -eq ";" -or $c -eq ":") {',
      '    Start-Sleep -Milliseconds ($baseDelay * 3)',
      '  } elseif ($c -eq " ") {',
      '    $variation = $rng.Next([int]($baseDelay * 0.7), [int]($baseDelay * 1.3) + 1)',
      '    Start-Sleep -Milliseconds $variation',
      '    if ($rng.Next(12) -eq 0) { Start-Sleep -Milliseconds ($baseDelay * 10) }',
      '  } else {',
      '    $variation = $rng.Next([int]($baseDelay * 0.8), [int]($baseDelay * 1.2) + 1)',
      '    Start-Sleep -Milliseconds $variation',
      '  }',
      '}',
    ];
    fs.writeFileSync(ps1File, ps1Lines.join('\r\n'), 'utf8');

    return new Promise(resolve => {
      exec(
        'powershell -ExecutionPolicy Bypass -NonInteractive -WindowStyle Hidden -File "' + ps1File + '"',
        () => {
          try { fs.unlinkSync(ps1File); } catch (_) {}
          try { fs.unlinkSync(txtFile); } catch (_) {}
          isTyping = false;
          if (win) win.webContents.send('typing-done');
          resolve(true);
        }
      );
    });
  });
  ipcMain.on('stop-typing', () => {
    exec('taskkill /f /im powershell.exe', () => {
      isTyping = false;
      if (win) win.webContents.send('typing-done');
    });
  });

  // ── Updates ──
  ipcMain.on('download-update', () => downloadUpdate());
  ipcMain.on('dismiss-update', (_e, version) => {
    config.dismissedUpdate = version;
    saveConfig();
  });

  // ── Mini mode ──
  ipcMain.on('toggle-mini', () => toggleMini());

  // ── Global shortcut toggle ──
  ipcMain.on('set-shortcut', (_e, enabled) => {
    config.shortcutEnabled = !!enabled;
    scheduleSave();
    registerGlobalShortcut();
  });

  // ── Always on top ──
  ipcMain.on('set-always-on-top', (_e, on) => setAlwaysOnTop(!!on));

  // ── Theme/accent/active tab persistence ──
  ipcMain.on('set-theme',    (_e, t) => { config.theme    = t; scheduleSave(); });
  ipcMain.on('set-accent',   (_e, a) => { config.accent   = a; scheduleSave(); });
  ipcMain.on('set-active-tab', (_e, t) => { config.activeTab = t; scheduleSave(); });
  ipcMain.on('set-zoom',     (_e, svc, z) => {
    if (!config.zoomFactors) config.zoomFactors = {};
    config.zoomFactors[svc] = z;
    scheduleSave();
  });

  // ── Launch on startup ──
  ipcMain.on('set-start-on-boot', (_e, on) => {
    config.startOnBoot = !!on;
    scheduleSave();
    try {
      app.setLoginItemSettings({
        openAtLogin: !!on,
        path:        process.execPath,
        args:        ['--autostart'],
      });
    } catch (_) {}
  });

  // ── Prompt templates ──
  ipcMain.handle('get-templates', () => config.templates || []);
  ipcMain.on('save-template', (_e, tpl) => {
    if (!Array.isArray(config.templates)) config.templates = [];
    const existing = config.templates.findIndex(t => t.id === tpl.id);
    if (existing >= 0) config.templates[existing] = tpl;
    else config.templates.push(tpl);
    saveConfig();
  });
  ipcMain.on('delete-template', (_e, id) => {
    config.templates = (config.templates || []).filter(t => t.id !== id);
    saveConfig();
  });

  // ── Clipboard ──
  ipcMain.handle('read-clipboard', () => clipboard.readText());
  ipcMain.on('write-clipboard', (_e, text) => clipboard.writeText(text || ''));

  // ── Quit ──
  ipcMain.on('quit-app', () => app.quit());

  // ── Center/reset position ──
  ipcMain.on('center-pill', () => centerPill());
  ipcMain.on('reset-position', () => resetPosition());

  // ── Updates on demand ──
  ipcMain.on('check-updates-now', () => checkUpdates());
}

// ── Mini toggle ────────────────────────────────────────────────────────────────
function toggleMini() {
  if (!win) return;
  config.mini = !config.mini;
  const w = winW();
  const b = win.getBounds();
  const nx = clampToScreen(b.x, b.y, w, b.height).x;
  win.setBounds({ x: nx, y: b.y, width: w, height: b.height });
  win.webContents.send('mini-changed', config.mini);
  scheduleSave();
  refreshTrayMenu();
}

// ── Always on top ──────────────────────────────────────────────────────────────
function setAlwaysOnTop(on) {
  if (!win) return;
  config.alwaysOnTop = on;
  win.setAlwaysOnTop(on, on ? 'screen-saver' : 'normal');
  win.webContents.send('aot-changed', on);
  scheduleSave();
  refreshTrayMenu();
}

// ── Center / reset ─────────────────────────────────────────────────────────────
function centerPill() {
  if (!win) return;
  const w = winW();
  const b = win.getBounds();
  const { workArea } = screen.getPrimaryDisplay();
  const nx = Math.round(workArea.x + (workArea.width - w) / 2);
  win.setPosition(nx, b.y);
  config.x = nx; config.y = b.y;
  scheduleSave();
}
function resetPosition() {
  if (!win) return;
  const w = winW();
  const pos = centeredInitialPos(w);
  const b = win.getBounds();
  win.setPosition(pos.x, pos.y);
  config.x = pos.x; config.y = pos.y;
  scheduleSave();
}

// ── Global shortcut ────────────────────────────────────────────────────────────
function registerGlobalShortcut() {
  try { globalShortcut.unregister(SHORTCUT_KEY); } catch (_) {}
  if (config.shortcutEnabled) {
    try { globalShortcut.register(SHORTCUT_KEY, toggleExpand); } catch (_) {}
  }
}

// ── Tray ───────────────────────────────────────────────────────────────────────
function createTray() {
  const iconPath = path.join(__dirname, 'assets', 'icon.png');
  let img;
  try {
    img = nativeImage.createFromPath(iconPath);
    if (img.isEmpty()) img = nativeImage.createEmpty();
    else img = img.resize({ width: 16, height: 16 });
  } catch (_) { img = nativeImage.createEmpty(); }

  tray = new Tray(img);
  tray.setToolTip('RespGPT');
  refreshTrayMenu();
  tray.on('click', () => toggleExpand());
}

function refreshTrayMenu() {
  if (!tray) return;
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'RespGPT', enabled: false },
    { type: 'separator' },
    { label: isExpanded ? 'Collapse' : 'Expand', click: toggleExpand },
    { label: 'Mini mode',     type: 'checkbox', checked: config.mini,        click: toggleMini },
    { label: 'Always on top', type: 'checkbox', checked: config.alwaysOnTop, click: () => setAlwaysOnTop(!config.alwaysOnTop) },
    { type: 'separator' },
    { label: 'Center on screen', click: centerPill },
    { label: 'Reset position',   click: resetPosition },
    { type: 'separator' },
    { label: 'Check for updates', click: checkUpdates },
    { type: 'separator' },
    { label: 'Quit', click: () => app.quit() },
  ]));
}

// ── Old-install cleanup ────────────────────────────────────────────────────────
function scanOldInstalls() {
  const currentDir = path.dirname(app.getPath('exe')).toLowerCase();
  const targets    = ['RespGPT.exe', 'NotchGPT.exe'];
  const searchDirs = [
    os.homedir(),
    path.join(os.homedir(), 'Desktop'),
    path.join(os.homedir(), 'Downloads'),
    path.join(os.homedir(), 'Documents'),
    'C:\\',
    'D:\\',
  ];

  const found = new Set();

  for (const base of searchDirs) {
    try {
      const entries = fs.readdirSync(base, { withFileTypes: true });
      for (const e of entries) {
        if (!e.isDirectory()) continue;
        const dir = path.join(base, e.name);
        if (dir.toLowerCase() === currentDir) continue;
        for (const exe of targets) {
          try {
            fs.accessSync(path.join(dir, exe));
            found.add(dir);
          } catch (_) {}
        }
      }
    } catch (_) {}
  }

  config.cleanupPrompted = true;
  saveConfig();

  if (found.size > 0 && win) {
    win.webContents.send('old-installs-found', [...found]);
  }
}

ipcMain.on('delete-old-installs', (_e, dirs) => {
  for (const dir of dirs) {
    try { fs.rmSync(dir, { recursive: true, force: true }); } catch (_) {}
  }
});

// ── Auto-updater ───────────────────────────────────────────────────────────────
function checkUpdates() {
  https.get(UPDATE_URL + '/version.json', { headers: { 'User-Agent': 'RespGPT' } }, res => {
    let data = '';
    res.on('data', c => data += c);
    res.on('end', () => {
      try {
        const remote = JSON.parse(data);
        const cur = app.getVersion().split('.').map(Number);
        const rem = (remote.version || '0.0.0').split('.').map(Number);
        const newer = rem[0] > cur[0]
          || (rem[0] === cur[0] && rem[1] > cur[1])
          || (rem[0] === cur[0] && rem[1] === cur[1] && rem[2] > cur[2]);
        if (newer && remote.version !== config.dismissedUpdate && win) {
          win.webContents.send('update-available', {
            version: remote.version,
            current: app.getVersion(),
            notes:   remote.notes || '',
          });
          // System notification so users see it even with panel closed
          if (Notification.isSupported()) {
            const n = new Notification({
              title: 'RespGPT update available',
              body:  `v${remote.version} is ready — open RespGPT to install it.`,
              silent: true,
            });
            n.on('click', () => { if (win) { win.show(); doExpand(); } });
            n.show();
          }
        }
      } catch (_) {}
    });
  }).on('error', () => {});
}

function downloadUpdate() {
  const tmpPath  = path.join(os.tmpdir(), 'RespGPT-update.tmp');
  const asarPath = path.join(process.resourcesPath, 'app.asar');
  const batPath  = path.join(os.tmpdir(), 'respgpt-update.bat');

  if (win) win.webContents.send('update-progress', 0);

  function doGet(url, hops) {
    if (hops > 5) { if (win) win.webContents.send('update-error', 'Too many redirects'); return; }
    https.get(url, { headers: { 'User-Agent': 'RespGPT' } }, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return doGet(res.headers.location, hops + 1);
      }
      if (res.statusCode !== 200) {
        if (win) win.webContents.send('update-error', 'HTTP ' + res.statusCode);
        return;
      }
      const total = parseInt(res.headers['content-length'] || '0', 10);
      let received = 0;
      const chunks = [];
      res.on('data', c => {
        chunks.push(c);
        received += c.length;
        if (total > 0 && win) win.webContents.send('update-progress', Math.round(received / total * 100));
      });
      res.on('end', () => {
        try {
          fs.writeFileSync(tmpPath, Buffer.concat(chunks));
          if (win) win.webContents.send('update-progress', 100);
          const bat = [
            '@echo off',
            'timeout /t 2 /nobreak >nul',
            'copy /y "' + tmpPath + '" "' + asarPath + '"',
            'start "" "' + process.execPath + '"',
            'del "%~f0"',
          ].join('\r\n');
          fs.writeFileSync(batPath, bat, 'utf8');
          spawn('cmd.exe', ['/c', batPath], { detached: true, stdio: 'ignore', windowsHide: true }).unref();
          setTimeout(() => app.exit(0), 800);
        } catch (e) { if (win) win.webContents.send('update-error', e.message); }
      });
    }).on('error', e => { if (win) win.webContents.send('update-error', e.message); });
  }

  doGet(UPDATE_URL + '/RespGPT.asar', 0);
}

// ── Webview permissions + keyboard shortcut forwarding ────────────────────────
app.on('web-contents-created', (_e, contents) => {
  if (contents.getType() === 'webview') {
    contents.session.setPermissionRequestHandler((_wc, _p, cb) => cb(true));
    contents.session.setPermissionCheckHandler(() => true);
  }
  // Forward shortcuts from WEBVIEWS only — when focus is in a webview, our
  // renderer's document.keydown doesn't fire, so we intercept at the main level.
  // The main window uses its own document.keydown handler.
  if (contents.getType() !== 'webview') return;

  contents.on('before-input-event', (e, input) => {
    if (input.type !== 'keyDown' || !win) return;
    const ctrl  = input.control || input.meta;
    const shift = input.shift;
    const key   = (input.key || '').toLowerCase();

    if (ctrl && !shift && key === 'k') {
      e.preventDefault();
      win.webContents.send('hotkey', { name: 'cmdk' });
    } else if (ctrl && !shift && /^[1-5]$/.test(input.key)) {
      e.preventDefault();
      win.webContents.send('hotkey', { name: 'tab', index: parseInt(input.key, 10) - 1 });
    } else if (ctrl && !shift && key === 'r') {
      e.preventDefault();
      win.webContents.send('hotkey', { name: 'reload' });
    } else if (ctrl && !shift && (input.key === '=' || input.key === '+')) {
      e.preventDefault();
      win.webContents.send('hotkey', { name: 'zoom-in' });
    } else if (ctrl && !shift && input.key === '-') {
      e.preventDefault();
      win.webContents.send('hotkey', { name: 'zoom-out' });
    } else if (ctrl && !shift && input.key === '0') {
      e.preventDefault();
      win.webContents.send('hotkey', { name: 'zoom-reset' });
    } else if (ctrl && shift && key === 'v') {
      e.preventDefault();
      win.webContents.send('hotkey', { name: 'quick-paste' });
    } else if (input.key === 'Escape') {
      win.webContents.send('hotkey', { name: 'escape' });
    }
  });
});

// ── Single instance ────────────────────────────────────────────────────────────
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (win) { win.show(); if (!isExpanded) doExpand(); }
  });

  app.whenReady().then(() => {
    registerIPC();
    createWindow();
    createTray();
    registerGlobalShortcut();
  });

  app.on('will-quit', () => globalShortcut.unregisterAll());
  app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
}
