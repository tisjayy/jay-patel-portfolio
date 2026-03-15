'use strict';

const https = require('https');

/**
 * POST /api/imagine
 * Body: { imageDataURL: string, prompt?: string, width?: number, height?: number }
 * Response: { imageDataURL: string }   (data:image/png;base64,...)
 *
 * Rate limiting (requires Vercel KV env vars):
 *   - Global daily cap:  IMAGINE_GLOBAL_DAILY_LIMIT (default 50) generations/day across ALL visitors
 *   - Per-IP daily cap:  IMAGINE_IP_DAILY_LIMIT     (default 2)  generations/IP/day
 *   Keys auto-expire after 24 h (86400 s TTL set on first write).
 *
 * CORS: Only accepts requests from the configured ALLOWED_ORIGIN or localhost.
 */

const GLOBAL_DAILY_LIMIT = parseInt(process.env.IMAGINE_GLOBAL_DAILY_LIMIT || '50', 10);
const IP_DAILY_LIMIT     = parseInt(process.env.IMAGINE_IP_DAILY_LIMIT     || '2',  10);
const GLOBAL_KEY         = 'pai:global:daily';
const TTL_SECONDS        = 86400; // 24 h

/** Snap a pixel dimension to the nearest multiple of 64, clamped to [320, 4096]. */
function snapDim(n) {
  const v = Math.round((Number(n) || 512) / 64) * 64;
  return Math.max(320, Math.min(4096, v));
}

/**
 * Minimal Vercel KV client using the REST API over https (no fetch required).
 * Falls back gracefully (allows request) if KV env vars are not configured.
 */
function kvCommand(cmd, ...args) {
  const baseUrl = process.env.KV_REST_API_URL;
  const token   = process.env.KV_REST_API_TOKEN;
  if (!baseUrl || !token) return Promise.resolve(null);

  const path     = '/' + [cmd, ...args].map(encodeURIComponent).join('/');
  const parsed   = new URL(baseUrl);
  const hostname = parsed.hostname;
  const basePath = parsed.pathname.replace(/\/$/, '');

  return new Promise((resolve) => {
    const options = {
      hostname,
      path:    basePath + path,
      method:  'GET',
      headers: { Authorization: `Bearer ${token}` },
    };
    const req = https.request(options, (r) => {
      const chunks = [];
      r.on('data', (c) => chunks.push(c));
      r.on('end', () => {
        try {
          const json = JSON.parse(Buffer.concat(chunks).toString());
          resolve(json.result ?? null);
        } catch (_) { resolve(null); }
      });
    });
    req.on('error', () => resolve(null));
    req.end();
  });
}

/** Atomically increment a counter and set TTL on first write. Returns new value. */
async function kvIncr(key) {
  const newVal = await kvCommand('INCR', key);
  if (newVal === 1) {
    // First write today â€” set 24 h expiry
    await kvCommand('EXPIRE', key, String(TTL_SECONDS));
  }
  return Number(newVal);
}

/** Get current value of a counter (null = KV unavailable). */
async function kvGet(key) {
  const val = await kvCommand('GET', key);
  return val === null ? null : Number(val);
}

module.exports = async function handler(req, res) {
  // â”€â”€ CORS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const allowedOrigins = new Set(
    process.env.ALLOWED_ORIGIN
      ? [process.env.ALLOWED_ORIGIN]
      : ['https://www.jyptl.com', 'https://jay-patel-os.vercel.app']
  );
  const origin = req.headers['origin'] || '';
  const isLocalhost = /^https?:\/\/localhost(:\d+)?$/.test(origin);
  const isAllowed   = allowedOrigins.has(origin) || isLocalhost || origin === '';

  if (isAllowed) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // Reject cross-origin requests that don't match (non-OPTIONS)
  if (!isAllowed) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // â”€â”€ Global daily cap â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const globalCount = await kvGet(GLOBAL_KEY);
  if (globalCount !== null && globalCount >= GLOBAL_DAILY_LIMIT) {
    return res.status(429).json({
      error: 'global_limit',
      message: `The AI has generated its quota of ${GLOBAL_DAILY_LIMIT} images today. It will reset at midnight UTC.`,
    });
  }

  // â”€â”€ Per-IP daily cap â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const ip = (
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.socket?.remoteAddress ||
    'unknown'
  );
  const ipKey    = `pai:ip:${ip}:daily`;
  const ipCount  = await kvGet(ipKey);
  if (ipCount !== null && ipCount >= IP_DAILY_LIMIT) {
    return res.status(429).json({
      error: 'ip_limit',
      message: `You've used your ${IP_DAILY_LIMIT} free generations for today. Come back tomorrow!`,
    });
  }

  // â”€â”€ Validate body â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const { imageDataURL, prompt = '', width, height } = req.body ?? {};
  if (!imageDataURL) return res.status(400).json({ error: 'imageDataURL is required' });

  const token  = process.env.AWS_BEARER_TOKEN_BEDROCK;
  const region = process.env.AWS_REGION || 'us-east-1';
  if (!token) return res.status(500).json({ error: 'AWS_BEARER_TOKEN_BEDROCK is not configured' });

  // Strip "data:image/png;base64," prefix â†’ raw base64 string
  const base64 = imageDataURL.replace(/^data:image\/[a-z+]+;base64,/, '');

  const outW = snapDim(width);
  const outH = snapDim(height);

  const body = JSON.stringify({
    taskType: 'IMAGE_VARIATION',
    imageVariationParams: {
      images:             [base64],
      text:               prompt ? `${prompt} Microsoft Paint Style, digital pixel art, solid colors` : 'Microsoft Paint Drawing, clean lines, Solid Background',
      negativeText: 'pencils, pens, desk, paper texture, hand, shadow, photorealistic, real world, table, office supplies',
      similarityStrength: 0.7,
    },
    imageGenerationConfig: {
      numberOfImages: 1,
      width:          outW,
      height:         outH,
      cfgScale:       8.0,
      quality:        'standard',
    },
  });

  return new Promise((resolve) => {
    const options = {
      hostname: `bedrock-runtime.${region}.amazonaws.com`,
      path:     '/model/amazon.nova-canvas-v1:0/invoke',
      method:   'POST',
      headers: {
        Authorization:    `Bearer ${token}`,
        'Content-Type':   'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    };

    const outgoing = https.request(options, (r) => {
      const chunks = [];
      r.on('data', (c) => chunks.push(c));
      r.on('end', async () => {
        const raw = Buffer.concat(chunks).toString();

        if (r.statusCode !== 200) {
          res.status(r.statusCode).json({ error: raw });
          return resolve();
        }

        try {
          const json      = JSON.parse(raw);
          const imgBase64 = json.images?.[0];
          if (!imgBase64) throw new Error('Bedrock returned no images');

          // Increment counters only on success
          await Promise.all([
            kvIncr(GLOBAL_KEY),
            kvIncr(ipKey),
          ]);

          res.status(200).json({ imageDataURL: `data:image/png;base64,${imgBase64}` });
        } catch (e) {
          res.status(500).json({ error: e.message });
        }
        resolve();
      });
    });

    outgoing.on('error', (e) => {
      res.status(500).json({ error: e.message });
      resolve();
    });

    outgoing.write(body);
    outgoing.end();
  });
};
