/**
 * Yrusika Local Dashboard Logic
 * 100% Client-side & Open-Source — No cloud servers, no paywalls.
 */

document.addEventListener("DOMContentLoaded", async () => {
  let currentThemeId = "nordic-slate-frost";
  let currentMode = "dark";
  let allNotes = [];

  // DOM Elements
  const tabButtons = document.querySelectorAll(".sidebar-item");
  const tabPanes = document.querySelectorAll(".tab-pane");
  const notesGrid = document.getElementById("notes-grid");
  const emptyNotesView = document.getElementById("empty-notes-view");
  const searchInput = document.getElementById("search-notes");
  const dashPaletteBtn = document.getElementById("dash-palette-btn");
  const activeThemeLabel = document.getElementById("active-theme-label");
  const dashModeToggle = document.getElementById("dash-mode-toggle");
  const fullPaletteGrid = document.getElementById("full-palette-grid");
  const btnSurpriseMe = document.getElementById("btn-surprise-me");

  // Analytics Elements
  const statTotalTime = document.getElementById("stat-total-time");
  const statWeekTime = document.getElementById("stat-week-time");
  const statNotesCount = document.getElementById("stat-notes-count");
  const statKeyframesCount = document.getElementById("stat-keyframes-count");

  // Settings Elements
  const cfgProvider = document.getElementById("cfg-provider");
  const cfgGeminiBox = document.getElementById("cfg-gemini-box");
  const cfgOllamaBox = document.getElementById("cfg-ollama-box");
  const cfgGeminiKey = document.getElementById("cfg-gemini-key");
  const cfgGeminiModel = document.getElementById("cfg-gemini-model");
  const cfgOllamaEndpoint = document.getElementById("cfg-ollama-endpoint");
  const cfgOllamaModel = document.getElementById("cfg-ollama-model");
  const btnSaveSettings = document.getElementById("btn-save-settings");
  const cfgStatus = document.getElementById("cfg-status");

  // Modal Elements
  const noteModal = document.getElementById("note-modal");
  const modalTitle = document.getElementById("modal-title");
  const modalContent = document.getElementById("modal-content");
  const btnCloseModal = document.getElementById("btn-close-modal");
  const btnModalMd = document.getElementById("btn-modal-md");
  let activeModalNote = null;

  // 1. Tab Navigation
  tabButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      tabButtons.forEach((b) => b.classList.remove("active"));
      tabPanes.forEach((p) => p.classList.remove("active"));

      btn.classList.add("active");
      const targetId = btn.getAttribute("data-tab");
      const pane = document.getElementById(targetId);
      if (pane) pane.classList.add("active");
    });
  });

  // 2. Theme Engine
  async function initThemes() {
    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
      const stored = await chrome.storage.local.get(["yrusika_theme_id", "yrusika_theme_mode"]);
      if (stored.yrusika_theme_id) currentThemeId = stored.yrusika_theme_id;
      if (stored.yrusika_theme_mode) currentMode = stored.yrusika_theme_mode;
    }

    applyTheme(currentThemeId, currentMode);
    renderPortfolioPaletteGrid();

    if (dashModeToggle) {
      dashModeToggle.addEventListener("click", () => {
        currentMode = currentMode === "dark" ? "light" : "dark";
        applyTheme(currentThemeId, currentMode);
      });
    }

    if (dashPaletteBtn) {
      dashPaletteBtn.addEventListener("click", () => {
        // Switch to the palettes tab
        const palTabBtn = document.querySelector('[data-tab="tab-palettes"]');
        if (palTabBtn) palTabBtn.click();
      });
    }

    if (btnSurpriseMe) {
      btnSurpriseMe.addEventListener("click", () => {
        const themes = window.YRUSIKA_THEMES || [];
        if (!themes.length) return;
        const random = themes[Math.floor(Math.random() * themes.length)];
        applyTheme(random.id, currentMode);
      });
    }
  }

  function applyTheme(themeId, mode) {
    currentThemeId = themeId;
    currentMode = mode;
    const themes = window.YRUSIKA_THEMES || [];
    const theme = themes.find((t) => t.id === themeId) || themes[0];
    if (!theme) return;

    const colors = theme[mode] || theme.dark;
    const root = document.documentElement;

    root.style.setProperty("--bg-primary", colors.bgPrimary);
    root.style.setProperty("--surface-card", colors.surfaceCard);
    root.style.setProperty("--primary-brand", colors.primaryBrand);
    root.style.setProperty("--secondary-brand", colors.secondaryBrand);
    root.style.setProperty("--accent-sparkle", colors.accentSparkle);
    root.style.setProperty("--text-primary", colors.textPrimary);
    root.style.setProperty("--text-secondary", colors.textSecondary);
    root.style.setProperty("--ui-border", colors.uiBorder);

    if (activeThemeLabel) {
      activeThemeLabel.textContent = theme.name;
    }

    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({
        yrusika_theme_id: currentThemeId,
        yrusika_theme_mode: currentMode
      });
    }

    renderPortfolioPaletteGrid();
  }

  function renderPortfolioPaletteGrid() {
    if (!fullPaletteGrid || !window.YRUSIKA_THEMES) return;
    fullPaletteGrid.innerHTML = "";

    window.YRUSIKA_THEMES.forEach((t) => {
      const colors = t[currentMode] || t.dark;
      const card = document.createElement("div");
      card.className = `portfolio-palette-card ${t.id === currentThemeId ? "active" : ""}`;
      card.innerHTML = `
        <div>
          <div class="pal-card-name">${t.name}</div>
          <div class="pal-card-vibe">${t.vibe || ""}</div>
        </div>
        <div class="pal-swatches-row">
          <span class="pal-swatch-circle" style="background: ${colors.bgPrimary};" title="Background"></span>
          <span class="pal-swatch-circle" style="background: ${colors.primaryBrand};" title="Primary Accent"></span>
          <span class="pal-swatch-circle" style="background: ${colors.accentSparkle};" title="Sparkle Accent"></span>
        </div>
      `;

      card.addEventListener("click", () => {
        applyTheme(t.id, currentMode);
      });

      fullPaletteGrid.appendChild(card);
    });
  }

  // 3. Notes Library Loader
  async function loadNotes() {
    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
      const stored = await chrome.storage.local.get(["yrusika_saved_notes", "yrusika_study_stats"]);
      allNotes = stored.yrusika_saved_notes || [];
      const stats = stored.yrusika_study_stats || { totalMinutes: 13, weekMinutes: 13, totalKeyframes: 25 };

      updateStats(stats, allNotes.length);
    } else {
      allNotes = [
        {
          id: "note-1",
          title: "The LAST Go basics video you will ever need",
          url: "https://youtube.com/watch?v=tgGNwG_UxFo",
          date: new Date().toLocaleDateString(),
          duration: "13m",
          keyframeCount: 5,
          thumbnail: "",
          content: "# The LAST Go basics video\n\n## 1. Prerequisites\n- Go compiler installed\n- Terminal basics\n\n```go\npackage main\nimport \"fmt\"\n\nfunc main() {\n    fmt.Println(\"Hello Go!\")\n}\n```"
        }
      ];
      updateStats({ totalMinutes: 13, weekMinutes: 13, totalKeyframes: 5 }, allNotes.length);
    }

    renderNotes(allNotes);
  }

  function renderNotes(notes) {
    if (!notesGrid) return;
    notesGrid.innerHTML = "";

    if (!notes.length) {
      if (emptyNotesView) emptyNotesView.classList.remove("hidden");
      return;
    }

    if (emptyNotesView) emptyNotesView.classList.add("hidden");

    notes.forEach((note) => {
      const card = document.createElement("div");
      card.className = "note-item-card";

      const previewText = note.content ? note.content.replace(/#|\*|`|\[|\]/g, "").slice(0, 140) : "No textual content";

      card.innerHTML = `
        ${note.thumbnail ? `<img src="${note.thumbnail}" class="note-thumb" alt="${note.title}">` : `<div class="note-thumb" style="display: flex; align-items: center; justify-content: center; color: var(--text-secondary); font-size: 13px; font-weight: 600;">&lsaquo; Lecture Keyframes &rsaquo;</div>`}
        <div class="note-card-body">
          <div class="note-item-title">${note.title || "Untitled Lecture"}</div>
          <div class="note-item-meta">
            <span>${note.date || "Today"}</span>
            <span>&bull;</span>
            <span>${note.keyframeCount || 0} keyframes</span>
          </div>
          <div class="note-item-preview">${previewText}...</div>
          <div class="note-card-footer">
            <button class="card-action-link btn-open-note">Read Note</button>
            <button class="card-action-link btn-download-md">Download .md</button>
          </div>
        </div>
      `;

      card.querySelector(".btn-open-note").addEventListener("click", () => openNoteModal(note));
      card.querySelector(".btn-download-md").addEventListener("click", () => downloadMarkdown(note));

      notesGrid.appendChild(card);
    });
  }

  // Search Notes
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      const q = e.target.value.toLowerCase().trim();
      const filtered = allNotes.filter((n) => {
        return (n.title && n.title.toLowerCase().includes(q)) ||
               (n.content && n.content.toLowerCase().includes(q));
      });
      renderNotes(filtered);
    });
  }

  // 4. Modal Reader
  function openNoteModal(note) {
    activeModalNote = note;
    modalTitle.textContent = note.title;
    modalContent.innerHTML = formatMarkdown(note.content || "No content recorded.");
    noteModal.classList.remove("hidden");
  }

  if (btnCloseModal) {
    btnCloseModal.addEventListener("click", () => {
      noteModal.classList.add("hidden");
    });
  }

  if (btnModalMd) {
    btnModalMd.addEventListener("click", () => {
      if (activeModalNote) downloadMarkdown(activeModalNote);
    });
  }

  function downloadMarkdown(note) {
    const filename = `${(note.title || "Lecture-Notes").replace(/[^a-z0-9]/gi, "-").toLowerCase()}.md`;
    const blob = new Blob([note.content || ""], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function formatMarkdown(md) {
    if (!md) return "";
    return md
      .replace(/^### (.*$)/gim, '<h3 style="margin: 12px 0 6px; font-size: 16px; color: var(--primary-brand);">$1</h3>')
      .replace(/^## (.*$)/gim, '<h2 style="margin: 16px 0 8px; font-size: 18px; color: var(--text-primary);">$1</h2>')
      .replace(/^# (.*$)/gim, '<h1 style="margin: 20px 0 10px; font-size: 22px; color: var(--text-primary);">$1</h1>')
      .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
      .replace(/\*(.*)\*/gim, '<em>$1</em>')
      .replace(/```([a-z]*)\n([\s\S]*?)```/gim, '<pre style="background: var(--bg-primary); padding: 12px; border-radius: 6px; overflow-x: auto; margin: 10px 0; border: 1px solid var(--ui-border);"><code class="language-$1">$2</code></pre>')
      .replace(/`([^`]+)`/gim, '<code style="background: var(--bg-primary); padding: 2px 5px; border-radius: 4px; font-size: 12px; color: var(--accent-sparkle);">$1</code>')
      .replace(/\n/gim, '<br>');
  }

  // 5. Stats Tracker
  function updateStats(stats, notesCount) {
    if (statTotalTime) statTotalTime.textContent = `${stats.totalMinutes || 0}m`;
    if (statWeekTime) statWeekTime.textContent = `${stats.weekMinutes || 0}m`;
    if (statNotesCount) statNotesCount.textContent = notesCount || 0;
    if (statKeyframesCount) statKeyframesCount.textContent = stats.totalKeyframes || 0;
  }

  // 6. Settings Manager
  async function loadSettings() {
    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
      const data = await chrome.storage.local.get([
        "yrusika_provider",
        "yrusika_gemini_key",
        "yrusika_gemini_model",
        "yrusika_ollama_endpoint",
        "yrusika_ollama_model"
      ]);

      if (data.yrusika_provider && cfgProvider) cfgProvider.value = data.yrusika_provider;
      if (data.yrusika_gemini_key && cfgGeminiKey) cfgGeminiKey.value = data.yrusika_gemini_key;
      if (data.yrusika_gemini_model && cfgGeminiModel) cfgGeminiModel.value = data.yrusika_gemini_model;
      if (data.yrusika_ollama_endpoint && cfgOllamaEndpoint) cfgOllamaEndpoint.value = data.yrusika_ollama_endpoint;
      if (data.yrusika_ollama_model && cfgOllamaModel) cfgOllamaModel.value = data.yrusika_ollama_model;

      toggleProviderVisibility();
    }
  }

  function toggleProviderVisibility() {
    if (!cfgProvider) return;
    if (cfgProvider.value === "gemini") {
      cfgGeminiBox.style.display = "block";
      cfgOllamaBox.style.display = "none";
    } else {
      cfgGeminiBox.style.display = "none";
      cfgOllamaBox.style.display = "block";
    }
  }

  if (cfgProvider) {
    cfgProvider.addEventListener("change", toggleProviderVisibility);
  }

  if (btnSaveSettings) {
    btnSaveSettings.addEventListener("click", async () => {
      const settings = {
        yrusika_provider: cfgProvider ? cfgProvider.value : "gemini",
        yrusika_gemini_key: cfgGeminiKey ? cfgGeminiKey.value.trim() : "",
        yrusika_gemini_model: cfgGeminiModel ? cfgGeminiModel.value : "gemini-2.5-flash",
        yrusika_ollama_endpoint: cfgOllamaEndpoint ? cfgOllamaEndpoint.value.trim() : "http://localhost:11434",
        yrusika_ollama_model: cfgOllamaModel ? cfgOllamaModel.value.trim() : "llama3.2-vision"
      };

      if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
        await chrome.storage.local.set(settings);
      }

      if (cfgStatus) {
        cfgStatus.style.display = "block";
        setTimeout(() => {
          cfgStatus.style.display = "none";
        }, 3000);
      }
    });
  }

  // Initialize
  await initThemes();
  await loadNotes();
  await loadSettings();
});

