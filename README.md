# RespGPT

A floating AI overlay for Windows that keeps ChatGPT, Claude, Gemini, Perplexity, and WalterWrites always on top of your screen — invisible to screen capture, ready in one keystroke.

---

## Features

### Overlay & Window
- **Always on top** — floats above every window, never gets buried
- **Screen capture protection** — shield mode hides the overlay from OBS, screenshots, and screen share
- **Transparent frameless window** — clean, minimal, no OS chrome
- **Snap to edges** — drag the pill near any screen edge and it snaps cleanly
- **Position memory** — window position is saved and restored across restarts
- **Mini mode** — collapse to half-width to save screen space
- **Launch on startup** — opens automatically with Windows, collapsed and out of the way

### AI Services
| # | Service | Shortcut |
|---|---------|----------|
| 1 | ChatGPT | `Ctrl+1` |
| 2 | Claude | `Ctrl+2` |
| 3 | Gemini | `Ctrl+3` |
| 4 | Perplexity | `Ctrl+4` |
| 5 | WalterWrites | `Ctrl+5` |

### Keyboard Shortcuts
| Shortcut | Action |
|----------|--------|
| `Ctrl+K` | Open command palette |
| `Ctrl+1–5` | Switch AI tab |
| `Ctrl+R` | Reload current tab |
| `Ctrl+=` | Zoom in |
| `Ctrl+-` | Zoom out |
| `Ctrl+0` | Reset zoom |
| `Ctrl+Shift+V` | Quick paste clipboard into AI input |
| `Escape` | Collapse overlay / close panels |

### Command Palette (`Ctrl+K`)
22 commands accessible by typing — switch tabs, reload, zoom, paste, copy last response, templates, teleprompter, settings, shield mode, mini mode, theme, always on top, center window, quit, and more.

### Prompt Templates
- Save frequently used prompts as named templates
- **Paste** — instantly pastes into the active AI's input box
- **Type** — auto-types the prompt at realistic WPM (bypasses paste detection)
- **Edit / Delete** — full CRUD management

### Quick Paste & Copy
- **Quick Paste** (`Ctrl+Shift+V`) — pastes clipboard content directly into the active AI's input field using service-specific selectors
- **Copy Last Response** — scrapes and copies the most recent AI reply to clipboard

### Auto-Typer / Teleprompter
- Type any text at a configurable WPM speed — useful for exams, interviews, and live demos
- Teleprompter mode with adjustable font size, scroll speed, and position memory
- Stop typing at any time

### Appearance
- **Dark / Light theme**
- **6 accent colors** — Purple, Blue, Green, Orange, Pink, Red
- **Opacity control** — slider from 20% to 100%
- **Per-tab zoom** — persisted per service across restarts
- Smooth animations throughout using custom easing curves

### Auto-Updater
- Checks for updates automatically on launch
- In-app download and install — patches `app.asar` in place and relaunches
- Manual check via Settings → Check for Updates or tray menu

---

## Installation

1. Download `RespGPT-vX.X.X.zip` from [Releases](https://github.com/donexinite/resp/releases)
2. Extract the zip anywhere
3. Run `RespGPT.exe` — no install required
4. The pill appears at the top of your screen

> **Updating?** The app updates itself automatically. If you see an update banner inside the app, just click Download — no need to re-download the zip.

---

## Usage

- **Click the pill** to expand / collapse
- **Right-click the pill** for the context menu
- **Drag the pill** to reposition
- **Ctrl+K** to open the command palette from anywhere

---

## Development

```bash
git clone https://github.com/donexinite/resp.git
cd resp
npm install
npm start
```

Built with [Electron](https://www.electronjs.org/).

---

## Requirements

- Windows 10 or 11
- No admin rights required
