document.addEventListener("DOMContentLoaded", () => {
  const toggleNotepadBtn = document.getElementById("toggle-notepad");
  const viewNotesBtn = document.getElementById("view-notes");
  const openSettingsBtn = document.getElementById("open-settings");

  // Toggle notepad on active tab
  if (toggleNotepadBtn) {
    toggleNotepadBtn.addEventListener("click", () => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs && tabs[0]) {
          chrome.tabs.sendMessage(tabs[0].id, { action: "TOGGLE_PANEL" }, () => {
            window.close();
          });
        }
      });
    });
  }

  // Open local Yrusika Dashboard
  if (viewNotesBtn) {
    viewNotesBtn.addEventListener("click", () => {
      chrome.tabs.create({ url: chrome.runtime.getURL("dashboard.html") });
      window.close();
    });
  }

  // Open settings
  if (openSettingsBtn) {
    openSettingsBtn.addEventListener("click", () => {
      chrome.runtime.openOptionsPage();
      window.close();
    });
  }
});

