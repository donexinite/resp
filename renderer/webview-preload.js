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

// 6. Fully disable WebAuthn / passkey — prevents Windows Security fingerprint
//    dialog from appearing at any point during sign-in flows
try {
  if (window.PublicKeyCredential) {
    // Tell the page no platform authenticator exists
    window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable =
      () => Promise.resolve(false);
    // Tell the page conditional mediation (autofill passkey) is unavailable
    window.PublicKeyCredential.isConditionalMediationAvailable =
      () => Promise.resolve(false);
    // Stub the constructor so nothing can instantiate it
    window.PublicKeyCredential = function () {
      throw new DOMException('Not supported', 'NotSupportedError');
    };
  }
} catch (_) {}

// 7. Block ALL credential requests that involve publicKey (WebAuthn/passkey)
//    regardless of mediation mode — catches conditional, silent AND required
try {
  const _credGet = navigator.credentials?.get?.bind(navigator.credentials);
  const _credCreate = navigator.credentials?.create?.bind(navigator.credentials);
  if (navigator.credentials && _credGet) {
    Object.defineProperty(navigator, 'credentials', {
      value: {
        get: (opts) => {
          if (opts?.publicKey || opts?.mediation === 'conditional' || opts?.mediation === 'silent') {
            return Promise.reject(new DOMException('NotAllowedError', 'NotAllowedError'));
          }
          return _credGet(opts);
        },
        create: (opts) => {
          if (opts?.publicKey) {
            return Promise.reject(new DOMException('NotAllowedError', 'NotAllowedError'));
          }
          return _credCreate ? _credCreate(opts) : Promise.reject(new DOMException('NotAllowedError', 'NotAllowedError'));
        },
        store:          () => Promise.resolve(),
        preventSilentAccess: () => Promise.resolve(),
      },
      configurable: true,
      writable: false,
    });
  }
} catch (_) {}
