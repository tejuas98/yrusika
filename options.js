/**
 * Yrusika Settings Logic
 * Supports 20 portfolio palettes, live CSS variable application, and local settings storage.
 */

document.addEventListener("DOMContentLoaded", async () => {
  // DOM Elements
  const cfgEnabled = document.getElementById("cfg-enabled");
  const cfgStartHidden = document.getElementById("cfg-start-hidden");
  const cfgAudioEnabled = document.getElementById("cfg-audio-enabled");
  const cfgOpacity = document.getElementById("cfg-opacity");
  const opacityVal = document.getElementById("opacity-val");

  const cfgProvider = document.getElementById("cfg-provider");
  const sectionGemini = document.getElementById("section-gemini");
  const sectionOllama = document.getElementById("section-ollama");
  const cfgGeminiKey = document.getElementById("cfg-gemini-key");
  const cfgGeminiModel = document.getElementById("cfg-gemini-model");
  const cfgOllamaEndpoint = document.getElementById("cfg-ollama-endpoint");
  const cfgOllamaModel = document.getElementById("cfg-ollama-model");

  const cfgPalette = document.getElementById("cfg-palette");
  const cfgMode = document.getElementById("cfg-mode");
  const btnSave = document.getElementById("btn-save");
  const btnReset = document.getElementById("btn-reset");
  const toastStatus = document.getElementById("toast-status");

  let activeThemeId = "nordic-slate-frost";
  let activeMode = "dark";

  // 1. Populate Palettes from themes.js
  if (cfgPalette && window.YRUSIKA_THEMES) {
    cfgPalette.innerHTML = "";
    window.YRUSIKA_THEMES.forEach((t) => {
      const opt = document.createElement("option");
      opt.value = t.id;
      opt.textContent = `${t.name} — ${t.vibe || ""}`;
      cfgPalette.appendChild(opt);
    });
  }

  // 2. Apply theme CSS variables live to options page
  function applyThemeLive(themeId, mode) {
    activeThemeId = themeId;
    activeMode = mode;
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
  }

  // Live change on theme select
  if (cfgPalette) {
    cfgPalette.addEventListener("change", () => {
      applyThemeLive(cfgPalette.value, cfgMode.value);
    });
  }

  if (cfgMode) {
    cfgMode.addEventListener("change", () => {
      applyThemeLive(cfgPalette.value, cfgMode.value);
    });
  }

  // Opacity Slider display
  if (cfgOpacity && opacityVal) {
    cfgOpacity.addEventListener("input", () => {
      opacityVal.textContent = cfgOpacity.value;
    });
  }

  // Provider toggle visibility
  function updateProviderVisibility() {
    if (!cfgProvider) return;
    if (cfgProvider.value === "gemini") {
      sectionGemini.style.display = "block";
      sectionOllama.style.display = "none";
    } else {
      sectionGemini.style.display = "none";
      sectionOllama.style.display = "block";
    }
  }

  if (cfgProvider) {
    cfgProvider.addEventListener("change", updateProviderVisibility);
  }

  // 3. Load Existing Settings from chrome.storage.local
  if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
    const data = await chrome.storage.local.get([
      "yrusika_enabled",
      "yrusika_start_hidden",
      "yrusika_audio_enabled",
      "yrusika_controller_opacity",
      "yrusika_provider",
      "yrusika_gemini_key",
      "yrusika_gemini_model",
      "yrusika_ollama_endpoint",
      "yrusika_ollama_model",
      "yrusika_theme_id",
      "yrusika_theme_mode"
    ]);

    if (typeof data.yrusika_enabled === "boolean") cfgEnabled.checked = data.yrusika_enabled;
    if (typeof data.yrusika_start_hidden === "boolean") cfgStartHidden.checked = data.yrusika_start_hidden;
    if (typeof data.yrusika_audio_enabled === "boolean") cfgAudioEnabled.checked = data.yrusika_audio_enabled;
    if (data.yrusika_controller_opacity) {
      cfgOpacity.value = data.yrusika_controller_opacity;
      opacityVal.textContent = data.yrusika_controller_opacity;
    }

    if (data.yrusika_provider) cfgProvider.value = data.yrusika_provider;
    if (data.yrusika_gemini_key) cfgGeminiKey.value = data.yrusika_gemini_key;
    if (data.yrusika_gemini_model) cfgGeminiModel.value = data.yrusika_gemini_model;
    if (data.yrusika_ollama_endpoint) cfgOllamaEndpoint.value = data.yrusika_ollama_endpoint;
    if (data.yrusika_ollama_model) cfgOllamaModel.value = data.yrusika_ollama_model;

    if (data.yrusika_theme_id) {
      activeThemeId = data.yrusika_theme_id;
      if (cfgPalette) cfgPalette.value = activeThemeId;
    }
    if (data.yrusika_theme_mode) {
      activeMode = data.yrusika_theme_mode;
      if (cfgMode) cfgMode.value = activeMode;
    }

    updateProviderVisibility();
    applyThemeLive(activeThemeId, activeMode);
  } else {
    applyThemeLive(activeThemeId, activeMode);
    updateProviderVisibility();
  }

  // 4. Save Settings
  if (btnSave) {
    btnSave.addEventListener("click", async () => {
      const settings = {
        yrusika_enabled: cfgEnabled.checked,
        yrusika_start_hidden: cfgStartHidden.checked,
        yrusika_audio_enabled: cfgAudioEnabled.checked,
        yrusika_controller_opacity: parseFloat(cfgOpacity.value) || 0.9,
        yrusika_provider: cfgProvider.value,
        yrusika_gemini_key: cfgGeminiKey.value.trim(),
        yrusika_gemini_model: cfgGeminiModel.value,
        yrusika_ollama_endpoint: cfgOllamaEndpoint.value.trim(),
        yrusika_ollama_model: cfgOllamaModel.value.trim(),
        yrusika_theme_id: cfgPalette.value,
        yrusika_theme_mode: cfgMode.value
      };

      if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
        await chrome.storage.local.set(settings);
      }

      applyThemeLive(cfgPalette.value, cfgMode.value);

      if (toastStatus) {
        toastStatus.style.display = "block";
        setTimeout(() => {
          toastStatus.style.display = "none";
        }, 3000);
      }
    });
  }

  // 5. Reset Settings
  if (btnReset) {
    btnReset.addEventListener("click", () => {
      if (confirm("Reset all settings to defaults?")) {
        cfgEnabled.checked = true;
        cfgStartHidden.checked = false;
        cfgAudioEnabled.checked = false;
        cfgOpacity.value = 0.9;
        opacityVal.textContent = "0.9";
        cfgProvider.value = "gemini";
        cfgGeminiModel.value = "gemini-2.5-flash";
        cfgOllamaEndpoint.value = "http://localhost:11434";
        cfgOllamaModel.value = "llama3.2-vision";
        cfgPalette.value = "nordic-slate-frost";
        cfgMode.value = "dark";
        updateProviderVisibility();
        applyThemeLive("nordic-slate-frost", "dark");
        btnSave.click();
      }
    });
  }
});
