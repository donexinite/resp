'use strict';
// Runs inside every webview before any page script — hides Electron fingerprints from Cloudflare/bot detection

// 1. Hide webdriver flag (most important — Cloudflare checks this first)
try {
  Object.defineProperty(navigator, 'webdriver', { get: () => undefined, configurable: true });
} catch (_) {}

// 2. Spoof realistic plugin list
try {
  Object.defineProperty(navigator, 'plugins', {
    get: () => {
      const arr = [
        { name: 'Chrome PDF Plugin',      filename: 'internal-pdf-viewer',  description: 'Portable Document Format', length: 1 },
        { name: 'Chrome PDF Viewer',      filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai', description: '',         length: 1 },
        { name: 'Native Client',          filename: 'internal-nacl-plugin',  description: '',                         length: 2 },
      ];
      arr.item   = i => arr[i];
      arr.namedItem = n => arr.find(p => p.name === n) || null;
      arr.refresh   = () => {};
      return arr;
    },
    configurable: true,
  });
} catch (_) {}

// 3. Ensure languages look real
try {
  Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'], configurable: true });
} catch (_) {}

// 4. Spoof chrome runtime object that real Chrome has
if (!window.chrome) {
  window.chrome = {
    app:     { isInstalled: false, InstallState: {}, RunningState: {} },
    runtime: { onMessage: { addListener: () => {} }, id: undefined },
    loadTimes: () => ({}),
    csi:       () => ({}),
  };
}

// 5. Hide Electron-specific globals
try { delete window.__electronData;     } catch (_) {}
try { delete window.process;            } catch (_) {}
try { delete window.require;            } catch (_) {}
