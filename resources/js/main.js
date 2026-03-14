// DevDeck - main.js

let snippets = [];
let activeId = null;
let editingId = null;
let currentCat = 'all';
let currentSearch = '';

// ── init ──────────────────────────────────────────────

Neutralino.init();

Neutralino.events.on('windowClose', () => {
  Neutralino.app.exit();
});

Neutralino.events.on('trayMenuItemClicked', (e) => {
  if (e.detail.id === 'quit') {
    Neutralino.app.exit();
  } else if (e.detail.id === 'show') {
    Neutralino.window.show();
    Neutralino.window.focus();
  }
});

document.addEventListener('DOMContentLoaded', async () => {
  await loadSnippets();
  setupTray();
  setupDragRegion();
  bindEvents();
  renderList();
});

// ── tray ──────────────────────────────────────────────

async function setupTray() {
  const trayItems = [
    { id: 'show', text: 'Open DevDeck' },
    { id: 'sep', text: '-' },
  ];

  // put first 5 snippets in tray for quick copy
  const top = snippets.slice(0, 5);
  for (const s of top) {
    trayItems.push({ id: `snip_${s.id}`, text: `📋 ${s.title}` });
  }

  trayItems.push({ id: 'sep2', text: '-' });
  trayItems.push({ id: 'quit', text: 'Quit' });

  await Neutralino.os.setTray({
    icon: '/resources/icons/trayIcon.png',
    menuItems: trayItems
  });
}

// handle tray snippet clicks
Neutralino.events.on('trayMenuItemClicked', async (e) => {
  const id = e.detail.id;
  if (!id.startsWith('snip_')) return;

  const snipId = parseInt(id.replace('snip_', ''));
  const snip = snippets.find(s => s.id === snipId);
  if (!snip) return;

  await Neutralino.clipboard.writeText(snip.code);
  await Neutralino.os.showNotification('DevDeck', `Copied: ${snip.title}`);
});

// ── storage ───────────────────────────────────────────

async function loadSnippets() {
  try {
    const data = await Neutralino.storage.getData('devdeck_snippets');
    snippets = JSON.parse(data);
  } catch {
    // first run, no data yet
    snippets = getDefaultSnippets();
    await saveSnippets();
  }
}

async function saveSnippets() {
  await Neutralino.storage.setData('devdeck_snippets', JSON.stringify(snippets));
  updateCount();
  setupTray(); // refresh tray with latest snippets
}

function getDefaultSnippets() {
  return [
    {
      id: Date.now(),
      title: 'kill process on port',
      desc: 'find and kill whatever is running on a port',
      cat: 'bash',
      code: 'lsof -ti:3000 | xargs kill -9',
      createdAt: new Date().toISOString()
    },
    {
      id: Date.now() + 1,
      title: 'git undo last commit',
      desc: 'undo last commit but keep changes staged',
      cat: 'git',
      code: 'git reset --soft HEAD~1',
      createdAt: new Date().toISOString()
    },
    {
      id: Date.now() + 2,
      title: 'docker clean up',
      desc: 'remove all stopped containers, unused images, and volumes',
      cat: 'bash',
      code: 'docker system prune -a --volumes -f',
      createdAt: new Date().toISOString()
    }
  ];
}

// ── render ────────────────────────────────────────────

function renderList() {
  const list = document.getElementById('snippet-list');
  let filtered = snippets;

  if (currentCat !== 'all') {
    filtered = filtered.filter(s => s.cat === currentCat);
  }

  if (currentSearch.trim()) {
    const q = currentSearch.toLowerCase();
    filtered = filtered.filter(s =>
      s.title.toLowerCase().includes(q) ||
      (s.desc && s.desc.toLowerCase().includes(q)) ||
      s.code.toLowerCase().includes(q)
    );
  }

  if (filtered.length === 0) {
    list.innerHTML = '<div class="no-results">no snippets found</div>';
    return;
  }

  list.innerHTML = filtered.map(s => `
    <div class="snip-item ${s.id === activeId ? 'active' : ''}" data-id="${s.id}">
      <div class="snip-item-title">${escHtml(s.title)}</div>
      <div class="snip-item-cat">${s.cat}</div>
    </div>
  `).join('');

  list.querySelectorAll('.snip-item').forEach(el => {
    el.addEventListener('click', () => {
      const id = parseInt(el.dataset.id);
      showSnippet(id);
    });
  });

  updateCount();
}

function showSnippet(id) {
  const snip = snippets.find(s => s.id === id);
  if (!snip) return;

  activeId = id;
  editingId = null;

  document.getElementById('view-title').textContent = snip.title;
  document.getElementById('view-cat').textContent = snip.cat;
  document.getElementById('view-desc').textContent = snip.desc || '';
  document.getElementById('view-code').textContent = snip.code;

  // show viewer, hide others
  document.getElementById('empty-state').classList.add('hidden');
  document.getElementById('snippet-form').classList.add('hidden');
  document.getElementById('snippet-view').classList.remove('hidden');

  renderList(); // refresh active state
}

function updateCount() {
  const el = document.getElementById('snippet-count');
  el.textContent = `${snippets.length} snippet${snippets.length !== 1 ? 's' : ''}`;
}

// ── form ──────────────────────────────────────────────

function openForm(snip = null) {
  editingId = snip ? snip.id : null;

  document.getElementById('form-title').textContent = snip ? 'edit snippet' : 'new snippet';
  document.getElementById('f-title').value = snip ? snip.title : '';
  document.getElementById('f-desc').value = snip ? (snip.desc || '') : '';
  document.getElementById('f-code').value = snip ? snip.code : '';

  // set category selector
  const opts = document.querySelectorAll('.cat-opt');
  opts.forEach(o => {
    o.classList.toggle('active', o.dataset.val === (snip ? snip.cat : 'bash'));
  });

  document.getElementById('empty-state').classList.add('hidden');
  document.getElementById('snippet-view').classList.add('hidden');
  document.getElementById('snippet-form').classList.remove('hidden');

  document.getElementById('f-title').focus();
}

function getSelectedCat() {
  const active = document.querySelector('.cat-opt.active');
  return active ? active.dataset.val : 'bash';
}

async function saveForm() {
  const title = document.getElementById('f-title').value.trim();
  const code = document.getElementById('f-code').value.trim();

  if (!title) {
    showToast('title is required');
    document.getElementById('f-title').focus();
    return;
  }
  if (!code) {
    showToast('snippet cannot be empty');
    document.getElementById('f-code').focus();
    return;
  }

  if (editingId) {
    const idx = snippets.findIndex(s => s.id === editingId);
    snippets[idx] = {
      ...snippets[idx],
      title,
      desc: document.getElementById('f-desc').value.trim(),
      cat: getSelectedCat(),
      code
    };
    activeId = editingId;
  } else {
    const newSnip = {
      id: Date.now(),
      title,
      desc: document.getElementById('f-desc').value.trim(),
      cat: getSelectedCat(),
      code,
      createdAt: new Date().toISOString()
    };
    snippets.unshift(newSnip);
    activeId = newSnip.id;
  }

  await saveSnippets();
  renderList();
  showSnippet(activeId);
  showToast(editingId ? 'snippet updated' : 'snippet saved');
}

// ── actions ───────────────────────────────────────────

async function copySnippet() {
  const snip = snippets.find(s => s.id === activeId);
  if (!snip) return;

  await Neutralino.clipboard.writeText(snip.code);
  await Neutralino.os.showNotification('DevDeck', `Copied: ${snip.title}`);
  showToast('copied to clipboard ✓');
}

async function runSnippet() {
  const snip = snippets.find(s => s.id === activeId);
  if (!snip) return;

  if (snip.cat !== 'bash' && snip.cat !== 'git') {
    showToast('only bash/git snippets can be run');
    return;
  }

  try {
    const result = await Neutralino.os.execCommand(snip.code);
    showToast(result.stdOut ? 'command executed ✓' : 'done (no output)');
  } catch (err) {
    showToast('command failed: ' + (err.message || 'unknown error'));
    console.error('run error:', err);
  }
}

async function deleteSnippet() {
  if (!activeId) return;

  snippets = snippets.filter(s => s.id !== activeId);
  activeId = null;

  await saveSnippets();

  document.getElementById('snippet-view').classList.add('hidden');
  document.getElementById('empty-state').classList.remove('hidden');
  renderList();
  showToast('snippet deleted');
}

// ── import / export ───────────────────────────────────

async function exportSnippets() {
  try {
    const path = await Neutralino.os.showSaveDialog('Export snippets', {
      defaultPath: 'devdeck-snippets.json',
      filters: [{ name: 'JSON', extensions: ['json'] }]
    });

    if (!path) return;

    await Neutralino.filesystem.writeFile(path, JSON.stringify(snippets, null, 2));
    showToast(`exported ${snippets.length} snippets`);
  } catch (err) {
    showToast('export failed');
    console.error(err);
  }
}

async function importSnippets() {
  try {
    const entries = await Neutralino.os.showOpenDialog('Import snippets', {
      filters: [{ name: 'JSON', extensions: ['json'] }]
    });

    if (!entries || entries.length === 0) return;

    const raw = await Neutralino.filesystem.readFile(entries[0]);
    const imported = JSON.parse(raw);

    if (!Array.isArray(imported)) {
      showToast('invalid file format');
      return;
    }

    // merge, skip duplicates by id
    const existingIds = new Set(snippets.map(s => s.id));
    const newOnes = imported.filter(s => !existingIds.has(s.id));
    snippets = [...newOnes, ...snippets];

    await saveSnippets();
    renderList();
    showToast(`imported ${newOnes.length} new snippet(s)`);
  } catch (err) {
    showToast('import failed — invalid file?');
    console.error(err);
  }
}

// ── ui helpers ────────────────────────────────────────

async function setupDragRegion() {
  await Neutralino.window.setDraggableRegion('titlebar');
}

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2200);
}

function escHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ── event bindings ────────────────────────────────────

function bindEvents() {
  // window controls
  document.getElementById('btn-close').addEventListener('click', () => {
    Neutralino.window.hide();
  });
  document.getElementById('btn-minimize').addEventListener('click', () => {
    Neutralino.window.minimize();
  });

  // search
  document.getElementById('search').addEventListener('input', e => {
    currentSearch = e.target.value;
    renderList();
  });

  // category filter
  document.getElementById('cat-filters').addEventListener('click', e => {
    const btn = e.target.closest('.cat-btn');
    if (!btn) return;
    document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentCat = btn.dataset.cat;
    renderList();
  });

  // add new
  document.getElementById('add-btn').addEventListener('click', () => openForm());

  // snippet actions
  document.getElementById('copy-btn').addEventListener('click', copySnippet);
  document.getElementById('run-btn').addEventListener('click', runSnippet);
  document.getElementById('edit-btn').addEventListener('click', () => {
    const snip = snippets.find(s => s.id === activeId);
    if (snip) openForm(snip);
  });
  document.getElementById('delete-btn').addEventListener('click', deleteSnippet);

  // form
  document.getElementById('btn-save').addEventListener('click', saveForm);
  document.getElementById('btn-cancel').addEventListener('click', () => {
    if (activeId) {
      showSnippet(activeId);
    } else {
      document.getElementById('snippet-form').classList.add('hidden');
      document.getElementById('empty-state').classList.remove('hidden');
    }
  });

  // category option in form
  document.getElementById('f-cat-select').addEventListener('click', e => {
    const opt = e.target.closest('.cat-opt');
    if (!opt) return;
    document.querySelectorAll('.cat-opt').forEach(o => o.classList.remove('active'));
    opt.classList.add('active');
  });

  // import / export
  document.getElementById('export-btn').addEventListener('click', exportSnippets);
  document.getElementById('import-btn').addEventListener('click', importSnippets);

  // keyboard shortcuts
  document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'c' && activeId) {
      // only intercept if not selecting text in code block
      if (document.activeElement === document.body) {
        e.preventDefault();
        copySnippet();
      }
    }
    if (e.key === 'Escape') {
      if (!document.getElementById('snippet-form').classList.contains('hidden')) {
        document.getElementById('btn-cancel').click();
      }
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
      e.preventDefault();
      openForm();
    }
  });
}
