'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('respAPI', {
  // ── Window ──
  toggle:           ()       => ipcRenderer.send('toggle-expand'),
  expand:           ()       => ipcRenderer.send('expand-only'),
  collapseOnly:     ()       => ipcRenderer.send('collapse-only'),
  dragStart:        (x, y)   => ipcRenderer.send('drag-start', x, y),
  dragMove:         (x, y)   => ipcRenderer.send('drag-move',  x, y),
  dragEnd:          ()       => ipcRenderer.send('drag-end'),
  showContextMenu:  ()       => ipcRenderer.send('show-context-menu'),
  centerPill:       ()       => ipcRenderer.send('center-pill'),
  resetPosition:    ()       => ipcRenderer.send('reset-position'),
  quitApp:          ()       => ipcRenderer.send('quit-app'),

  // ── Settings ──
  setOpacity:       v        => ipcRenderer.send('set-opacity', v),
  toggleProtection: ()       => ipcRenderer.invoke('toggle-protection'),
  toggleMini:       ()       => ipcRenderer.send('toggle-mini'),
  setShortcut:      enabled  => ipcRenderer.send('set-shortcut', enabled),
  setAlwaysOnTop:   on       => ipcRenderer.send('set-always-on-top', on),
  setStartOnBoot:   on       => ipcRenderer.send('set-start-on-boot', on),
  setTheme:         t        => ipcRenderer.send('set-theme', t),
  setAccent:        a        => ipcRenderer.send('set-accent', a),
  setActiveTab:     t        => ipcRenderer.send('set-active-tab', t),
  setZoom:          (svc, z) => ipcRenderer.send('set-zoom', svc, z),

  // ── Tools ──
  screenshot:       ()              => ipcRenderer.invoke('take-screenshot'),
  typeText:         (text, wpm)     => ipcRenderer.invoke('type-text', text, wpm),
  stopTyping:       ()              => ipcRenderer.send('stop-typing'),
  readClipboard:    ()              => ipcRenderer.invoke('read-clipboard'),
  writeClipboard:   text            => ipcRenderer.send('write-clipboard', text),

  // ── Templates ──
  getTemplates:     ()              => ipcRenderer.invoke('get-templates'),
  saveTemplate:     tpl             => ipcRenderer.send('save-template', tpl),
  deleteTemplate:   id              => ipcRenderer.send('delete-template', id),

  // ── Updates ──
  downloadUpdate:   ()              => ipcRenderer.send('download-update'),
  dismissUpdate:    v               => ipcRenderer.send('dismiss-update', v),
  checkUpdatesNow:  ()              => ipcRenderer.send('check-updates-now'),

  // ── Listeners ──
  onHotkey:          cb => ipcRenderer.on('hotkey',           (_e, d) => cb(d)),
  onConfigLoaded:    cb => ipcRenderer.on('config-loaded',    (_e, c) => cb(c)),
  onExpanded:        cb => ipcRenderer.on('expanded',         ()      => cb()),
  onCollapsed:       cb => ipcRenderer.on('collapsed',        ()      => cb()),
  onMiniChanged:     cb => ipcRenderer.on('mini-changed',     (_e, v) => cb(v)),
  onAOTChanged:      cb => ipcRenderer.on('aot-changed',      (_e, v) => cb(v)),
  onTypingDone:      cb => ipcRenderer.on('typing-done',      ()      => cb()),
  onUpdateAvailable:    cb => ipcRenderer.on('update-available',    (_e, d) => cb(d)),
  onUpdateProgress:     cb => ipcRenderer.on('update-progress',     (_e, p) => cb(p)),
  onUpdateError:        cb => ipcRenderer.on('update-error',        (_e, m) => cb(m)),
  onUpdateCheckResult:  cb => ipcRenderer.on('update-check-result', (_e, msg)  => cb(msg)),
  onOldInstallsFound:   cb => ipcRenderer.on('old-installs-found',  (_e, dirs) => cb(dirs)),
  deleteOldInstalls:    dirs => ipcRenderer.send('delete-old-installs', dirs),
});
