/**
 * Yrusika Content Script
 * Injected on YouTube & Video Pages: Injects controller, handles split view, runs VisionDetector
 */

(function () {
  let videoElement = null;
  let detector = null;
  let sidebarIframe = null;
  let isPanelOpen = true;
  let checkInterval = null;

  function init() {
    findVideo();
    createSidebarIframe();
    createFloatingLauncher();
    createTopVideoController();
    setupAdDetector();
  }

  // Locate the active video element
  function findVideo() {
    videoElement = document.querySelector("video.html5-main-video") || document.querySelector("video");
    if (videoElement && !detector) {
      detector = new window.VisionDetector({
        tinyWidth: 128,
        tinyHeight: 72,
        threshold: 4.0,
        sampleEveryNFrames: 10,
        cooldownMs: 500
      });
      startFrameLoop();
    }
  }

  // Create Docked Iframe Side Panel
  function createSidebarIframe() {
    if (document.getElementById("yrusika-sidebar-frame")) return;

    sidebarIframe = document.createElement("iframe");
    sidebarIframe.id = "yrusika-sidebar-frame";
    sidebarIframe.src = chrome.runtime.getURL("panel.html");
    document.body.appendChild(sidebarIframe);

    document.body.classList.add("yrusika-active");
  }

  // Create Floating Launcher Button (visible when panel is closed)
  function createFloatingLauncher() {
    if (document.getElementById("yrusika-floating-launcher")) return;

    const btn = document.createElement("button");
    btn.id = "yrusika-floating-launcher";
    btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 6px;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg> Yrusika`;
    btn.style.display = "none";
    btn.addEventListener("click", togglePanel);
    document.body.appendChild(btn);
  }

  // Create Top Video Controller Bar (Matches Screenshot 1 & 2)
  function createTopVideoController() {
    if (document.getElementById("yrusika-video-controller")) return;

    const bar = document.createElement("div");
    bar.id = "yrusika-video-controller";
    bar.innerHTML = `
      <button class="yrusika-ctrl-btn" id="ctrl-exit" title="Close Video Mode">&times;</button>
      <button class="yrusika-ctrl-btn" id="ctrl-hide" title="Hide Controller">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
      </button>
      <div class="yrusika-ctrl-divider"></div>
      <button class="yrusika-ctrl-btn" id="ctrl-turtle" title="0.8x Speed">0.8x</button>
      <button class="yrusika-ctrl-btn" id="ctrl-lightning" title="1.5x Speed">1.5x</button>
      <div class="yrusika-ctrl-divider"></div>
      <button class="yrusika-ctrl-btn" id="ctrl-back" title="Rewind 10s">|&lt;&lt;</button>
      <button class="yrusika-ctrl-btn" id="ctrl-play" title="Play / Pause">&gt;||</button>
      <button class="yrusika-ctrl-btn" id="ctrl-forward" title="Forward 10s">&gt;&gt;|</button>
      <div class="yrusika-ctrl-divider"></div>
      <button class="yrusika-ctrl-btn" id="ctrl-mute" title="Toggle Mute">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
      </button>
      <button class="yrusika-ctrl-btn" id="ctrl-feedback" title="Feedback">Feedback</button>
    `;

    document.body.appendChild(bar);

    // Wire Controller Buttons
    document.getElementById("ctrl-exit").addEventListener("click", togglePanel);
    document.getElementById("ctrl-turtle").addEventListener("click", () => setSpeed(0.8));
    document.getElementById("ctrl-lightning").addEventListener("click", () => setSpeed(1.5));
    document.getElementById("ctrl-back").addEventListener("click", () => seekRelative(-10));
    document.getElementById("ctrl-forward").addEventListener("click", () => seekRelative(10));
    document.getElementById("ctrl-play").addEventListener("click", togglePlay);
    document.getElementById("ctrl-mute").addEventListener("click", toggleMute);
  }

  function setSpeed(rate) {
    if (videoElement) {
      videoElement.playbackRate = videoElement.playbackRate === rate ? 1.0 : rate;
    }
  }

  function seekRelative(delta) {
    if (videoElement) {
      videoElement.currentTime = Math.max(0, videoElement.currentTime + delta);
    }
  }

  function togglePlay() {
    if (videoElement) {
      if (videoElement.paused) videoElement.play();
      else videoElement.pause();
    }
  }

  function toggleMute() {
    if (videoElement) {
      videoElement.muted = !videoElement.muted;
      const muteBtn = document.getElementById("ctrl-mute");
      if (muteBtn) {
        muteBtn.innerHTML = videoElement.muted
          ? `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>`
          : `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>`;
      }
    }
  }

  function togglePanel() {
    isPanelOpen = !isPanelOpen;
    if (sidebarIframe) {
      sidebarIframe.classList.toggle("yrusika-collapsed", !isPanelOpen);
    }
    document.body.classList.toggle("yrusika-active", isPanelOpen);

    const launcher = document.getElementById("yrusika-floating-launcher");
    if (launcher) {
      launcher.style.display = isPanelOpen ? "none" : "flex";
    }
  }

  // Setup YouTube Ad Detector
  function setupAdDetector() {
    setInterval(() => {
      const isAd = document.querySelector(".ad-showing, .ad-interrupting, .video-ads.ytp-ad-module");
      let banner = document.getElementById("yrusika-ad-banner");

      if (isAd && isPanelOpen) {
        if (!banner) {
          banner = document.createElement("div");
          banner.id = "yrusika-ad-banner";
          banner.innerHTML = `<span class="yrusika-ad-icon">&#9646;&#9646;</span> YouTube ad detected. AI Notes will resume when the video returns.`;
          document.body.appendChild(banner);
        }
      } else if (banner) {
        banner.remove();
      }
    }, 1000);
  }

  // Vision Frame Loop: Samples video and detects slide/code changes
  function startFrameLoop() {
    if (checkInterval) clearInterval(checkInterval);

    checkInterval = setInterval(() => {
      if (!videoElement || videoElement.paused || !detector) return;

      // Broadcast frame tick for watcher counter
      sendToPanel("FRAME_TICK");

      const sceneChange = detector.checkFrame(videoElement);
      if (sceneChange) {
        const screenshot = detector.captureScreenshot(videoElement);
        if (screenshot) {
          sendToPanel("SCENE_CHANGE", { screenshot });
        }
      }
    }, 250);
  }

  function sendToPanel(action, payload = {}) {
    if (sidebarIframe && sidebarIframe.contentWindow) {
      sidebarIframe.contentWindow.postMessage(
        { from: "yrusika-content", action, ...payload },
        "*"
      );
    }
  }

  // Listen for actions from sidebar iframe
  window.addEventListener("message", (event) => {
    const data = event.data;
    if (!data || data.from !== "yrusika-panel") return;

    if (data.action === "PANEL_READY") {
      findVideo();
      const title = document.querySelector("h1.ytd-watch-metadata")?.innerText || document.title || "Video";
      sendToPanel("INIT_VIDEO_INFO", {
        video: {
          title: title.replace("- YouTube", "").trim(),
          url: window.location.href,
          currentTime: videoElement ? videoElement.currentTime : 0
        }
      });
    }

    if (data.action === "SEEK_VIDEO") {
      if (videoElement && typeof data.timestamp === "number") {
        videoElement.currentTime = data.timestamp;
      }
    }

    if (data.action === "TOGGLE_PANEL") {
      togglePanel();
    }

    if (data.action === "THEME_CHANGED" && data.colors) {
      const root = document.documentElement;
      root.style.setProperty("--yrusika-bg-dark", data.colors.bgPrimary);
      root.style.setProperty("--yrusika-accent", data.colors.primaryBrand);
      root.style.setProperty("--yrusika-text", data.colors.textPrimary);
      root.style.setProperty("--yrusika-border", data.colors.uiBorder);
    }

    if (data.action === "TRIGGER_SNAPSHOT") {
      findVideo();
      if (videoElement && detector) {
        const screenshot = detector.captureScreenshot(videoElement);
        if (screenshot) {
          sendToPanel("MANUAL_SNAPSHOT", { screenshot });
        }
      }
    }
  });

  // Re-check for video on URL changes (YouTube SPA navigation)
  let lastUrl = location.href;
  new MutationObserver(() => {
    const url = location.href;
    if (url !== lastUrl) {
      lastUrl = url;
      setTimeout(findVideo, 1000);
    }
  }).observe(document, { subtree: true, childList: true });

  // Boot up
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

