/**
 * VisionDetector: Client-side video frame sampling & scene-change detector
 * Implements quadrant edge-difference computer vision scene detection.
 */
class VisionDetector {
  constructor(options = {}) {
    this.tinyWidth = options.tinyWidth || 128;
    this.tinyHeight = options.tinyHeight || 72;
    this.threshold = options.threshold || 4.0;
    this.minQuadrants = options.minQuadrants || 2;
    this.cooldownMs = options.cooldownMs || 500;
    this.sampleEveryNFrames = options.sampleEveryNFrames || 10;

    this.frameCount = 0;
    this.lastTriggerTime = -1000;
    this.prevLuminance = null;

    // Offscreen calculation canvas
    this.calcCanvas = document.createElement("canvas");
    this.calcCanvas.width = this.tinyWidth;
    this.calcCanvas.height = this.tinyHeight;
    this.calcCtx = this.calcCanvas.getContext("2d", { willReadFrequently: true });
  }

  // Convert RGB frame to BT.601 luminance
  toLuminance(rgba, size) {
    const lum = new Float32Array(size);
    for (let i = 0; i < size; i++) {
      const idx = i * 4;
      lum[i] = 0.299 * rgba[idx] + 0.587 * rgba[idx + 1] + 0.114 * rgba[idx + 2];
    }
    return lum;
  }

  // Sobel edge difference between two luminance quadrants
  edgeDiff(prev, curr, width, height) {
    let sum = 0;
    let count = 0;
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = y * width + x;
        const gx1 = prev[idx + 1] - prev[idx - 1];
        const gy1 = prev[idx + width] - prev[idx - width];
        const mag1 = Math.sqrt(gx1 * gx1 + gy1 * gy1);

        const gx2 = curr[idx + 1] - curr[idx - 1];
        const gy2 = curr[idx + width] - curr[idx - width];
        const mag2 = Math.sqrt(gx2 * gx2 + gy2 * gy2);

        sum += Math.abs(mag1 - mag2);
        count++;
      }
    }
    return count > 0 ? sum / count : 0;
  }

  // Slices luminance buffer into one of 4 quadrants (0: TL, 1: TR, 2: BL, 3: BR)
  sliceQuadrant(lum, width, height, quadIdx) {
    const halfW = Math.floor(width / 2);
    const halfH = Math.floor(height / 2);
    const startX = (quadIdx % 2) * halfW;
    const startY = Math.floor(quadIdx / 2) * halfH;

    const out = new Float32Array(halfW * halfH);
    for (let y = 0; y < halfH; y++) {
      for (let x = 0; x < halfW; x++) {
        out[y * halfW + x] = lum[(startY + y) * width + (startX + x)];
      }
    }
    return { data: out, width: halfW, height: halfH };
  }

  // Evaluate frame change on video element
  checkFrame(video) {
    if (!video || video.paused || video.ended || video.readyState < 2) {
      return null;
    }

    this.frameCount++;
    if (this.frameCount % this.sampleEveryNFrames !== 0) {
      return null;
    }

    const currentTimeMs = (video.currentTime || 0) * 1000;

    // Draw downsampled frame
    this.calcCtx.drawImage(video, 0, 0, this.tinyWidth, this.tinyHeight);
    const imgData = this.calcCtx.getImageData(0, 0, this.tinyWidth, this.tinyHeight);
    const currentLum = this.toLuminance(imgData.data, this.tinyWidth * this.tinyHeight);

    if (!this.prevLuminance) {
      this.prevLuminance = currentLum;
      this.lastTriggerTime = currentTimeMs;
      return null;
    }

    if (currentTimeMs - this.lastTriggerTime < this.cooldownMs) {
      this.prevLuminance = currentLum;
      return null;
    }

    // Quadrant edge evaluation
    const halfW = Math.floor(this.tinyWidth / 2);
    const halfH = Math.floor(this.tinyHeight / 2);
    let triggeredCount = 0;
    const scores = [];

    for (let q = 0; q < 4; q++) {
      const qPrev = this.sliceQuadrant(this.prevLuminance, this.tinyWidth, this.tinyHeight, q);
      const qCurr = this.sliceQuadrant(currentLum, this.tinyWidth, this.tinyHeight, q);
      const score = this.edgeDiff(qPrev.data, qCurr.data, halfW, halfH);
      scores.push(score);
      if (score > this.threshold) {
        triggeredCount++;
      }
    }

    this.prevLuminance = currentLum;

    if (triggeredCount >= this.minQuadrants) {
      this.lastTriggerTime = currentTimeMs;
      return {
        timestamp: video.currentTime,
        formattedTime: this.formatTime(video.currentTime),
        scores,
        maxScore: Math.max(...scores),
        triggeredCount
      };
    }

    return null;
  }

  // Formats seconds into MM:SS or HH:MM:SS
  formatTime(seconds) {
    const s = Math.floor(seconds || 0);
    const hrs = Math.floor(s / 3600);
    const mins = Math.floor((s % 3600) / 60);
    const secs = s % 60;
    if (hrs > 0) {
      return `${String(hrs).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
    }
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }

  // Capture high-res screenshot with timestamp badge
  captureScreenshot(video) {
    if (!video) return null;

    const width = video.videoWidth || video.clientWidth || 1280;
    const height = video.videoHeight || video.clientHeight || 720;

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(video, 0, 0, width, height);

    const formatted = this.formatTime(video.currentTime);

    // High-visibility timestamp badge
    const fontSize = Math.max(16, Math.round(width / 50));
    ctx.font = `bold ${fontSize}px monospace`;

    const textMetrics = ctx.measureText(formatted);
    const badgeW = textMetrics.width + 24;
    const badgeH = fontSize + 16;
    const badgeX = width - badgeW - 16;
    const badgeY = 16;

    // Dark translucent background badge
    ctx.fillStyle = "rgba(0, 0, 0, 0.78)";
    ctx.beginPath();
    ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 6);
    ctx.fill();

    // White monospace text
    ctx.fillStyle = "#ffffff";
    ctx.fillText(formatted, badgeX + 12, badgeY + badgeH - 10);

    return {
      dataUrl: canvas.toDataURL("image/jpeg", 0.9),
      timestamp: video.currentTime,
      formattedTime: formatted,
      width,
      height
    };
  }
}

window.VisionDetector = VisionDetector;

