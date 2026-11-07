/**
 * Unlock Pro & Unlimited Quota for Official Extension
 * Rebrands HoverNotes to Yrusika
 * Strips all commercial upsells, promos, discord, and proprietary telemetry
 * Injected at document_start into https://hovernotes.io/*
 */

(function () {
  // 1. Force Pro status in localStorage
  try {
    const proData = {
      userId: "unlimited_pro_user",
      isPaying: true,
      checkedAt: Date.now()
    };
    window.localStorage.setItem("hn_session_replay_paying", JSON.stringify(proData));
  } catch (e) {}

  // 2. Intercept fetch inside the Next.js web application
  const originalFetch = window.fetch;
  window.fetch = async function (resource, options = {}) {
    const url = typeof resource === "string" ? resource : (resource.url || "");

    // Mock Pro subscription status
    if (url.includes("/api/subscription/status")) {
      return new Response(
        JSON.stringify({
          isPayingCustomer: true,
          hasActiveSubscription: true,
          plan: "pro",
          status: "active",
          tier: "unlimited"
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    // Suppress video mode footer promos ("Invite a friend, get a month free")
    if (url.includes("/api/video-mode/footer")) {
      return new Response(
        JSON.stringify({ promo: null }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    // Neutralize telemetry, reviews, surveys, referrals, and billing
    if (
      url.includes("/api/reviews") ||
      url.includes("/api/surveys") ||
      url.includes("/api/referrals") ||
      url.includes("/api/web_experiments") ||
      url.includes("/api/billing")
    ) {
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    return originalFetch.apply(this, arguments);
  };

  // 3. Prevent external discord & proprietary feedback links from opening
  const originalOpen = window.open;
  window.open = function (url, ...args) {
    if (typeof url === "string") {
      if (url.includes("discord.gg") || url.includes("discord.com")) {
        return null;
      }
      if (url.includes("hovernotes.io/feedback")) {
        return originalOpen.call(window, "https://github.com/tejuas98/yrusika/issues", ...args);
      }
    }
    return originalOpen.apply(this, arguments);
  };

  // 4. Sweep and hide commercial header icons (Discord, Hamza review chat dialog)
  function sweepCommercialElements() {
    try {
      // Hide Discord buttons (by fill, path, or attribute)
      document.querySelectorAll('svg[fill="#5865F2"], path[d^="M19.27"], path[d^="M20.317"]').forEach((el) => {
        const btn = el.closest("button") || el;
        btn.style.setProperty("display", "none", "important");
      });

      // Hide Share feedback chat bubble button in dock header
      document.querySelectorAll('path[d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"]').forEach((el) => {
        const btn = el.closest("button") || el;
        btn.style.setProperty("display", "none", "important");
      });

      document.querySelectorAll('button[aria-label="Share feedback"], button[aria-label*="feedback" i]:not(#sendFeedback)').forEach((btn) => {
        btn.style.setProperty("display", "none", "important");
      });

      // Hide Upgrade & View plans buttons
      document.querySelectorAll("button, a").forEach((node) => {
        const txt = (node.textContent || "").trim().toLowerCase();
        if (txt === "upgrade" || txt === "view plans" || txt.includes("upgrade to use")) {
          node.style.setProperty("display", "none", "important");
        }
      });
    } catch (e) {}
  }

  // 5. Rebrand text in DOM from HoverNotes to Yrusika & remove commercial widgets
  function cleanNode(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      if (node.nodeValue && node.nodeValue.includes("HoverNotes")) {
        node.nodeValue = node.nodeValue.replace(/HoverNotes/g, "Yrusika");
      }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      if (["SCRIPT", "STYLE"].includes(node.tagName)) return;

      // Hide Upgrade & View plans buttons
      if (node.tagName === "BUTTON" || node.tagName === "A") {
        const txt = (node.textContent || "").trim().toLowerCase();
        if (txt === "upgrade" || txt === "view plans" || txt.includes("upgrade to use")) {
          node.style.setProperty("display", "none", "important");
        }
      }

      // Hide Discord links or buttons
      if (node.tagName === "A" && node.href && (node.href.includes("discord.gg") || node.href.includes("discord.com") || node.href.includes("discord"))) {
        node.style.setProperty("display", "none", "important");
      }
      if (node.tagName === "BUTTON") {
        const title = ((node.title || "") + " " + (node.getAttribute("aria-label") || "")).toLowerCase();
        if (title.includes("discord") || title === "share feedback" || title.includes("feedback")) {
          node.style.setProperty("display", "none", "important");
        }
        if (node.querySelector('svg[fill="#5865F2"], path[d^="M19.27"], path[d^="M20.317"], path[d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"]')) {
          node.style.setProperty("display", "none", "important");
        }
      }

      // Dismiss commercial upsell modals (e.g. "Upgrade to use Hovie")
      if (node.getAttribute && (node.getAttribute("role") === "dialog" || (node.className && typeof node.className === "string" && node.className.includes("fixed")))) {
        const dialogText = (node.textContent || "");
        if (dialogText.includes("Upgrade to use Hovie") || (dialogText.includes("Hovie") && dialogText.includes("View plans")) || dialogText.includes("How's HoverNotes working?")) {
          node.style.setProperty("display", "none", "important");
        }
      }

      for (const child of node.childNodes) {
        cleanNode(child);
      }
    }
  }

  function injectCleanStyles() {
    const style = document.createElement("style");
    style.id = "yrusika-clean-style";
    style.textContent = `
      /* Hide Discord button in header */
      button:has(svg[fill="#5865F2"]),
      button:has(path[d^="M19.27"]),
      button:has(path[d^="M20.317"]),
      svg[fill="#5865F2"],
      a[href*="discord"],
      button[title*="Discord" i],
      button[aria-label*="Discord" i],
      [data-testid*="discord" i],

      /* Hide proprietary feedback / review chat bubble button */
      button[aria-label="Share feedback"],
      button[aria-label*="feedback" i]:not(#sendFeedback),
      button:has(path[d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"]),

      /* Hide commercial pricing/billing links and upsell dialogs */
      a[href*="/pricing"],
      a[href*="/billing"] {
        display: none !important;
      }
    `;
    (document.head || document.documentElement).appendChild(style);
  }

  function startRebranding() {
    injectCleanStyles();
    sweepCommercialElements();
    cleanNode(document.body || document.documentElement);

    const observer = new MutationObserver((mutations) => {
      sweepCommercialElements();
      for (const mutation of mutations) {
        for (const addedNode of mutation.addedNodes) {
          cleanNode(addedNode);
        }
        if (mutation.type === "characterData") {
          if (mutation.target.nodeValue && mutation.target.nodeValue.includes("HoverNotes")) {
            mutation.target.nodeValue = mutation.target.nodeValue.replace(/HoverNotes/g, "Yrusika");
          }
        }
      }
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      characterData: true
    });

    // Run sweep periodically to ensure dynamic React renders are cleaned
    const timer = setInterval(sweepCommercialElements, 400);
    setTimeout(() => {
      clearInterval(timer);
      setInterval(sweepCommercialElements, 2000);
    }, 15000);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", startRebranding);
  } else {
    startRebranding();
  }
})();
