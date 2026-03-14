# DevDeck ⌗

A keyboard-friendly snippet manager for developers — built with [Neutralinojs](https://neutralino.js.org/).

Save your most-used terminal commands, git tricks, SQL queries, and code snippets. Copy them to clipboard in one click, or run bash/git commands directly without opening a terminal.

Built as a sample project for **GSoC 2026 - Neutralinojs** to demonstrate deep understanding of the native API.

---

## Screenshots

> C:\Users\mkalge1\Desktop\trying\devdeck\resources\screenshot.png

---

## Why I built this

Every developer has 20-30 commands they retype or Google every day. Things like killing a stuck port, cleaning up Docker, undoing a git commit. I got tired of doing that and built DevDeck to store them all in one place.

The interesting part was making it feel like a real desktop app — native notifications, system tray integration, actual file dialogs — using nothing but HTML, CSS, and JavaScript on top of Neutralinojs.

---

## Features

- **Save snippets** in categories: bash, js, git, sql, other
- **One-click copy** to clipboard with a native OS notification
- **Run commands** directly (bash/git snippets) without opening a terminal
- **System tray** — app lives in the tray, top 5 snippets accessible by right-clicking
- **Search** through snippets instantly
- **Export** all snippets to a `.json` file
- **Import** snippets from a `.json` file (merges, no duplicates)
- **Persistent storage** — snippets survive app restarts
- **Frameless window** with a custom draggable titlebar
- Keyboard shortcuts: `Ctrl+N` (new), `Escape` (cancel)

---

## Native API Usage

This is the part that matters. DevDeck uses **13 Neutralinojs native APIs** across 6 namespaces:

| API | Namespace | What it does in this app |
|---|---|---|
| `storage.setData` | `Neutralino.storage` | Saves all snippets to persistent local storage |
| `storage.getData` | `Neutralino.storage` | Loads saved snippets on app startup |
| `clipboard.writeText` | `Neutralino.clipboard` | Copies snippet code to system clipboard |
| `os.showNotification` | `Neutralino.os` | Shows a native OS notification after copy |
| `os.setTray` | `Neutralino.os` | Creates tray icon with top 5 snippets as menu items |
| `os.execCommand` | `Neutralino.os` | Executes bash/git snippets directly on the OS |
| `os.showSaveDialog` | `Neutralino.os` | Opens the native "Save As" dialog for export |
| `os.showOpenDialog` | `Neutralino.os` | Opens the native "Open File" dialog for import |
| `filesystem.writeFile` | `Neutralino.filesystem` | Writes exported snippets to a `.json` file |
| `filesystem.readFile` | `Neutralino.filesystem` | Reads imported `.json` file |
| `window.setDraggableRegion` | `Neutralino.window` | Makes the custom titlebar draggable |
| `window.hide` / `window.minimize` | `Neutralino.window` | Custom window controls (borderless window) |
| `events.on` | `Neutralino.events` | Listens for tray clicks and window close events |
| `app.exit` | `Neutralino.app` | Cleanly shuts down the app and background server |

---

## Running locally

You need [Node.js](https://nodejs.org/) and the Neutralinojs CLI installed.

```bash
# install the neu CLI globally (skip if already installed)
npm install -g @neutralinojs/neu

# clone this repo
git clone https://github.com/YOUR_USERNAME/devdeck.git
cd devdeck

# fetch the Neutralinojs binaries
neu update

# run in development mode
neu run
```

To build a standalone binary:

```bash
neu build --release
```

---

## Project structure

```
devdeck/
├── neutralino.config.json   # app config, window settings, API permissions
└── resources/
    ├── index.html           # app structure, custom titlebar, all views
    ├── style.css            # dark theme, layout, component styles
    └── js/
        ├── neutralino.js    # Neutralinojs client library
        └── main.js          # all app logic, API calls, event handling
```

---

## Tech

- **Neutralinojs v6.5.0** — lightweight desktop app framework
- Vanilla JavaScript (no frameworks)
- CSS custom properties for theming
- Fonts: JetBrains Mono + Syne (via Google Fonts)
