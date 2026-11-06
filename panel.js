/**
 * Yrusika Panel Logic
 * Manages Note State, AI Stream, Vault Sync, and Exports
 */

document.addEventListener("DOMContentLoaded", () => {
  const aiClient = new window.AIClient();
  let directoryHandle = null;
  let isWatching = true;
  let frameCounter = 0;
  let videoInfo = { title: "Untitled 1", url: "", currentTime: 0 };
  let notes = [];

  // DOM Elements
  const noteTitleInput = document.getElementById("note-title");
  const noteStream = document.getElementById("note-stream");
  const watchingCounter = document.getElementById("watching-counter");
  const watchingText = document.getElementById("watching-text");
  const exportDropdown = document.getElementById("export-dropdown");
  const notificationBanner = document.getElementById("notification-banner");
  const notifTitle = document.getElementById("notif-title");
  const notifDesc = document.getElementById("notif-desc");
  const vaultName = document.getElementById("vault-name");
  const modelBadge = document.getElementById("model-badge");

  // Load Model Badge
  aiClient.loadSettings().then(() => {
    updateModelBadge();
  });

  function updateModelBadge() {
    if (aiClient.provider === "gemini") {
      modelBadge.textContent = aiClient.geminiApiKey ? "Gemini 2.5 (Active)" : "Gemini (Add Key)";
      modelBadge.style.color = aiClient.geminiApiKey ? "#16a34a" : "#dc2626";
    } else {
      modelBadge.textContent = "Ollama Local";
      modelBadge.style.color = "#2563eb";
    }
  }

  // Communicate with parent content.js via window.parent.postMessage
  function sendToParent(action, payload = {}) {
    window.parent.postMessage({ from: "yrusika-panel", action, ...payload }, "*");
  }

  // Listen for messages from content.js
  window.addEventListener("message", async (event) => {
    const data = event.data;
    if (!data || data.from !== "yrusika-content") return;

    if (data.action === "INIT_VIDEO_INFO") {
      videoInfo = data.video;
      if (videoInfo.title && noteTitleInput.value === "Untitled 1") {
        noteTitleInput.value = videoInfo.title;
      }
      document.getElementById("prop-source").textContent = videoInfo.url || "YouTube";
      document.getElementById("prop-date").textContent = new Date().toLocaleDateString();
    }

    if (data.action === "FRAME_TICK") {
      if (isWatching) {
        frameCounter++;
        watchingCounter.textContent = frameCounter;
      }
    }

    if (data.action === "SCENE_CHANGE" && isWatching) {
      await handleSceneChange(data.screenshot);
    }

    if (data.action === "MANUAL_SNAPSHOT") {
      await handleSceneChange(data.screenshot);
    }
  });

  // Handle incoming scene changes from VisionDetector
  async function handleSceneChange(screenshot) {
    watchingText.textContent = `Analyzing visual at [${screenshot.formattedTime}]...`;

    // 1. Render Screenshot Card immediately
    const cardEl = document.createElement("div");
    cardEl.className = "note-card-screenshot";
    cardEl.innerHTML = `
      <img src="${screenshot.dataUrl}" alt="Keyframe at ${screenshot.formattedTime}" />
      <span class="screenshot-click-hint">Click to jump to ${screenshot.formattedTime}</span>
    `;

    // Click-to-seek video
    cardEl.addEventListener("click", () => {
      sendToParent("SEEK_VIDEO", { timestamp: screenshot.timestamp });
    });

    noteStream.appendChild(cardEl);

    // 2. Placeholder for AI Notes
    const textEl = document.createElement("div");
    textEl.style.marginBottom = "16px";
    textEl.innerHTML = `<em>Transcribing code & concepts for [${screenshot.formattedTime}]...</em>`;
    noteStream.appendChild(textEl);
    noteStream.scrollTop = noteStream.scrollHeight;

    // 3. Generate AI Note
    const aiResult = await aiClient.generateNoteFromFrame(
      screenshot.dataUrl,
      screenshot.formattedTime,
      noteTitleInput.value
    );

    watchingText.textContent = "Yrusika is watching video...";

    // Render formatted markdown
    textEl.innerHTML = renderSimpleMarkdown(aiResult.text);

    // Save note in local memory
    notes.push({
      timestamp: screenshot.formattedTime,
      seconds: screenshot.timestamp,
      screenshot: screenshot.dataUrl,
      text: aiResult.text
    });

    // Auto-save to Obsidian vault if linked
    if (directoryHandle) {
      saveToVault();
    }
  }

  // Simple Markdown Renderer
  function renderSimpleMarkdown(md) {
    if (!md) return "";
    let html = md
      .replace(/### (.*?)\n/g, '<h3 style="color:#2563eb; margin:10px 0 6px 0; font-size:14px;">$1</h3>')
      .replace(/## (.*?)\n/g, '<h2 style="font-size:15px; margin:12px 0 6px 0; color:#0f172a;">$1</h2>')
      .replace(/# (.*?)\n/g, '<h1 style="font-size:17px; margin:14px 0 8px 0; color:#0f172a;">$1</h1>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/`([^`]+)`/g, '<code style="background:#f1f5f9; padding:1px 4px; border-radius:3px;">$1</code>')
      .replace(/```([a-z]*)\n([\s\S]*?)```/g, '<pre style="background:#0f172a; color:#f8fafc; padding:10px; border-radius:6px; margin:8px 0;"><code>$2</code></pre>')
      .replace(/\n[\*\-] (.*?)/g, '<li style="margin-left:18px; margin-bottom:4px;">$1</li>')
      .replace(/\n\n/g, '<div style="height:8px;"></div>');
    return html;
  }

  // Export Dropdown Toggle
  document.getElementById("btn-export").addEventListener("click", (e) => {
    e.stopPropagation();
    exportDropdown.classList.toggle("show");
  });

  document.addEventListener("click", () => {
    exportDropdown.classList.remove("show");
  });

  // Export Handlers
  document.getElementById("export-copy").addEventListener("click", () => {
    const fullText = buildFullMarkdown();
    navigator.clipboard.writeText(fullText);
    showNotification("Copied to Clipboard", "Note copied in full Markdown format.");
  });

  document.getElementById("export-md").addEventListener("click", () => {
    const fullText = buildFullMarkdown();
    const blob = new Blob([fullText], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${noteTitleInput.value || "Untitled"}.md`;
    a.click();
    URL.revokeObjectURL(url);
    showNotification("Note Exported", `Downloaded ${noteTitleInput.value}.md`);
  });

  document.getElementById("export-pdf").addEventListener("click", () => {
    window.print();
  });

  document.getElementById("export-word").addEventListener("click", () => {
    const fullText = buildFullMarkdown();
    const htmlContent = `<html><body><h1>${noteTitleInput.value}</h1><pre>${fullText}</pre></body></html>`;
    const blob = new Blob([htmlContent], { type: "application/msword;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${noteTitleInput.value || "Untitled"}.doc`;
    a.click();
    URL.revokeObjectURL(url);
    showNotification("Note Exported", `Downloaded ${noteTitleInput.value}.doc`);
  });

  // Compile Full Markdown
  function buildFullMarkdown() {
    let md = `# ${noteTitleInput.value}\n\n`;
    md += `> Source: ${videoInfo.url || "YouTube"}\n`;
    md += `> Date: ${new Date().toLocaleDateString()}\n\n---\n\n`;

    notes.forEach((item) => {
      md += `### [${item.timestamp}] Keyframe Note\n\n`;
      md += `${item.text}\n\n`;
    });
    return md;
  }

  function showNotification(title, desc) {
    notifTitle.textContent = title;
    notifDesc.textContent = desc;
    notificationBanner.classList.remove("hidden");
    setTimeout(() => {
      notificationBanner.classList.add("hidden");
    }, 4000);
  }

  document.getElementById("notif-close").addEventListener("click", () => {
    notificationBanner.classList.add("hidden");
  });

  // Local Obsidian Vault Sync using File System Access API
  document.getElementById("vault-btn").addEventListener("click", async () => {
    try {
      directoryHandle = await window.showDirectoryPicker();
      vaultName.textContent = `Vault: ${directoryHandle.name}`;
      showNotification("Vault Connected", `Auto-syncing notes to ${directoryHandle.name}`);
      saveToVault();
    } catch (e) {
      console.log("Vault picker canceled or unsupported.");
    }
  });

  async function saveToVault() {
    if (!directoryHandle) return;
    try {
      const fileName = `${noteTitleInput.value.replace(/[/\\?%*:|"<>]/g, "-")}.md`;
      const fileHandle = await directoryHandle.getFileHandle(fileName, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(buildFullMarkdown());
      await writable.close();
    } catch (err) {
      console.error("Failed to save to vault:", err);
    }
  }

  // Bottom Control Docks
  document.getElementById("btn-snapshot").addEventListener("click", () => {
    sendToParent("TRIGGER_SNAPSHOT");
  });

  document.getElementById("btn-timestamp").addEventListener("click", () => {
    const formatted = videoInfo.currentTime ? new window.VisionDetector().formatTime(videoInfo.currentTime) : "00:00";
    const tsNode = document.createElement("p");
    tsNode.innerHTML = `<strong>Timestamp [${formatted}]</strong> - <em>Manual marker added.</em>`;
    noteStream.appendChild(tsNode);
  });

  const aiToggleBtn = document.getElementById("btn-ai-toggle");
  aiToggleBtn.addEventListener("click", () => {
    isWatching = !isWatching;
    aiToggleBtn.classList.toggle("active", isWatching);
    watchingText.textContent = isWatching ? "Yrusika is watching video..." : "AI Auto-Watch Paused";
  });

  // Settings / Key setup prompt
  document.getElementById("btn-settings").addEventListener("click", () => {
    openSettingsDialog();
  });

  modelBadge.addEventListener("click", () => {
    openSettingsDialog();
  });

  function openSettingsDialog() {
    const currentKey = aiClient.geminiApiKey || "";
    const key = prompt("Enter your free Google Gemini API Key (from aistudio.google.com):", currentKey);
    if (key !== null) {
      aiClient.geminiApiKey = key.trim();
      aiClient.saveSettings({ yrusika_gemini_key: key.trim() }).then(() => {
        updateModelBadge();
        showNotification("Settings Saved", "Gemini API key updated.");
      });
    }
  }

  // Exit Video Mode
  document.getElementById("exit-video-mode").addEventListener("click", () => {
    sendToParent("TOGGLE_PANEL");
  });

  document.getElementById("close-panel").addEventListener("click", () => {
    sendToParent("TOGGLE_PANEL");
  });

  // Properties toggle
  const propsToggle = document.getElementById("props-toggle");
  const propsContent = document.getElementById("props-content");
  propsToggle.addEventListener("click", () => {
    propsContent.classList.toggle("open");
  });

  // =========================================================================
  // Portfolio Theme & Color Palette Engine (20 Palettes + Dark/Light Mode)
  // =========================================================================
  let currentThemeId = "nordic-slate-frost";
  let currentMode = "dark";

  const paletteDrawer = document.getElementById("palette-drawer");
  const paletteToggle = document.getElementById("palette-toggle");
  const closePaletteDrawer = document.getElementById("close-palette-drawer");
  const paletteModeToggle = document.getElementById("palette-mode-toggle");
  const currentModeLabel = document.getElementById("current-mode-label");
  const paletteRandomBtn = document.getElementById("palette-random-btn");
  const paletteCardsList = document.getElementById("palette-cards-list");
  const themeToggleBtn = document.getElementById("theme-toggle");

  async function initThemeSystem() {
    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
      const stored = await chrome.storage.local.get(["yrusika_theme_id", "yrusika_theme_mode"]);
      if (stored.yrusika_theme_id) currentThemeId = stored.yrusika_theme_id;
      if (stored.yrusika_theme_mode) currentMode = stored.yrusika_theme_mode;
    }

    applyTheme(currentThemeId, currentMode);
    renderPaletteCards();

    if (paletteToggle) {
      paletteToggle.addEventListener("click", () => {
        paletteDrawer.classList.toggle("hidden");
      });
    }

    if (closePaletteDrawer) {
      closePaletteDrawer.addEventListener("click", () => {
        paletteDrawer.classList.add("hidden");
      });
    }

    if (themeToggleBtn) {
      themeToggleBtn.addEventListener("click", () => {
        toggleMode();
      });
    }

    if (paletteModeToggle) {
      paletteModeToggle.addEventListener("click", () => {
        toggleMode();
      });
    }

    if (paletteRandomBtn) {
      paletteRandomBtn.addEventListener("click", () => {
        if (!window.YRUSIKA_THEMES || !window.YRUSIKA_THEMES.length) return;
        const randomIndex = Math.floor(Math.random() * window.YRUSIKA_THEMES.length);
        const randomTheme = window.YRUSIKA_THEMES[randomIndex];
        applyTheme(randomTheme.id, currentMode);
      });
    }
  }

  function toggleMode() {
    currentMode = currentMode === "dark" ? "light" : "dark";
    applyTheme(currentThemeId, currentMode);
  }

  function applyTheme(themeId, mode = currentMode) {
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

    if (currentModeLabel) {
      currentModeLabel.textContent = mode.charAt(0).toUpperCase() + mode.slice(1);
    }

    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({
        yrusika_theme_id: currentThemeId,
        yrusika_theme_mode: currentMode
      });
    }

    sendToParent("THEME_CHANGED", { themeId, mode, colors });
    renderPaletteCards();
  }

  function renderPaletteCards() {
    if (!paletteCardsList || !window.YRUSIKA_THEMES) return;
    paletteCardsList.innerHTML = "";

    window.YRUSIKA_THEMES.forEach((t) => {
      const colors = t[currentMode] || t.dark;
      const card = document.createElement("div");
      card.className = `palette-card ${t.id === currentThemeId ? "active" : ""}`;
      card.innerHTML = `
        <div class="palette-card-name">${t.name}</div>
        <div class="palette-card-vibe">${t.vibe || ""}</div>
        <div class="palette-swatches">
          <span class="palette-swatch-dot" style="background: ${colors.bgPrimary};" title="Background"></span>
          <span class="palette-swatch-dot" style="background: ${colors.primaryBrand};" title="Primary Brand"></span>
          <span class="palette-swatch-dot" style="background: ${colors.accentSparkle};" title="Accent Sparkle"></span>
        </div>
      `;

      card.addEventListener("click", () => {
        applyTheme(t.id, currentMode);
      });

      paletteCardsList.appendChild(card);
    });
  }

  initThemeSystem();

  // Notify content.js that panel is ready
  sendToParent("PANEL_READY");
});

