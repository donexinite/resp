'use strict';

/* ═══════════════════════════════════════════════════════════════════════════
   RespGPT — renderer
   ═══════════════════════════════════════════════════════════════════════════ */

const R = window.respAPI;

// ── State ──────────────────────────────────────────────────────────────────────
let config = null;
let isExpanded    = false;
let isProtected   = false;
let typePanelOpen = false;
let isTyping      = false;
let isMini        = false;
let settingsOpen  = false;
let tplOpen       = false;
let tpOpen        = false;
let tpRunning     = false;
let tpInterval    = null;
let activeSvc     = 'chatgpt';
let isLight       = false;
let pendingUpdateVersion = '';
let cmdkOpen      = false;
let editingTplId  = null;

// ── DOM ────────────────────────────────────────────────────────────────────────
const $ = id => document.getElementById(id);

const pill          = $('pill');
const panel         = $('panel');
const btnReload     = $('btn-reload');
const btnShot       = $('btn-screenshot');
const btnQP         = $('btn-quickpaste');
const btnCopyLast   = $('btn-copy-last');
const btnType       = $('btn-type');
const btnTpl        = $('btn-templates');
const btnTP         = $('btn-teleprompter');
const btnShield     = $('btn-shield');
const btnMini       = $('btn-mini');
const opSlider      = $('opacity-slider');
const opSlider2     = $('opacity-slider-2');
const btnTheme      = $('btn-theme');
const iconMoon      = $('icon-moon');
const iconSun       = $('icon-sun');
const btnSettings   = $('btn-settings');
const btnClose      = $('btn-close');

const typePanel     = $('type-panel');
const typeInput     = $('type-input');
const speedSlider   = $('speed-slider');
const speedLabel    = $('speed-label');
const typeMeta      = $('type-meta');
const btnTypeGo     = $('btn-type-go');
const btnTypeStop   = $('btn-type-stop');
const countdown     = $('countdown');

const updateBar      = $('update-bar');
const updateMsg      = $('update-msg');
const updateBtns     = $('update-btns');
const btnUpdateNow   = $('btn-update-now');
const btnUpdateLater = $('btn-update-later');
const progWrap       = $('update-prog-wrap');
const progBar        = $('update-prog-bar');
const progLbl        = $('update-prog-lbl');

const webviewsDiv   = $('webviews');
const teleDiv       = $('teleprompter');
const tplDiv        = $('templates-panel');
const settingsDiv   = $('settings-panel');

const tpInput       = $('tp-input');
const tpText        = $('tp-text');
const tpDisplay     = $('tp-display');
const tpSpeedSlider = $('tp-speed');
const tpSpeedLbl    = $('tp-speed-lbl');
const tpFontSlider  = $('tp-font');
const tpFontLbl     = $('tp-font-lbl');
const tpLoad        = $('tp-load');
const tpStart       = $('tp-start');
const tpPause       = $('tp-pause');
const tpReset       = $('tp-reset');

const tplList          = $('tpl-list');
const tplEmpty         = $('tpl-empty');
const tplEditor        = $('tpl-editor');
const tplEditorTitle   = $('tpl-editor-title');
const tplEditorBody    = $('tpl-editor-body');
const tplNew           = $('tpl-new');
const tplSave          = $('tpl-save');
const tplCancel        = $('tpl-cancel');

const shortcutToggle   = $('shortcut-toggle');
const aotToggle        = $('aot-toggle');
const startupToggle    = $('startup-toggle');
const btnCenterPill    = $('btn-center-pill');
const btnResetPos      = $('btn-reset-pos');
const btnCheckUpdates  = $('btn-check-updates');
const aboutVersion     = $('about-version');

const cmdk      = $('cmdk');
const cmdkInput = $('cmdk-input');
const cmdkList  = $('cmdk-list');

const toast = $('toast');

const wv = {
  chatgpt:    $('wv-chatgpt'),
  claude:     $('wv-claude'),
  gemini:     $('wv-gemini'),
  perplexity: $('wv-perplexity'),
  walterw:    $('wv-walterw'),
};
const svcOrder = ['chatgpt', 'claude', 'gemini', 'perplexity', 'walterw'];
const svcLabels = {
  chatgpt: 'ChatGPT', claude: 'Claude', gemini: 'Gemini',
  perplexity: 'Perplexity', walterw: 'WalterWrites',
};

// ── Toast ──────────────────────────────────────────────────────────────────────
let toastTimer = null;
function showToast(msg, ms = 2200) {
  if (toastTimer) clearTimeout(toastTimer);
  toast.textContent = msg;
  toast.classList.remove('hidden');
  toastTimer = setTimeout(() => {
    toast.classList.add('hidden');
    toastTimer = null;
  }, ms);
}

// ── Theme ──────────────────────────────────────────────────────────────────────
function applyTheme() {
  document.body.classList.toggle('light', isLight);
  iconMoon.classList.toggle('hidden', isLight);
  iconSun.classList.toggle('hidden', !isLight);
}
btnTheme.addEventListener('click', () => {
  isLight = !isLight;
  applyTheme();
  R.setTheme(isLight ? 'light' : 'dark');
  showToast(isLight ? 'Light mode' : 'Dark mode');
});

// ── Accent color ───────────────────────────────────────────────────────────────
function applyAccent(color) {
  document.documentElement.style.setProperty('--accent', color);
  const hexToRgba = (hex, a) => {
    const h = hex.replace('#', '');
    const r = parseInt(h.substring(0, 2), 16);
    const g = parseInt(h.substring(2, 4), 16);
    const b = parseInt(h.substring(4, 6), 16);
    return `rgba(${r},${g},${b},${a})`;
  };
  document.documentElement.style.setProperty('--accent-dim', hexToRgba(color, 0.18));
  document.querySelectorAll('.swatch').forEach(s => {
    s.classList.toggle('active', s.dataset.color === color);
  });
}
document.querySelectorAll('.swatch').forEach(s => {
  s.addEventListener('click', () => {
    const c = s.dataset.color;
    applyAccent(c);
    R.setAccent(c);
    showToast('Accent updated');
  });
});

// ── Config loaded from main ────────────────────────────────────────────────────
R.onConfigLoaded(cfg => {
  config = cfg;
  isMini = !!cfg.mini;
  document.body.classList.toggle('mini', isMini);
  btnMini.classList.toggle('active', isMini);

  isLight = cfg.theme === 'light';
  applyTheme();

  applyAccent(cfg.accent || '#a78bfa');

  opSlider.value  = Math.round(cfg.opacity * 100);
  opSlider2.value = Math.round(cfg.opacity * 100);

  shortcutToggle.checked = cfg.shortcutEnabled !== false;
  aotToggle.checked      = cfg.alwaysOnTop !== false;
  startupToggle.checked  = !!cfg.startOnBoot;

  if (cfg.appVersion) aboutVersion.textContent = 'v' + cfg.appVersion;

  activeSvc = 'chatgpt';
  switchTab('chatgpt', false);

  if (cfg.zoomFactors) {
    Object.keys(cfg.zoomFactors).forEach(svc => {
      const el = wv[svc];
      if (el) el.addEventListener('dom-ready', () => {
        try { el.setZoomFactor(cfg.zoomFactors[svc] || 1); } catch (_) {}
      }, { once: true });
    });
  }

  loadTemplatesList();
});

// ── Expand / Collapse ──────────────────────────────────────────────────────────
let lastOpenPanel = null; // remember which panel was open when collapsing

function expand()   { panel.classList.remove('hidden'); R.toggle(); }
function collapse() { R.toggle(); }

R.onExpanded(() => {
  isExpanded = true;
  panel.classList.remove('hidden');
  // Restore panel that was open before collapse
  if (lastOpenPanel === 'settings')    { openSettings(true);      lastOpenPanel = null; }
  else if (lastOpenPanel === 'tpl')    { openTemplates(true);     lastOpenPanel = null; }
  else if (lastOpenPanel === 'tp')     { openTeleprompter(true);  lastOpenPanel = null; }
});
R.onCollapsed(() => {
  // Remember which panel was open
  if (settingsOpen) lastOpenPanel = 'settings';
  else if (tplOpen) lastOpenPanel = 'tpl';
  else if (tpOpen)  lastOpenPanel = 'tp';
  else              lastOpenPanel = null;
  isExpanded = false;
  panel.classList.add('hidden');
  closeAllPanels();
});

btnClose.addEventListener('click', () => { if (isExpanded) collapse(); });

document.addEventListener('keydown', e => {
  // Escape — cascade close
  if (e.key === 'Escape') {
    if (cmdkOpen)      { closeCmdK(); return; }
    if (typePanelOpen) { openTypePanel(false); return; }
    if (tplOpen)       { openTemplates(false);  return; }
    if (settingsOpen)  { openSettings(false);   return; }
    if (tpOpen)        { openTeleprompter(false); return; }
    if (isExpanded)    collapse();
    return;
  }

  // Ctrl/Cmd+K — command palette
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault();
    toggleCmdK();
    return;
  }

  // Only intercept these if the panel is open and no text field is focused
  const isTextField = ['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName);
  if (!isExpanded || isTextField) return;

  // Ctrl+1..5 — switch tabs
  if ((e.ctrlKey || e.metaKey) && !e.shiftKey && /^[1-5]$/.test(e.key)) {
    const idx = parseInt(e.key, 10) - 1;
    if (svcOrder[idx]) {
      e.preventDefault();
      switchTab(svcOrder[idx]);
    }
    return;
  }

  // Ctrl+R — reload current tab
  if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'r') {
    e.preventDefault();
    reloadCurrent();
    return;
  }

  // Ctrl+= / Ctrl+- / Ctrl+0 — zoom
  if ((e.ctrlKey || e.metaKey) && (e.key === '=' || e.key === '+')) {
    e.preventDefault();
    zoomBy(0.1);
    return;
  }
  if ((e.ctrlKey || e.metaKey) && e.key === '-') {
    e.preventDefault();
    zoomBy(-0.1);
    return;
  }
  if ((e.ctrlKey || e.metaKey) && e.key === '0') {
    e.preventDefault();
    setZoom(1);
    return;
  }

  // Ctrl+Shift+V — quick paste
  if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'v') {
    e.preventDefault();
    doQuickPaste();
    return;
  }
});

// ── Pill drag ─────────────────────────────────────────────────────────────────
let dragging = false, dragMoved = false, dragStartX = 0, dragStartY = 0;

pill.addEventListener('contextmenu', e => {
  e.preventDefault();
  R.showContextMenu();
});
pill.addEventListener('mousedown', e => {
  if (e.button !== 0) return;
  dragging = true;
  dragMoved = false;
  dragStartX = e.screenX;
  dragStartY = e.screenY;
  R.dragStart(e.screenX, e.screenY);
  e.preventDefault();
});
window.addEventListener('mousemove', e => {
  if (!dragging) return;
  if (Math.abs(e.screenX - dragStartX) > 4 || Math.abs(e.screenY - dragStartY) > 4) dragMoved = true;
  if (dragMoved) R.dragMove(e.screenX, e.screenY);
});
window.addEventListener('mouseup', e => {
  if (e.button !== 0 || !dragging) return;
  dragging = false;
  if (dragMoved) R.dragEnd();
  else           (isExpanded ? collapse() : expand());
  dragMoved = false;
});

// ── Tabs ───────────────────────────────────────────────────────────────────────
function switchTab(svc, persist = true) {
  if (!wv[svc]) return;
  // Close any open panel so the webview is visible
  closeAllPanels();
  document.querySelectorAll('.tab').forEach(t => {
    t.classList.toggle('active', t.dataset.service === svc);
  });
  Object.keys(wv).forEach(k => wv[k].classList.toggle('hidden', k !== svc));
  activeSvc = svc;
  pill.dataset.service = svc;
  if (persist) R.setActiveTab(svc);
  updateTabsState();
}
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => switchTab(tab.dataset.service));
});

// Dim tab underlines when a panel covers the webview area
function updateTabsState() {
  const panelCovering = tpOpen || tplOpen || settingsOpen;
  document.getElementById('tabs').classList.toggle('panel-active', panelCovering);
}

// ── Back navigation ────────────────────────────────────────────────────────────
const btnBack = $('btn-back');
function updateBackBtn() {
  try {
    const canGo = wv[activeSvc] && wv[activeSvc].canGoBack();
    btnBack.style.opacity = canGo ? '1' : '0.3';
    btnBack.style.pointerEvents = canGo ? '' : 'none';
  } catch (_) {}
}
btnBack.addEventListener('click', () => {
  try { if (wv[activeSvc]) wv[activeSvc].goBack(); } catch (_) {}
});
// Update back button state after navigation
Object.values(wv).forEach(webview => {
  webview.addEventListener('did-navigate', updateBackBtn);
  webview.addEventListener('did-navigate-in-page', updateBackBtn);
});

// ── Reload & zoom ──────────────────────────────────────────────────────────────
function reloadCurrent() {
  const el = wv[activeSvc];
  if (!el) return;
  try { el.reload(); showToast('Reloading ' + svcLabels[activeSvc]); } catch (_) {}
}
btnReload.addEventListener('click', reloadCurrent);

function getZoom() {
  try { return wv[activeSvc].getZoomFactor(); } catch (_) { return 1; }
}
function setZoom(z) {
  const el = wv[activeSvc];
  if (!el) return;
  const clamped = Math.max(0.5, Math.min(z, 2.0));
  try { el.setZoomFactor(clamped); } catch (_) {}
  R.setZoom(activeSvc, clamped);
  showToast('Zoom ' + Math.round(clamped * 100) + '%');
}
function zoomBy(delta) { setZoom(getZoom() + delta); }

// ── Screenshot ─────────────────────────────────────────────────────────────────
btnShot.addEventListener('click', async () => {
  showToast('Taking screenshot...');
  const dataURL = await R.screenshot();
  if (!dataURL) { showToast('Screenshot failed'); return; }
  const img = new Image();
  img.onload = () => {
    const c = document.createElement('canvas');
    c.width = img.width; c.height = img.height;
    c.getContext('2d').drawImage(img, 0, 0);
    c.toBlob(async blob => {
      try {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        showToast('Screenshot copied to clipboard');
      } catch {
        showToast('Screenshot taken');
      }
    }, 'image/png');
  };
  img.src = dataURL;
});

// ── Quick paste ────────────────────────────────────────────────────────────────
const pasteScript = text => `
  (function() {
    const text = ${JSON.stringify(text)};
    const sels = [
      '#prompt-textarea',                       // ChatGPT
      'div[contenteditable="true"].ProseMirror', // Claude
      'textarea[aria-label="Enter a prompt here"]', // Gemini
      'textarea',
      'div[contenteditable="true"]',
      'input[type="text"]',
    ];
    for (const s of sels) {
      const el = document.querySelector(s);
      if (!el) continue;
      el.focus();
      if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') {
        const start = el.selectionStart || 0;
        const end   = el.selectionEnd   || 0;
        const v     = el.value || '';
        el.value = v.slice(0, start) + text + v.slice(end);
        const pos = start + text.length;
        el.selectionStart = el.selectionEnd = pos;
        el.dispatchEvent(new Event('input',  { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      } else {
        // contenteditable (ProseMirror, etc)
        try { document.execCommand('insertText', false, text); }
        catch (_) {
          el.textContent = (el.textContent || '') + text;
          el.dispatchEvent(new InputEvent('input', { bubbles: true, data: text, inputType: 'insertText' }));
        }
      }
      return true;
    }
    return false;
  })();
`;

async function doQuickPaste(overrideText) {
  try {
    const text = overrideText ?? (await R.readClipboard());
    if (!text) { showToast('Clipboard is empty'); return; }
    const el = wv[activeSvc];
    if (!el || typeof el.executeJavaScript !== 'function') {
      showToast('Switch to an AI tab first');
      return;
    }
    const result = await el.executeJavaScript(pasteScript(text));
    if (result) showToast('Pasted to ' + svcLabels[activeSvc]);
    else        showToast('Could not find input field');
  } catch {
    showToast('Quick paste failed');
  }
}
btnQP.addEventListener('click', () => doQuickPaste());

// ── Copy last AI response ──────────────────────────────────────────────────────
const copyLastScript = `
  (function() {
    function byQs(sel, isLast = true) {
      const list = document.querySelectorAll(sel);
      if (!list || !list.length) return null;
      return (isLast ? list[list.length - 1] : list[0]).innerText.trim();
    }
    // ChatGPT (data-message-author-role="assistant")
    let t = null;
    const chatgpt = document.querySelectorAll('[data-message-author-role="assistant"] .markdown, [data-message-author-role="assistant"]');
    if (chatgpt.length) t = chatgpt[chatgpt.length - 1].innerText.trim();
    // Claude
    if (!t) { const claude = document.querySelectorAll('[data-testid="chat-message-content"], .font-claude-message');
      if (claude.length) t = claude[claude.length - 1].innerText.trim(); }
    // Gemini
    if (!t) { const gemini = document.querySelectorAll('message-content, .model-response-text');
      if (gemini.length) t = gemini[gemini.length - 1].innerText.trim(); }
    // Perplexity
    if (!t) { const px = document.querySelectorAll('.prose, div[class*="answer"]');
      if (px.length) t = px[px.length - 1].innerText.trim(); }
    return t || null;
  })();
`;
btnCopyLast.addEventListener('click', async () => {
  const el = wv[activeSvc];
  if (!el) { showToast('No active tab'); return; }
  try {
    const text = await el.executeJavaScript(copyLastScript);
    if (!text) { showToast('No response found'); return; }
    R.writeClipboard(text);
    showToast('Copied last response');
  } catch {
    showToast('Copy failed');
  }
});

// ── Opacity ────────────────────────────────────────────────────────────────────
function setOpacity(v) { R.setOpacity(v / 100); }
opSlider .addEventListener('input', () => { opSlider2.value = opSlider.value;  setOpacity(opSlider.value); });
opSlider2.addEventListener('input', () => { opSlider.value  = opSlider2.value; setOpacity(opSlider2.value); });

// ── Shield ─────────────────────────────────────────────────────────────────────
btnShield.addEventListener('click', async () => {
  isProtected = await R.toggleProtection();
  btnShield.classList.toggle('active', isProtected);
  showToast(isProtected ? 'Shield ON' : 'Shield OFF');
});

// ── Mini mode ──────────────────────────────────────────────────────────────────
btnMini.addEventListener('click', () => R.toggleMini());
R.onMiniChanged(mini => {
  isMini = mini;
  document.body.classList.toggle('mini', mini);
  btnMini.classList.toggle('active', mini);
  showToast(mini ? 'Mini mode ON' : 'Mini mode OFF');
});
R.onAOTChanged(on => {
  aotToggle.checked = on;
  showToast(on ? 'Always on top ON' : 'Always on top OFF');
});

// ── Panel helpers (only one open at a time) ────────────────────────────────────
function closeAllPanels() {
  if (typePanelOpen) openTypePanel(false);
  if (tpOpen)        openTeleprompter(false);
  if (tplOpen)       openTemplates(false);
  if (settingsOpen)  openSettings(false);
}
function updateWebviewVisibility() {
  const hideWebviews = tpOpen || tplOpen || settingsOpen;
  webviewsDiv.classList.toggle('hidden', hideWebviews);
  updateTabsState();
}

// ── Auto-type ──────────────────────────────────────────────────────────────────
function updateTypeMeta() {
  const text = typeInput.value;
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const wpm = parseInt(speedSlider.value, 10);
  const secs = Math.round((words / wpm) * 60);
  typeMeta.textContent = words ? `${words} words · ~${secs}s` : '';
}
function openTypePanel(open) {
  typePanelOpen = open;
  typePanel.classList.toggle('hidden', !open);
  btnType.classList.toggle('active', open);
  if (open) { typeInput.focus(); updateTypeMeta(); }
}
btnType.addEventListener('click', () => openTypePanel(!typePanelOpen));
typeInput.addEventListener('input', updateTypeMeta);
speedSlider.addEventListener('input', () => {
  speedLabel.textContent = speedSlider.value + ' WPM';
  updateTypeMeta();
});

btnTypeGo.addEventListener('click', async () => {
  const text = typeInput.value.trim();
  if (!text) { showToast('Paste some text first'); return; }
  if (isTyping) return;
  isTyping = true;
  countdown.classList.remove('hidden');
  for (let i = 3; i >= 1; i--) {
    countdown.textContent = i;
    await new Promise(r => setTimeout(r, 1000));
  }
  countdown.classList.add('hidden');
  btnTypeGo.classList.add('hidden');
  btnTypeStop.classList.remove('hidden');
  R.collapseOnly();
  await new Promise(r => setTimeout(r, 600));
  await R.typeText(text, parseInt(speedSlider.value, 10));
});
btnTypeStop.addEventListener('click', () => R.stopTyping());
R.onTypingDone(() => {
  isTyping = false;
  btnTypeGo.classList.remove('hidden');
  btnTypeStop.classList.add('hidden');
  showToast('Done typing');
});

// ── Teleprompter ───────────────────────────────────────────────────────────────
function openTeleprompter(open) {
  tpOpen = open;
  teleDiv.classList.toggle('hidden', !open);
  updateWebviewVisibility();
  btnTP.classList.toggle('active', open);
  if (!open && tpRunning) stopTeleprompter();
}
btnTP.addEventListener('click', () => {
  if (!tpOpen) closeAllPanels();
  openTeleprompter(!tpOpen);
});

tpSpeedSlider.addEventListener('input', () => {
  tpSpeedLbl.textContent = tpSpeedSlider.value;
  if (tpRunning) { stopTeleprompter(); startTeleprompter(); }
});
tpFontSlider.addEventListener('input', () => {
  tpFontLbl.textContent = tpFontSlider.value;
  tpText.style.fontSize = tpFontSlider.value + 'px';
});

tpLoad.addEventListener('click', () => {
  const text = tpInput.value.trim();
  if (!text) { showToast('Paste a script first'); return; }
  tpText.textContent = text;
  tpText.style.transform = 'translateY(0px)';
  showToast('Script loaded');
});

function startTeleprompter() {
  if (!tpText.textContent.trim()) { showToast('Load a script first'); return; }
  tpRunning = true;
  tpStart.classList.add('hidden');
  tpPause.classList.remove('hidden');
  const speed = parseInt(tpSpeedSlider.value, 10);
  const pxPerTick = speed * 0.35;
  let currentY = 0;
  // Resume from last position if set
  const m = /translateY\((-?\d+(?:\.\d+)?)px\)/.exec(tpText.style.transform || '');
  if (m) currentY = parseFloat(m[1]);
  tpInterval = setInterval(() => {
    currentY -= pxPerTick;
    const maxScroll = -(tpText.offsetHeight - tpDisplay.offsetHeight + 120);
    if (currentY <= maxScroll) {
      currentY = maxScroll;
      stopTeleprompter();
      showToast('End of script');
      return;
    }
    tpText.style.transform = `translateY(${currentY}px)`;
  }, 50);
}
function stopTeleprompter() {
  tpRunning = false;
  clearInterval(tpInterval);
  tpStart.classList.remove('hidden');
  tpPause.classList.add('hidden');
}
tpStart.addEventListener('click', startTeleprompter);
tpPause.addEventListener('click', stopTeleprompter);
tpReset.addEventListener('click', () => {
  stopTeleprompter();
  tpText.style.transform = 'translateY(0px)';
});

// ── Templates ──────────────────────────────────────────────────────────────────
function openTemplates(open) {
  tplOpen = open;
  tplDiv.classList.toggle('hidden', !open);
  updateWebviewVisibility();
  btnTpl.classList.toggle('active', open);
  if (open) {
    closeEditor();
    loadTemplatesList();
  }
}
btnTpl.addEventListener('click', () => {
  if (!tplOpen) closeAllPanels();
  openTemplates(!tplOpen);
});

async function loadTemplatesList() {
  const templates = await R.getTemplates();
  tplList.innerHTML = '';
  if (!templates.length) {
    tplEmpty.classList.remove('hidden');
    return;
  }
  tplEmpty.classList.add('hidden');
  templates.forEach(tpl => {
    const item = document.createElement('div');
    item.className = 'tpl-item';
    item.innerHTML = `
      <div class="tpl-item-title"></div>
      <div class="tpl-item-body"></div>
      <div class="tpl-item-actions">
        <button class="act-paste">Paste</button>
        <button class="act-type">Type</button>
        <button class="act-edit">Edit</button>
        <button class="act-del">Delete</button>
      </div>`;
    item.querySelector('.tpl-item-title').textContent = tpl.title || '(untitled)';
    item.querySelector('.tpl-item-body').textContent  = tpl.body  || '';
    item.querySelector('.act-paste').addEventListener('click', e => {
      e.stopPropagation();
      doQuickPaste(tpl.body);
    });
    item.querySelector('.act-type').addEventListener('click', e => {
      e.stopPropagation();
      openTemplates(false);
      openTypePanel(true);
      typeInput.value = tpl.body;
      updateTypeMeta();
    });
    item.querySelector('.act-edit').addEventListener('click', e => {
      e.stopPropagation();
      openEditor(tpl);
    });
    item.querySelector('.act-del').addEventListener('click', e => {
      e.stopPropagation();
      R.deleteTemplate(tpl.id);
      loadTemplatesList();
      showToast('Template deleted');
    });
    tplList.appendChild(item);
  });
}

function openEditor(tpl) {
  editingTplId = tpl?.id ?? null;
  tplEditorTitle.value = tpl?.title || '';
  tplEditorBody.value  = tpl?.body  || '';
  tplEditor.classList.remove('hidden');
  setTimeout(() => tplEditorTitle.focus(), 30);
}
function closeEditor() {
  tplEditor.classList.add('hidden');
  editingTplId = null;
}
tplNew.addEventListener('click', () => openEditor(null));
tplCancel.addEventListener('click', closeEditor);
tplSave.addEventListener('click', () => {
  const title = tplEditorTitle.value.trim();
  const body  = tplEditorBody.value;
  if (!title || !body) { showToast('Title and content required'); return; }
  const tpl = {
    id: editingTplId || 'tpl-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8),
    title, body,
  };
  R.saveTemplate(tpl);
  closeEditor();
  loadTemplatesList();
  showToast('Template saved');
});

// ── Settings panel ─────────────────────────────────────────────────────────────
function openSettings(open) {
  settingsOpen = open;
  settingsDiv.classList.toggle('hidden', !open);
  updateWebviewVisibility();
  btnSettings.classList.toggle('active', open);
}
btnSettings.addEventListener('click', () => {
  if (!settingsOpen) closeAllPanels();
  openSettings(!settingsOpen);
});

shortcutToggle.addEventListener('change', () => {
  const enabled = shortcutToggle.checked;
  R.setShortcut(enabled);
  showToast(enabled ? 'Shortcut enabled' : 'Shortcut disabled');
});
aotToggle.addEventListener('change', () => {
  R.setAlwaysOnTop(aotToggle.checked);
});
startupToggle.addEventListener('change', () => {
  R.setStartOnBoot(startupToggle.checked);
  showToast(startupToggle.checked ? 'Start with Windows enabled' : 'Start with Windows disabled');
});

btnCenterPill.addEventListener('click', () => { R.centerPill(); showToast('Pill centered'); });
btnResetPos  .addEventListener('click', () => { R.resetPosition(); showToast('Position reset'); });
btnCheckUpdates.addEventListener('click', () => {
  btnCheckUpdates.textContent = 'Checking...';
  btnCheckUpdates.disabled = true;
  R.checkUpdatesNow();
  setTimeout(() => {
    btnCheckUpdates.textContent = 'Check for Updates';
    btnCheckUpdates.disabled = false;
  }, 10000);
});

// ── Updates ────────────────────────────────────────────────────────────────────
const updateBadge = $('update-badge');
updateBadge.addEventListener('click', e => { e.stopPropagation(); R.expand(); });

R.onUpdateAvailable(info => {
  pendingUpdateVersion = info.version;
  updateMsg.textContent = 'Update v' + info.version + ' available';
  updateBar.classList.remove('hidden');
  updateBadge.classList.remove('hidden');
});
btnUpdateNow.addEventListener('click', () => {
  updateBtns.classList.add('hidden');
  progWrap.classList.remove('hidden');
  R.downloadUpdate();
});
btnUpdateLater.addEventListener('click', () => {
  updateBar.classList.add('hidden');
  updateBadge.classList.add('hidden');
  R.dismissUpdate(pendingUpdateVersion);
});
R.onUpdateProgress(pct => {
  progBar.style.setProperty('--p', pct + '%');
  progLbl.textContent = pct >= 100 ? 'Restarting...' : pct + '%';
});
R.onUpdateError(msg => {
  updateBar.classList.add('hidden');
  showToast('Update failed: ' + msg);
});
R.onUpdateCheckResult(({ msg, manual }) => {
  btnCheckUpdates.textContent = 'Check for Updates';
  btnCheckUpdates.disabled = false;
  if (manual) showToast(msg, 3500);
});

// ── OAuth login popup (automatic) ─────────────────────────────────────────────
const oauthNotice        = $('oauth-notice');
const oauthCancelLogin   = $('oauth-cancel-login');
const oauthManualTransfer = $('oauth-manual-transfer');

function hideOAuth() {
  oauthNotice.classList.add('hidden');
  oauthManualTransfer.disabled = false;
  oauthManualTransfer.textContent = "I'm signed in";
}

// Fallback: if browser can't be found, show a toast
R.onOAuthBlocked(({ error } = {}) => {
  if (error) showToast(error, 5000);
});

// Auto-launched: show waiting notice
R.onBrowserLoginStarted(() => {
  oauthNotice.classList.remove('hidden');
});

// Auto or manual transfer complete — reload webview
R.onBrowserLoginDone(({ service }) => {
  hideOAuth();
  showToast('Signed in! Loading…', 2000);
  setTimeout(() => {
    const wv = document.getElementById('wv-' + service);
    if (wv) wv.reload();
  }, 800);
});

// Browser was closed before completing
R.onBrowserLoginCancelled(() => hideOAuth());

oauthCancelLogin.addEventListener('click', () => {
  R.cancelBrowserLogin();
  hideOAuth();
});

// Manual fallback — user clicks "I'm signed in" if auto-detect didn't fire
oauthManualTransfer.addEventListener('click', async () => {
  oauthManualTransfer.disabled = true;
  oauthManualTransfer.textContent = 'Transferring…';
  const res = await R.manualBrowserTransfer(activeSvc);
  if (!res.ok) {
    oauthManualTransfer.disabled = false;
    oauthManualTransfer.textContent = "I'm signed in";
    showToast(res.error || 'Could not read session — make sure you completed sign-in', 5000);
  }
  // on success, browser-login-done IPC fires and handles reload
});

// ── Old-install cleanup ────────────────────────────────────────────────────────
const cleanupModal   = $('cleanup-modal');
const cleanupPaths   = $('cleanup-paths');
const cleanupDelete  = $('cleanup-delete');
const cleanupSkip    = $('cleanup-skip');
const cleanupBackdrop = document.getElementById('cleanup-backdrop');

let pendingCleanupDirs = [];

R.onOldInstallsFound(dirs => {
  if (!dirs || dirs.length === 0) return;
  pendingCleanupDirs = dirs;
  cleanupPaths.innerHTML = dirs.map(d =>
    `<div class="cleanup-path">${d}</div>`
  ).join('');
  cleanupModal.classList.remove('hidden');
});

cleanupDelete.addEventListener('click', () => {
  R.deleteOldInstalls(pendingCleanupDirs);
  cleanupModal.classList.add('hidden');
  showToast('Old versions deleted');
});
cleanupSkip.addEventListener('click', () => {
  cleanupModal.classList.add('hidden');
});
cleanupBackdrop.addEventListener('click', () => {
  cleanupModal.classList.add('hidden');
});

// ── Command palette ────────────────────────────────────────────────────────────
const COMMANDS = [
  { id: 'tab-chatgpt',    label: 'Go to ChatGPT',     hint: 'Ctrl+1', icon: 'chat',    action: () => switchTab('chatgpt') },
  { id: 'tab-claude',     label: 'Go to Claude',      hint: 'Ctrl+2', icon: 'chat',    action: () => switchTab('claude') },
  { id: 'tab-gemini',     label: 'Go to Gemini',      hint: 'Ctrl+3', icon: 'chat',    action: () => switchTab('gemini') },
  { id: 'tab-perplexity', label: 'Go to Perplexity',  hint: 'Ctrl+4', icon: 'chat',    action: () => switchTab('perplexity') },
  { id: 'tab-walterw',    label: 'Go to WalterWrites',hint: 'Ctrl+5', icon: 'chat',    action: () => switchTab('walterw') },
  { id: 'reload',         label: 'Reload current tab',hint: 'Ctrl+R', icon: 'refresh', action: () => reloadCurrent() },
  { id: 'zoom-in',        label: 'Zoom in',           hint: 'Ctrl+=', icon: 'plus',    action: () => zoomBy(0.1) },
  { id: 'zoom-out',       label: 'Zoom out',          hint: 'Ctrl+-', icon: 'minus',   action: () => zoomBy(-0.1) },
  { id: 'zoom-reset',     label: 'Reset zoom',        hint: 'Ctrl+0', icon: 'target',  action: () => setZoom(1) },
  { id: 'quick-paste',    label: 'Quick paste clipboard', hint: 'Ctrl+Shift+V', icon: 'paste', action: () => doQuickPaste() },
  { id: 'copy-last',      label: 'Copy last AI response', icon: 'copy',    action: () => btnCopyLast.click() },
  { id: 'screenshot',     label: 'Take screenshot',   icon: 'camera',  action: () => btnShot.click() },
  { id: 'auto-type',      label: 'Open auto-type',    icon: 'type',    action: () => openTypePanel(true) },
  { id: 'templates',      label: 'Open prompt templates', icon: 'bookmark', action: () => { closeAllPanels(); openTemplates(true); } },
  { id: 'teleprompter',   label: 'Open teleprompter', icon: 'lines',   action: () => { closeAllPanels(); openTeleprompter(true); } },
  { id: 'settings',       label: 'Open settings',     icon: 'gear',    action: () => { closeAllPanels(); openSettings(true); } },
  { id: 'shield',         label: 'Toggle shield',     icon: 'shield',  action: () => btnShield.click() },
  { id: 'mini',           label: 'Toggle mini mode',  icon: 'mini',    action: () => R.toggleMini() },
  { id: 'theme',          label: 'Toggle theme',      icon: 'moon',    action: () => btnTheme.click() },
  { id: 'aot',            label: 'Toggle always on top', icon: 'pin',  action: () => { aotToggle.checked = !aotToggle.checked; R.setAlwaysOnTop(aotToggle.checked); } },
  { id: 'center',         label: 'Center pill on screen', icon: 'target', action: () => R.centerPill() },
  { id: 'quit',           label: 'Quit RespGPT',      icon: 'power',   action: () => R.quitApp() },
];

const CMDK_ICONS = {
  chat:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
  refresh:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>',
  plus:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
  minus:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>',
  target: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>',
  paste:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/></svg>',
  copy:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>',
  camera: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>',
  type:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>',
  bookmark:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>',
  lines:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="15" y2="18"/></svg>',
  gear:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
  shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
  mini:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="8" width="18" height="8" rx="2"/><line x1="8" y1="12" x2="16" y2="12"/></svg>',
  moon:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>',
  pin:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="17" x2="12" y2="22"/><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1V4H8v2h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"/></svg>',
  power:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18.36 6.64a9 9 0 1 1-12.73 0"/><line x1="12" y1="2" x2="12" y2="12"/></svg>',
};

let cmdkFiltered = COMMANDS.slice();
let cmdkIndex = 0;

function openCmdK() {
  cmdkOpen = true;
  cmdk.classList.remove('hidden');
  cmdkInput.value = '';
  cmdkIndex = 0;
  renderCmdK();
  setTimeout(() => cmdkInput.focus(), 30);
}
function closeCmdK() {
  cmdkOpen = false;
  cmdk.classList.add('hidden');
}
function toggleCmdK() {
  if (cmdkOpen) closeCmdK(); else openCmdK();
}
function filterCmdK(q) {
  if (!q) return COMMANDS.slice();
  const qq = q.toLowerCase();
  return COMMANDS.filter(c => c.label.toLowerCase().includes(qq) || c.id.toLowerCase().includes(qq));
}
function renderCmdK() {
  cmdkList.innerHTML = '';
  cmdkFiltered.forEach((cmd, i) => {
    const item = document.createElement('div');
    item.className = 'cmdk-item' + (i === cmdkIndex ? ' active' : '');
    item.innerHTML = `
      ${CMDK_ICONS[cmd.icon] || ''}
      <div class="cmdk-item-label"></div>
      ${cmd.hint ? `<div class="cmdk-item-hint"><kbd>${cmd.hint}</kbd></div>` : ''}`;
    item.querySelector('.cmdk-item-label').textContent = cmd.label;
    item.addEventListener('click', () => {
      closeCmdK();
      cmd.action();
    });
    cmdkList.appendChild(item);
  });
}
cmdkInput.addEventListener('input', () => {
  cmdkFiltered = filterCmdK(cmdkInput.value);
  cmdkIndex = 0;
  renderCmdK();
});
cmdkInput.addEventListener('keydown', e => {
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    cmdkIndex = Math.min(cmdkIndex + 1, cmdkFiltered.length - 1);
    renderCmdK();
    const active = cmdkList.querySelector('.cmdk-item.active');
    if (active) active.scrollIntoView({ block: 'nearest' });
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    cmdkIndex = Math.max(cmdkIndex - 1, 0);
    renderCmdK();
    const active = cmdkList.querySelector('.cmdk-item.active');
    if (active) active.scrollIntoView({ block: 'nearest' });
  } else if (e.key === 'Enter') {
    e.preventDefault();
    const cmd = cmdkFiltered[cmdkIndex];
    if (cmd) {
      closeCmdK();
      cmd.action();
    }
  } else if (e.key === 'Escape') {
    e.preventDefault();
    closeCmdK();
  }
});
$('cmdk-backdrop').addEventListener('click', closeCmdK);

// ── Hotkey router (from main process — works even when webview has focus) ─────
R.onHotkey(data => {
  if (!data || !data.name) return;
  switch (data.name) {
    case 'cmdk':        toggleCmdK(); break;
    case 'tab':         if (svcOrder[data.index]) switchTab(svcOrder[data.index]); break;
    case 'reload':      reloadCurrent(); break;
    case 'zoom-in':     zoomBy(0.1); break;
    case 'zoom-out':    zoomBy(-0.1); break;
    case 'zoom-reset':  setZoom(1); break;
    case 'quick-paste': doQuickPaste(); break;
    case 'escape':
      if (cmdkOpen)      { closeCmdK(); break; }
      if (typePanelOpen) { openTypePanel(false); break; }
      if (tplOpen)       { openTemplates(false); break; }
      if (settingsOpen)  { openSettings(false); break; }
      if (tpOpen)        { openTeleprompter(false); break; }
      if (isExpanded)    collapse();
      break;
  }
});

// ── About — version is set dynamically from config-loaded ──────────────────────
