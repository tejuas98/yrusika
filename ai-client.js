/**
 * AIClient: Direct client for Google Gemini & Local Ollama
 * Replaces proprietary paywalled backends with unlimited direct inference.
 */
class AIClient {
  constructor() {
    this.provider = "gemini"; // "gemini" | "ollama"
    this.geminiApiKey = "";
    this.geminiModel = "gemini-2.5-flash";
    this.ollamaEndpoint = "http://localhost:11434";
    this.ollamaModel = "llama3.2-vision";
    this.loadSettings();
  }

  async loadSettings() {
    this.geminiModel = "gemini-2.5-flash"; // Enforce verified working model

    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
      const data = await chrome.storage.local.get([
        "yrusika_provider",
        "yrusika_gemini_key",
        "yrusika_gemini_model",
        "yrusika_ollama_endpoint",
        "yrusika_ollama_model"
      ]);
      this.provider = data.yrusika_provider || "gemini";
      if (data.yrusika_gemini_key) {
        this.geminiApiKey = data.yrusika_gemini_key;
      }
      
      // Purge any outdated or deprecated model strings cached in browser storage
      let model = data.yrusika_gemini_model || "gemini-2.5-flash";
      if (!model || model.includes("2.0-flash") || model.includes("1.5-flash")) {
        model = "gemini-2.5-flash";
        await chrome.storage.local.set({ yrusika_gemini_model: "gemini-2.5-flash" });
      }
      this.geminiModel = model;
      this.ollamaEndpoint = data.yrusika_ollama_endpoint || "http://localhost:11434";
      this.ollamaModel = data.yrusika_ollama_model || "llama3.2-vision";
    }
  }

  async saveSettings(settings) {
    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
      await chrome.storage.local.set(settings);
      await this.loadSettings();
    }
  }

  getSystemPrompt(timestampStr, videoTitle) {
    return `You are Yrusika, an expert technical note-taking AI observing an engineering lecture titled "${videoTitle}".
Current timestamp: [${timestampStr}]

Analyze this video keyframe image carefully:
1. If on-screen code or terminal commands are shown: transcribe them into clean Markdown code blocks with exact language tags (e.g. \`\`\`go, \`\`\`python, \`\`\`bash).
2. If mathematical formulas are shown: transcribe them into standard KaTeX/LaTeX math notation ($...$ or $$...$$).
3. If diagrams, flowcharts, or architecture mindmaps are shown: summarize them using a Mermaid.js code block (e.g. \`\`\`mermaid) or clean indented hierarchical bullets.
4. Summarize the core engineering concepts, definitions, and decisions explained in this visual in 2-4 clear, professional bullet points.
5. Do NOT include fluff, introductory chit-chat, or emojis. Output concise, production-grade technical notes.`;
  }

  async generateNoteFromFrame(screenshotDataUrl, timestampStr, videoTitle = "Video") {
    await this.loadSettings();

    if (this.provider === "gemini") {
      return this.callGemini(screenshotDataUrl, timestampStr, videoTitle);
    } else if (this.provider === "ollama") {
      return this.callOllama(screenshotDataUrl, timestampStr, videoTitle);
    }
    return this.fallbackNote(timestampStr);
  }

  async callGemini(screenshotDataUrl, timestampStr, videoTitle) {
    const key = this.geminiApiKey;
    if (!key) {
      return {
        error: "NO_API_KEY",
        text: `**Timestamp [${timestampStr}]**: Frame captured. Please add your free Gemini API key in extension Settings to enable AI auto-transcription.`
      };
    }

    const base64Data = screenshotDataUrl.replace(/^data:image\/\w+;base64,/, "");
    let modelName = this.geminiModel || "gemini-2.5-flash";
    let url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${key}`;

    const prompt = this.getSystemPrompt(timestampStr, videoTitle);

    const payload = {
      contents: [
        {
          parts: [
            { text: prompt },
            {
              inline_data: {
                mime_type: "image/jpeg",
                data: base64Data
              }
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 1024
      }
    };

    try {
      let resp = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      // Automatic fallback if requested model is deprecated
      if (resp.status === 404 && modelName !== "gemini-2.5-flash") {
        console.warn(`Model ${modelName} 404, falling back to gemini-2.5-flash`);
        modelName = "gemini-2.5-flash";
        url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`;
        resp = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
      }

      if (!resp.ok) {
        const errText = await resp.text();
        return {
          error: "API_ERROR",
          text: `**Timestamp [${timestampStr}]**: Gemini API returned error (${resp.status}): ${errText.slice(0, 200)}`
        };
      }

      const json = await resp.json();
      const text = json.candidates?.[0]?.content?.parts?.[0]?.text || "No notes generated for this frame.";
      return { text, error: null };
    } catch (err) {
      return {
        error: "NETWORK_ERROR",
        text: `**Timestamp [${timestampStr}]**: Connection failed: ${err.message}`
      };
    }
  }

  async callOllama(screenshotDataUrl, timestampStr, videoTitle) {
    const base64Data = screenshotDataUrl.replace(/^data:image\/\w+;base64,/, "");
    const prompt = this.getSystemPrompt(timestampStr, videoTitle);

    try {
      const resp = await fetch(`${this.ollamaEndpoint}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: this.ollamaModel,
          prompt: prompt,
          images: [base64Data],
          stream: false
        })
      });

      if (!resp.ok) {
        return {
          error: "OLLAMA_ERROR",
          text: `**Timestamp [${timestampStr}]**: Ollama returned status ${resp.status}. Ensure Ollama is running with ${this.ollamaModel}.`
        };
      }

      const json = await resp.json();
      return { text: json.response || "No response from local Ollama model.", error: null };
    } catch (err) {
      return {
        error: "OLLAMA_OFFLINE",
        text: `**Timestamp [${timestampStr}]**: Could not connect to Ollama at ${this.ollamaEndpoint}. Ensure 'ollama serve' is running.`
      };
    }
  }

  fallbackNote(timestampStr) {
    return {
      error: "NO_PROVIDER",
      text: `### Keyframe [${timestampStr}]\n- Visual scene change detected on video canvas.\n- Connect an AI provider in Settings to auto-generate markdown code and notes.`
    };
  }

  async askQuestion(userPrompt, context = {}) {
    await this.loadSettings();

    const systemPrompt = `You are Yrusika AI, an expert pair-programming tutor and study assistant.
Video Title: "${context.title || "Lecture"}"
Current Video Position: ${context.currentTime || "00:00"}
Recent Lecture Notes & Code Context:
${context.notesText ? context.notesText.slice(-3000) : "No notes captured yet."}

Answer the user's question clearly and concisely.
If explaining code, provide clean syntax-highlighted code blocks.
Use LaTeX math ($...$) for formulas.
Keep answers helpful, direct, and zero emojis.`;

    if (this.provider === "gemini") {
      const key = this.geminiApiKey;
      if (!key) {
        return "Please add your free Google Gemini API key in extension Settings to use Yrusika AI.";
      }
      let modelName = this.geminiModel || "gemini-2.5-flash";
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${key}`;
      const payload = {
        contents: [
          {
            parts: [
              { text: systemPrompt },
              { text: `User Question: ${userPrompt}` }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 1024
        }
      };

      try {
        const resp = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        if (!resp.ok) {
          return `Gemini API returned error (${resp.status})`;
        }
        const json = await resp.json();
        return json.candidates?.[0]?.content?.parts?.[0]?.text || "No response generated.";
      } catch (err) {
        return `Failed to connect to Gemini: ${err.message}`;
      }
    } else if (this.provider === "ollama") {
      try {
        const resp = await fetch(`${this.ollamaEndpoint}/api/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: this.ollamaModel,
            prompt: `${systemPrompt}\n\nUser Question: ${userPrompt}`,
            stream: false
          })
        });
        if (!resp.ok) return `Ollama returned status ${resp.status}`;
        const json = await resp.json();
        return json.response || "No response from local Ollama model.";
      } catch (err) {
        return `Could not connect to Ollama at ${this.ollamaEndpoint}.`;
      }
    }
    return "No AI provider configured.";
  }
}

window.AIClient = AIClient;
