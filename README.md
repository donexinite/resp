# RespGPT

A floating AI overlay proof-of-concept demonstrating how an always-on-top window
can access multiple AI services during a proctored exam session — built for
**responsible disclosure to Respondus LockDown Browser**.

> **This tool was created to demonstrate a real security vulnerability.**
> It is intended for review by Respondus security and IT teams so the
> issue can be identified and patched. It is not intended for use in
> actual exam environments.

---

## What It Demonstrates

RespGPT shows that a lightweight Electron overlay can:

- Sit **above all other windows** (including LockDown Browser) using system-level `alwaysOnTop`
- **Evade screen capture** — the window can be made invisible to all screenshot and
  recording tools using `setContentProtection`, meaning proctoring software that
  captures the screen would not detect its presence
- **Auto-type AI responses** character by character into any input field, avoiding
  clipboard-based detection
- Access **ChatGPT, Claude, Gemini, and Perplexity** simultaneously in a single panel
- Persist across virtual desktops and workspace switches

These capabilities combined represent a meaningful gap in screen-capture-based
proctoring approaches.

---

## Features

| Feature | Description |
|---|---|
| Floating pill | 800×52px pill sits at top-center of screen, always on top |
| 4 AI tabs | ChatGPT, Claude, Gemini, Perplexity — each in a persistent webview |
| Auto-type | Types AI responses char-by-char at configurable WPM, no clipboard used |
| Shield mode | Toggles screen-capture invisibility (`setContentProtection`) |
| Screenshot | Captures screen with overlay hidden, so AI can see the exam content |
| Dark / Light mode | Theme toggle, preference saved across sessions |
| Opacity slider | Adjustable window transparency |
| Auto-update | Checks GitHub for updates on launch, one-click install |

---

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl+Shift+Space` | Toggle expand / collapse |
| `Escape` | Collapse panel or close auto-type panel |

---

## Installation (Windows)

1. Download `RespGPT-Setup.zip` from [Releases](../../releases)
2. Extract the zip
3. Double-click `RespGPT-Setup.bat`
4. Press `1` to Install

A desktop shortcut and Start Menu entry will be created automatically.
The app appears as a thin pill at the very top-center of your screen.

---

## Setup Requirements

- Windows 10 or 11
- No admin rights required
- No additional software needed — everything is bundled

---

## Update Workflow (for maintainers)

```
1. Edit source files in the RespGPT folder
2. Bump "version" in package.json and version.json
3. Run: powershell -ExecutionPolicy Bypass -File update-release.ps1
4. Rename dist\win-unpacked\resources\app.asar → RespGPT.asar
5. Upload RespGPT.asar + version.json to this repo
6. Create a new GitHub Release and attach RespGPT-Setup.zip
```

Users will see an update banner automatically on next launch.

---

## Responsible Disclosure

This project exists to give Respondus concrete evidence of the vulnerability
so it can be patched. The core issue is that OS-level APIs (`setContentProtection`
on Windows/macOS, `alwaysOnTop` at `screen-saver` level) allow a process to
remain functional and undetectable by screen-capture-based monitoring tools.

A process-level scan on launch would be the most effective mitigation —
specifically checking for Electron-based processes and windows flagged
`WS_EX_LAYERED` or `WS_EX_TOPMOST` at a level above the browser.

---

## License

This project is provided for educational and security research purposes only.
