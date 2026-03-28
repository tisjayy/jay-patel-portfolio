/**
 * jspaint-app.js-snippet.js
 * ─────────────────────────
 * Add these two lines to the BOTTOM of jspaint's  src/app.js,
 * after all tool and history initialisation is complete.
 *
 * How to find the right spot:
 *   - Search for the last line that reads something like:
 *       $(document).trigger("app-loaded");
 *     or the very last line of the top-level IIFE / module body.
 *   - Paste the two lines directly below it.
 *
 * ---------- CUT HERE ----------
 */

// ── Jay OS AI Bridge ──────────────────────────────────────────────────
// Expose the main drawing canvas so jspaint-bridge.js can read/write it.
window._jspaintCanvas   = $canvas[0];
// Expose jspaint's undoable() so AI results land in Ctrl+Z history.
// If jspaint's internal variable is named differently in your version,
// replace "undoable" with its actual name.
window._jspaintUndoable = (typeof undoable === 'function') ? undoable : null;
