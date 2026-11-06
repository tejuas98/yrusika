document.addEventListener("DOMContentLoaded", async () => {
  const providerSelect = document.getElementById("provider");
  const geminiSection = document.getElementById("gemini-section");
  const ollamaSection = document.getElementById("ollama-section");
  const geminiKeyInput = document.getElementById("gemini-key");
  const geminiModelSelect = document.getElementById("gemini-model");
  const ollamaEndpointInput = document.getElementById("ollama-endpoint");
  const ollamaModelInput = document.getElementById("ollama-model");
  const saveBtn = document.getElementById("btn-save");
  const statusMsg = document.getElementById("status-msg");

  // Load existing settings
  if (chrome.storage && chrome.storage.local) {
    const data = await chrome.storage.local.get([
      "yrusika_provider",
      "yrusika_gemini_key",
      "yrusika_gemini_model",
      "yrusika_ollama_endpoint",
      "yrusika_ollama_model"
    ]);

    if (data.yrusika_provider) providerSelect.value = data.yrusika_provider;
    if (data.yrusika_gemini_key) geminiKeyInput.value = data.yrusika_gemini_key;
    if (data.yrusika_gemini_model) geminiModelSelect.value = data.yrusika_gemini_model;
    if (data.yrusika_ollama_endpoint) ollamaEndpointInput.value = data.yrusika_ollama_endpoint;
    if (data.yrusika_ollama_model) ollamaModelInput.value = data.yrusika_ollama_model;
  }

  function updateProviderVisibility() {
    if (providerSelect.value === "gemini") {
      geminiSection.style.display = "block";
      ollamaSection.style.display = "none";
    } else {
      geminiSection.style.display = "none";
      ollamaSection.style.display = "block";
    }
  }

  providerSelect.addEventListener("change", updateProviderVisibility);
  updateProviderVisibility();

  // Save Settings
  saveBtn.addEventListener("click", async () => {
    const settings = {
      yrusika_provider: providerSelect.value,
      yrusika_gemini_key: geminiKeyInput.value.trim(),
      yrusika_gemini_model: geminiModelSelect.value,
      yrusika_ollama_endpoint: ollamaEndpointInput.value.trim(),
      yrusika_ollama_model: ollamaModelInput.value.trim()
    };

    if (chrome.storage && chrome.storage.local) {
      await chrome.storage.local.set(settings);
    }

    statusMsg.style.display = "block";
    setTimeout(() => {
      statusMsg.style.display = "none";
    }, 3000);
  });
});

