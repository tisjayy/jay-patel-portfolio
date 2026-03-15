'use strict';

/**
 * PaintAI â€” postMessage bridge + Magic AI widget controller.
 *
 * postMessage protocol (parent â†” jspaint iframe):
 *   parent  â†’ iframe : { type: 'JSPAINT_GET_CANVAS', requestId }
 *   iframe  â†’ parent : { type: 'JSPAINT_CANVAS_DATA', requestId, dataURL, width, height }
 *   parent  â†’ iframe : { type: 'JSPAINT_SET_CANVAS', requestId, payload: { dataURL } }
 *   iframe  â†’ parent : { type: 'JSPAINT_SET_COMPLETE', requestId }
 *                    | { type: 'JSPAINT_SET_ERROR',    requestId, error }
 *   iframe  â†’ parent : { type: 'JSPAINT_READY' }  (once, on bridge load)
 */
class PaintAI {
  static LS_KEY        = 'pai_daily_count';
  static LS_DATE_KEY   = 'pai_daily_date';
  static CLIENT_LIMIT  = 2; // must match IMAGINE_IP_DAILY_LIMIT on server

  constructor() {
    /** @type {Array<{target: EventTarget, type: string, fn: Function}>} */
    this._listeners = [];
    /** @type {Map<string, {resolve: Function, reject: Function, timeoutId: number}>} */
    this._pending = new Map();
    /** Cleanup fn for in-progress widget drag (if window is closed mid-drag). */
    this._widgetDragCleanup = null;
    /** True once JSPAINT_READY has been received. */
    this._jspaintReady = false;
  }

  // ── localStorage helpers ────────────────────────────────────────────────

  _getLocalCount() {
    const today = new Date().toISOString().slice(0, 10);
    const saved = localStorage.getItem(PaintAI.LS_DATE_KEY);
    if (saved !== today) {
      // New UTC day — reset counter
      localStorage.setItem(PaintAI.LS_DATE_KEY, today);
      localStorage.setItem(PaintAI.LS_KEY, '0');
      return 0;
    }
    return parseInt(localStorage.getItem(PaintAI.LS_KEY) || '0', 10);
  }

  _incrementLocalCount() {
    const next = this._getLocalCount() + 1;
    localStorage.setItem(PaintAI.LS_KEY, String(next));
    return next;
  }

  _isLocalLimitReached() {
    return this._getLocalCount() >= PaintAI.CLIENT_LIMIT;
  }

  _applyLocalLimitUI() {
    if (!this._isLocalLimitReached()) return;
    const btn   = document.getElementById('paint-magic-btn');
    const input = document.getElementById('paint-ai-prompt');
    if (btn)   { btn.disabled = true; btn.title = 'Daily limit reached'; }
    if (input) { input.placeholder = 'Daily limit reached — resets tomorrow'; input.disabled = true; }
    this._setStatus('Daily limit reached', true);
  }

  activateEvents() {
    const btn    = document.getElementById('paint-magic-btn');
    const iframe = document.getElementById('paint-iframe');
    if (!btn || !iframe) return;

    // Button stays disabled until JSPAINT_READY arrives from the bridge.
    btn.disabled = true;
    btn.title = 'Waiting for jspaint to load\u2026';

    // â”€â”€ Core event handlers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const onMessage    = (e) => this._handleIframeMessage(e);
    const onClick      = ()  => this._triggerMagicAI();
    const onEnter      = (e) => { if (e.key === 'Enter' && !btn.disabled) this._triggerMagicAI(); };
    const onIframeLoad = ()  => {
      // iframe reset to about:blank â†’ paint window was closed; re-lock button.
      if (!iframe.src || iframe.src === 'about:blank' || iframe.src === location.href) {
        for (const [, { reject, timeoutId }] of this._pending) {
          clearTimeout(timeoutId);
          reject(new Error('iframe unloaded'));
        }
        this._pending.clear();
        this._jspaintReady = false;
        this.setLoadingState(false); // restore UI (button stays locked since _jspaintReady = false)
      }
    };

    window.addEventListener('message', onMessage);
    btn.addEventListener('click', onClick);
    iframe.addEventListener('load', onIframeLoad);

    const promptEl = document.getElementById('paint-ai-prompt');
    if (promptEl) promptEl.addEventListener('keydown', onEnter);

    this._listeners.push(
      { target: window, type: 'message', fn: onMessage },
      { target: btn,    type: 'click',   fn: onClick },
      { target: iframe, type: 'load',    fn: onIframeLoad },
      ...(promptEl ? [{ target: promptEl, type: 'keydown', fn: onEnter }] : []),
    );

    // â”€â”€ Widget drag â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    this._activateWidgetDrag();
  }

  deactivateEvents() {
    for (const { target, type, fn } of this._listeners) {
      target.removeEventListener(type, fn);
    }
    this._listeners = [];

    if (this._widgetDragCleanup) {
      this._widgetDragCleanup();
      this._widgetDragCleanup = null;
    }

    for (const [, { reject, timeoutId }] of this._pending) {
      clearTimeout(timeoutId);
      reject(new Error('PaintAI deactivated'));
    }
    this._pending.clear();
  }

  // â”€â”€ Loading state â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  setLoadingState(isLoading) {
    const btn    = document.getElementById('paint-magic-btn');
    const input  = document.getElementById('paint-ai-prompt');
    const widget = document.getElementById('paint-ai-widget');

    if (isLoading) {
      if (btn)   { btn.disabled = true; }
      if (input) { input.disabled = true; }
      if (widget) widget.classList.add('is-loading');
    } else {
      // Only re-enable button if jspaint bridge is ready
      if (btn)   { btn.disabled = !this._jspaintReady; btn.title = this._jspaintReady ? '' : 'Waiting for jspaint to load\u2026'; }
      if (input) { input.disabled = false; input.value = ''; }
      if (widget) widget.classList.remove('is-loading');
    }
  }

  // â”€â”€ Widget drag â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  _activateWidgetDrag() {
    const titleHandle = document.getElementById('pai-titlebar');
    const widget      = document.getElementById('paint-ai-widget');
    const container   = document.getElementById('paint-content');
    const shield      = document.getElementById('paint-drag-shield');
    if (!titleHandle || !widget || !container) return;

    let drag = null;

    const onMouseMove = (e) => {
      if (!drag) return;
      const dx = e.clientX - drag.startX;
      const dy = e.clientY - drag.startY;

      let newLeft = drag.origLeft + dx;
      let newTop  = drag.origTop  + dy;

      // Clamp inside container bounds
      const maxLeft = container.offsetWidth  - widget.offsetWidth;
      const maxTop  = container.offsetHeight - widget.offsetHeight;
      newLeft = Math.max(0, Math.min(newLeft, maxLeft));
      newTop  = Math.max(0, Math.min(newTop,  maxTop));

      widget.style.left   = newLeft + 'px';
      widget.style.top    = newTop  + 'px';
      widget.style.right  = 'auto';
      widget.style.bottom = 'auto';
    };

    const onMouseUp = () => {
      drag = null;
      if (shield) shield.style.display = 'none';
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup',   onMouseUp);
    };

    const onMouseDown = (e) => {
      if (e.button !== 0) return;
      e.preventDefault();
      // Resolve current position (may still be bottom/right based initially)
      const cRect = container.getBoundingClientRect();
      const wRect = widget.getBoundingClientRect();
      const origLeft = wRect.left - cRect.left;
      const origTop  = wRect.top  - cRect.top;

      // Anchor widget to explicit left/top so bottom/transform/right don't fight
      widget.style.left      = origLeft + 'px';
      widget.style.top       = origTop  + 'px';
      widget.style.right     = 'auto';
      widget.style.bottom    = 'auto';
      widget.style.transform = 'none'; // clear translateX(-50%) set by CSS default position

      drag = { startX: e.clientX, startY: e.clientY, origLeft, origTop };
      if (shield) shield.style.display = 'block';
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup',   onMouseUp);
    };

    titleHandle.addEventListener('mousedown', onMouseDown);
    this._listeners.push({ target: titleHandle, type: 'mousedown', fn: onMouseDown });

    // Store cleanup for in-progress drag on deactivate
    this._widgetDragCleanup = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup',   onMouseUp);
      if (shield) shield.style.display = 'none';
    };
  }

  // â”€â”€ Private â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  _handleIframeMessage(event) {
    const msg = event.data;
    if (!msg || typeof msg !== 'object') return;

    // Bridge ready: unlock button (unless client-side limit already reached)
    if (msg.type === 'JSPAINT_READY') {
      this._jspaintReady = true;
      if (!this._isLocalLimitReached()) {
        const btn = document.getElementById('paint-magic-btn');
        if (btn) { btn.disabled = false; btn.title = ''; }
      } else {
        this._applyLocalLimitUI();
      }
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

  _setStatus(text, isError = false) {
    const el = document.getElementById('paint-ai-status');
    if (!el) return;
    el.textContent = text;
    // Status bar is on dark background — use light colours
    el.style.color = isError ? '#ff6b6b' : 'rgba(255,255,255,0.75)';
  }

  async _triggerMagicAI() {
    const promptEl = document.getElementById('paint-ai-prompt');
    this.setLoadingState(true);

    try {
      this._setStatus('Reading canvas\u2026');
      const { dataURL, width, height } = await this._postToIframe({ type: 'JSPAINT_GET_CANVAS' });

      this._setStatus('Generating\u2026');
      const prompt = promptEl?.value?.trim() ?? '';
      const resp = await fetch('/api/imagine', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ imageDataURL: dataURL, prompt, width, height }),
      });

      if (!resp.ok) {
        const errBody = await resp.json().catch(() => ({}));
        if (resp.status === 429) {
          this._show429Dialog(errBody);
          throw new Error(errBody.message || 'Rate limit reached');
        }
        throw new Error(errBody.error || `Server error ${resp.status}`);
      }
      const { imageDataURL } = await resp.json();

      // Successful generation — increment local counter
      const newCount = this._incrementLocalCount();

      this._setStatus('Applying\u2026');
      await this._postToIframe({ type: 'JSPAINT_SET_CANVAS', payload: { dataURL: imageDataURL } });

      this._setStatus('Done \u2713');
      setTimeout(() => this._setStatus(''), 3000);

      // Lock UI if client limit now reached
      if (newCount >= PaintAI.CLIENT_LIMIT) this._applyLocalLimitUI();
    } catch (err) {
      console.error('[PaintAI]', err);
      this._setStatus(err.message, true);
      setTimeout(() => this._setStatus(''), 6000);
    } finally {
      this.setLoadingState(false);
    }
  }

  // ── Retro 429 error dialog ────────────────────────────────────────────────

  _show429Dialog(errBody) {
    const isGlobal  = errBody?.error === 'global_limit';
    const titleText = isGlobal ? 'Server Overloaded' : 'Out of Generations';
    const bodyText  = errBody?.message
      || (isGlobal
        ? `The AI server has reached its daily quota.\nPlease come back tomorrow!`
        : `You\u2019ve used your free generations for today.\nCome back tomorrow \u2014 it resets at midnight!`);

    const id = 'pai-rate-limit-dialog';
    const existing = document.getElementById(id);
    if (existing) existing.remove();

    const dialog = document.createElement('div');
    dialog.id = id;

    // Draggable XP dialog — reuse same inline style pattern as desktop.js showRetroError
    dialog.style.cssText = [
      'position:fixed', 'top:50%', 'left:50%',
      'transform:translate(-50%,-50%)',
      'z-index:9999999', 'width:340px',
      'background:#d4d0c8',
      'border:2px solid #fff',
      'outline:2px solid #808080',
      'font-family:Tahoma,sans-serif',
      'font-size:12px',
      'box-shadow:4px 4px 10px rgba(0,0,0,0.65)',
      'user-select:none',
    ].join(';');

    dialog.innerHTML = `
      <div id="${id}-tb" style="background:linear-gradient(to right,#0a246a,#3a6ea5);color:#fff;padding:3px 6px;display:flex;align-items:center;justify-content:space-between;cursor:move;">
        <span style="display:flex;align-items:center;gap:6px;">
          <img src="/imgs/icons/error.png" onerror="this.style.display='none'" style="width:16px;height:16px;">
          ${titleText}
        </span>
        <button onclick="document.getElementById('${id}').remove()"
          style="background:#d4d0c8;border:1px solid #808080;color:#000;width:16px;height:14px;font-size:10px;cursor:pointer;padding:0;line-height:1;">&#x2715;</button>
      </div>
      <div style="padding:16px;display:flex;gap:12px;align-items:flex-start;">
        <span style="font-size:36px;line-height:1;">&#x1F9E0;</span>
        <p style="margin:0;line-height:1.6;white-space:pre-line;">${bodyText}</p>
      </div>
      <div style="text-align:center;padding:0 16px 14px;">
        <button onclick="document.getElementById('${id}').remove()"
          style="min-width:75px;padding:3px 12px;background:#d4d0c8;border-top:1px solid #fff;border-left:1px solid #fff;border-right:1px solid #808080;border-bottom:1px solid #808080;cursor:pointer;font-family:Tahoma,sans-serif;font-size:12px;">OK</button>
      </div>
    `;

    document.body.appendChild(dialog);

    // Make it draggable
    const tb = document.getElementById(`${id}-tb`);
    let dd = null;
    const onTBDown = (e) => {
      if (e.button !== 0) return;
      const r = dialog.getBoundingClientRect();
      dd = { sx: e.clientX - r.left, sy: e.clientY - r.top };
      dialog.style.transform = 'none';
      document.addEventListener('mousemove', onTBMove);
      document.addEventListener('mouseup',   onTBUp);
    };
    const onTBMove = (e) => {
      if (!dd) return;
      dialog.style.left = (e.clientX - dd.sx) + 'px';
      dialog.style.top  = (e.clientY - dd.sy) + 'px';
    };
    const onTBUp = () => {
      dd = null;
      document.removeEventListener('mousemove', onTBMove);
      document.removeEventListener('mouseup',   onTBUp);
    };
    tb?.addEventListener('mousedown', onTBDown);

    // Play system error sound if available
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = 'square';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.setValueAtTime(440, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.35);
    } catch (_) { /* audio not available */ }
  }
}

export default PaintAI;

