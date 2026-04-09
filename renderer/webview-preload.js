'use strict';
// Runs inside every webview + OAuth popup before any page script
// Hides Electron fingerprints from Cloudflare/Google/bot detection

// 1. Hide webdriver flag (most important)
try {
  Object.defineProperty(navigator, 'webdriver', { get: () => undefined, configurable: true });
} catch (_) {}

// 2. Spoof realistic plugin list
try {
  Object.defineProperty(navigator, 'plugins', {
    get: () => {
      const arr = [
        { name: 'Chrome PDF Plugin',  filename: 'internal-pdf-viewer',          description: 'Portable Document Format', length: 1 },
        { name: 'Chrome PDF Viewer',  filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai', description: '',                    length: 1 },
        { name: 'Native Client',      filename: 'internal-nacl-plugin',          description: '',                         length: 2 },
      ];
      arr.item      = i => arr[i];
      arr.namedItem = n => arr.find(p => p.name === n) || null;
      arr.refresh   = () => {};
      return arr;
    },
    configurable: true,
  });
} catch (_) {}

// 3. Realistic language list
try {
  Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'], configurable: true });
} catch (_) {}

// 4. Chrome runtime object Google expects
if (!window.chrome) {
  window.chrome = {
    app:       { isInstalled: false, InstallState: {}, RunningState: {} },
    runtime:   { onMessage: { addListener: () => {} }, id: undefined },
    loadTimes: () => ({}),
    csi:       () => ({}),
  };
}

// 5. Hide Electron-specific globals
try { delete window.__electronData; } catch (_) {}
try { delete window.process;        } catch (_) {}
try { delete window.require;        } catch (_) {}

// 6. Suppress passkey/WebAuthn conditional mediation (stops passkey popup
//    from interrupting while user is typing their email address)
try {
  if (window.PublicKeyCredential) {
    window.PublicKeyCredential.isConditionalMediationAvailable =
      () => Promise.resolve(false);
    window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable =
      () => Promise.resolve(false);
  }
} catch (_) {}

// 7. Prevent credential manager from auto-triggering passkey picker on input focus
try {
  const _get = navigator.credentials?.get?.bind(navigator.credentials);
  if (_get) {
    Object.defineProperty(navigator.credentials, 'get', {
      value: (opts) => {
        // Block silent/conditional passkey requests; allow explicit user-triggered ones
        if (opts?.mediation === 'conditional' || opts?.mediation === 'silent') {
          return Promise.reject(new DOMException('Not allowed', 'NotAllowedError'));
        }
        return _get(opts);
      },
      configurable: true,
    });
  }
} catch (_) {}
