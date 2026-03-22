/**
 * canvas.js — Hand-tracking drawing canvas
 *
 * Connects to the Python WebSocket server (ws://localhost:8765)
 * which streams { x, y, pinching, frameWidth, frameHeight } messages.
 * When pinching=true, draws red strokes on the canvas.
 * Save button: downloads strokes as .txt and posts to save_text.php
 */

'use strict';

// ─── Session Check ────────────────────────────────────────────────────────────
(async function checkSession() {
  try {
    const res  = await fetch('php/login.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ __check: true }),
      credentials: 'same-origin'
    });
    const data = await res.json();
    // If the server returns 401, redirect
    if (res.status === 401) {
      window.location.href = 'index.html';
    }
  } catch (_) { /* server down, continue */ }
})();

// Fetch username from a tiny helper
(async function loadUser() {
  try {
    const res  = await fetch('php/session_info.php', { credentials: 'same-origin' });
    const data = await res.json();
    if (data.success) {
      document.getElementById('userName').textContent = data.name;
    } else {
      window.location.href = 'index.html';
    }
  } catch (_) {
    document.getElementById('userName').textContent = 'You';
  }
})();

// ─── Canvas Setup ─────────────────────────────────────────────────────────────
const canvas    = document.getElementById('drawCanvas');
const ctx       = canvas.getContext('2d');
let isDrawing   = false;
let strokes     = [];         // Array of strokes: [{points:[{x,y},...]}]
let currentStroke = null;

function resizeCanvas() {
  const wrapper = canvas.parentElement;
  // Save existing drawing image
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  canvas.width  = wrapper.clientWidth;
  canvas.height = wrapper.clientHeight;
  // Restore image (may be slightly off on resize, acceptable)
  ctx.putImageData(imgData, 0, 0);
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// Draw style
ctx.lineWidth   = 4;
ctx.strokeStyle = '#e63946';
ctx.lineCap     = 'round';
ctx.lineJoin    = 'round';

// ─── Webcam Preview (Streamed from Python Backend) ───────────
const videoEl = document.getElementById('webcam');
const imgEl = document.createElement('img');
imgEl.id = 'webcam';
imgEl.style.width = '100%';
imgEl.style.height = '100%';
imgEl.style.objectFit = 'cover';
imgEl.style.borderRadius = '8px';
videoEl.parentElement.replaceChild(imgEl, videoEl);

// ─── WebSocket — Python Hand Tracker ─────────────────────────────────────────
const WS_URL         = 'ws://localhost:8799';
const statusPill     = document.getElementById('statusPill');
const statusText     = document.getElementById('statusText');
const pinchIndicator = document.getElementById('pinchIndicator');
let   ws             = null;
let   reconnectTimer = null;

function setStatus(connected) {
  if (connected) {
    statusPill.className = 'status-pill connected';
    statusText.textContent = 'Tracker Connected';
  } else {
    statusPill.className = 'status-pill disconnected';
    statusText.textContent = 'Tracker Disconnected';
  }
}

function connectWS() {
  ws = new WebSocket(WS_URL);

  ws.onopen = () => {
    setStatus(true);
    if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
  };

  ws.onmessage = (event) => {
    let data;
    try { data = JSON.parse(event.data); } catch { return; }

    const { x, y, pinching, frameWidth = 1280, frameHeight = 720, image } = data;

    // Stream the preview image
    if (image) {
      document.getElementById('webcam').src = 'data:image/jpeg;base64,' + image;
    }

    // Map tracker coordinates to canvas space (Python is already naturally mirrored)
    const cx = (x / frameWidth  * canvas.width);
    const cy = (y / frameHeight * canvas.height);

    // Update pinch UI
    if (pinching) {
      pinchIndicator.className = 'pinch-indicator active';
      pinchIndicator.textContent = '✏️ Drawing…';
    } else {
      pinchIndicator.className = 'pinch-indicator';
      pinchIndicator.textContent = '✋ Hold up your hand — pinch to draw';
    }

    handleTrackerPoint(cx, cy, pinching);
  };

  ws.onclose = () => {
    setStatus(false);
    // Auto-reconnect every 2 seconds
    reconnectTimer = setTimeout(connectWS, 2000);
  };

  ws.onerror = () => { ws.close(); };
}
connectWS();

// ─── Drawing Logic ────────────────────────────────────────────────────────────
function handleTrackerPoint(x, y, pinching) {
  if (pinching) {
    if (!isDrawing) {
      // Start new stroke
      isDrawing     = true;
      currentStroke = { points: [{ x, y }] };
      strokes.push(currentStroke);
      ctx.beginPath();
      ctx.moveTo(x, y);
    } else {
      currentStroke.points.push({ x, y });
      ctx.lineWidth   = 4;
      ctx.strokeStyle = '#e63946';
      ctx.lineCap     = 'round';
      ctx.lineJoin    = 'round';
      ctx.lineTo(x, y);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x, y);
    }
  } else {
    if (isDrawing) {
      isDrawing     = false;
      currentStroke = null;
      ctx.beginPath(); // lift pen
    }
  }
}

// ─── Redraw all strokes (used after clear/undo) ───────────────────────────────
function redrawAll() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.lineWidth   = 4;
  ctx.strokeStyle = '#e63946';
  ctx.lineCap     = 'round';
  ctx.lineJoin    = 'round';

  for (const stroke of strokes) {
    if (stroke.points.length < 2) continue;
    ctx.beginPath();
    ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
    for (let i = 1; i < stroke.points.length; i++) {
      ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
    }
    ctx.stroke();
  }
}

// ─── Clear Button ─────────────────────────────────────────────────────────────
document.getElementById('clearBtn').addEventListener('click', () => {
  strokes = [];
  currentStroke = null;
  isDrawing = false;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
});

// ─── Undo Button ─────────────────────────────────────────────────────────────
document.getElementById('undoBtn').addEventListener('click', () => {
  if (strokes.length === 0) return;
  strokes.pop();
  redrawAll();
});

// Keyboard shortcut Ctrl+Z
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
    e.preventDefault();
    if (strokes.length > 0) { strokes.pop(); redrawAll(); }
  }
});

// ─── Save & Download ──────────────────────────────────────────────────────────
document.getElementById('saveBtn').addEventListener('click', async () => {
  if (strokes.length === 0) {
    alert('Nothing to save yet! Draw something first.');
    return;
  }

  const saveBtn = document.getElementById('saveBtn');
  const originalHtml = saveBtn.innerHTML;
  saveBtn.innerHTML = '⏳ Analyzing text...';
  saveBtn.disabled = true;

  try {
    // 1. Create a temporary canvas with a white background for better OCR
    const offCanvas = document.createElement('canvas');
    offCanvas.width = canvas.width;
    offCanvas.height = canvas.height;
    const offCtx = offCanvas.getContext('2d');
    
    // Fill white background
    offCtx.fillStyle = '#ffffff';
    offCtx.fillRect(0, 0, offCanvas.width, offCanvas.height);
    
    // Draw strokes in solid black for high contrast OCR
    offCtx.lineWidth = 4;
    offCtx.lineCap = 'round';
    offCtx.lineJoin = 'round';
    offCtx.strokeStyle = '#000000';
    
    for (const stroke of strokes) {
      if (stroke.points.length < 2) continue;
      offCtx.beginPath();
      offCtx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (let i = 1; i < stroke.points.length; i++) {
        offCtx.lineTo(stroke.points[i].x, stroke.points[i].y);
      }
      offCtx.stroke();
    }

    const imgDataUrl = offCanvas.toDataURL('image/png');

    // 2. Run Tesseract OCR
    const { data: { text } } = await Tesseract.recognize(imgDataUrl, 'eng');

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const title     = `Donna_Notes_${timestamp}`;

    // ── Build a text representation ──────────────────────────────
    let textContent = `Donna Hand-Writing Extract\n`;
    textContent    += `Saved: ${new Date().toLocaleString()}\n`;
    textContent    += `${'─'.repeat(50)}\n\n`;
    textContent    += `${text || '(No text could be recognized)'}\n\n`;
    textContent    += `${'─'.repeat(50)}\n`;
    textContent    += `(Note: Raw stroke data is saved securely to your account)\n`;

    // ── Download as .txt ────────────────────────────────────────────────────
    const blob = new Blob([textContent], { type: 'text/plain' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `${title}.txt`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1000);

    // ── Save array raw data to backend like before ───────────────
    await fetch('php/save_text.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ title, stroke_data: strokes })
    });

    // ── Show notification ────────────────────────────────────────────────────
    const notify = document.getElementById('saveNotify');
    notify.classList.remove('show');
    void notify.offsetWidth; // force reflow
    notify.classList.add('show');

  } catch (err) {
    console.error('OCR Error:', err);
    alert('Oops! Failed to extract text from your drawing... Check console.');
  } finally {
    saveBtn.innerHTML = originalHtml;
    saveBtn.disabled = false;
  }
});

// ─── Logout ───────────────────────────────────────────────────────────────────
document.getElementById('logoutBtn').addEventListener('click', async () => {
  await fetch('php/logout.php', { credentials: 'same-origin' });
  window.location.href = 'index.html';
});
