'use strict';

/**
 * PaintAI
 * Bridges the jspaint iframe with the /api/imagine Vercel proxy.
 *
 * postMessage protocol (parent ↔ iframe):
 *   parent → iframe : { type: 'JSPAINT_GET_CANVAS', requestId }
 *   iframe → parent : { type: 'JSPAINT_CANVAS_DATA',  requestId, dataURL, width, height }
 *
 *   parent → iframe : { type: 'JSPAINT_SET_CANVAS', requestId, payload: { dataURL } }
 *   iframe → parent : { type: 'JSPAINT_SET_COMPLETE', requestId }
 *                   | { type: 'JSPAINT_SET_ERROR',    requestId, error }
 */
class PaintAI {
  constructor() {
    /** @type {Array<{target: EventTarget, type: string, fn: Function}>} */
    this._listeners = [];
    /** @type {Map<string, {resolve: Function, reject: Function, timeoutId: number}>} */
    this._pending = new Map();
  }

  activateEvents() {
    const btn    = document.getElementById('paint-magic-btn');
    const iframe = document.getElementById('paint-iframe');
    if (!btn || !iframe) return;

    // Disable until jspaint bridge confirms it's alive
    btn.disabled = true;
    btn.title = 'Waiting for jspaint to load…';

    const onMessage     = (e) => this._handleIframeMessage(e);
    const onClick       = ()  => this._triggerMagicAI();
    const onIframeLoad  = ()  => {
      // When iframe resets to about:blank (paint window closed), cancel pending and re-lock button.
      if (!iframe.src || iframe.src === 'about:blank' || iframe.src === location.href) {
        for (const [, { reject, timeoutId }] of this._pending) {
          clearTimeout(timeoutId);
          reject(new Error('iframe unloaded'));
        }
        this._pending.clear();
        btn.disabled = true;
        btn.title = 'Waiting for jspaint to load\u2026';
      }
    };

    window.addEventListener('message', onMessage);
    btn.addEventListener('click', onClick);
    iframe.addEventListener('load', onIframeLoad);

    this._listeners.push(
      { target: window, type: 'message', fn: onMessage },
      { target: btn,    type: 'click',   fn: onClick },
      { target: iframe, type: 'load',    fn: onIframeLoad },
    );
  }

  deactivateEvents() {
    for (const { target, type, fn } of this._listeners) {
      target.removeEventListener(type, fn);
    }
    this._listeners = [];

    for (const [, { reject, timeoutId }] of this._pending) {
      clearTimeout(timeoutId);
      reject(new Error('PaintAI deactivated'));
    }
    this._pending.clear();
  }

  // ── Private ─────────────────────────────────────────────────────────────

  /** Dispatch incoming iframe messages to pending promise resolvers. */
  _handleIframeMessage(event) {
    const msg = event.data;
    if (!msg || typeof msg !== 'object') return;

    // Bridge ready signal — enable the button
    if (msg.type === 'JSPAINT_READY') {
      const btn = document.getElementById('paint-magic-btn');
      if (btn) { btn.disabled = false; btn.title = ''; }
      return;
    }

    const { type, requestId } = msg;
    if (!requestId || !this._pending.has(requestId)) return;

    const { resolve, reject, timeoutId } = this._pending.get(requestId);
    this._pending.delete(requestId);
    clearTimeout(timeoutId);

    switch (type) {
      case 'JSPAINT_CANVAS_DATA':
        msg.error
          ? reject(new Error(msg.error))
          : resolve({ dataURL: msg.dataURL, width: msg.width, height: msg.height });
        break;
      case 'JSPAINT_SET_COMPLETE':
        resolve();
        break;
      case 'JSPAINT_SET_ERROR':
        reject(new Error(msg.error || 'Set-canvas failed'));
        break;
      default:
        break;
    }
  }

  /**
   * Send a postMessage to the jspaint iframe and return a Promise that resolves
   * when jspaint posts the corresponding response back.
   * @param {object} message  Object to send (type + any extra fields).
   * @param {number} [timeoutMs=12000]
   */
  _postToIframe(message, timeoutMs = 12000) {
    return new Promise((resolve, reject) => {
      const iframe = document.getElementById('paint-iframe');
      if (!iframe?.contentWindow) {
        return reject(new Error('jspaint iframe is not ready'));
      }

      const requestId = `pai_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const timeoutId = setTimeout(() => {
        this._pending.delete(requestId);
        reject(new Error(`Timed out waiting for jspaint reply: ${message.type}`));
      }, timeoutMs);

      this._pending.set(requestId, { resolve, reject, timeoutId });
      iframe.contentWindow.postMessage({ ...message, requestId }, '*');
    });
  }

  /** Update the inline status label in the AI toolbar. */
  _setStatus(text, isError = false) {
    const el = document.getElementById('paint-ai-status');
    if (!el) return;
    el.textContent = text;
    el.style.color      = isError ? '#c00' : '#007700';
    el.style.fontWeight = isError ? 'bold' : 'normal';
  }

  /** Full pipeline: grab canvas → call API → re-inject result. */
  async _triggerMagicAI() {
    const btn      = document.getElementById('paint-magic-btn');
    const promptEl = document.getElementById('paint-ai-prompt');
    btn.disabled = true;

    try {
      // ① Read current drawing from jspaint
      this._setStatus('Reading canvas…');
      const { dataURL, width, height } = await this._postToIframe({ type: 'JSPAINT_GET_CANVAS' });

      // ② Send to /api/imagine (Vercel → Nova Canvas)
      this._setStatus('Generating AI image…');
      const prompt = promptEl?.value?.trim() ?? '';
      const resp = await fetch('/api/imagine', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ imageDataURL: dataURL, prompt, width, height }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || `Server error ${resp.status}`);
      }
      const { imageDataURL } = await resp.json();

      // ③ Re-inject AI result back into the jspaint canvas
      this._setStatus('Applying result…');
      await this._postToIframe({ type: 'JSPAINT_SET_CANVAS', payload: { dataURL: imageDataURL } });

      this._setStatus('Done ✓');
      setTimeout(() => this._setStatus(''), 3000);
    } catch (err) {
      console.error('[PaintAI]', err);
      this._setStatus(err.message, true);
      setTimeout(() => this._setStatus(''), 6000);
    } finally {
      btn.disabled = false;
    }
  }
}

export default PaintAI;
