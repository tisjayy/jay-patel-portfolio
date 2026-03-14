'use strict';

const https = require('https');

/**
 * POST /api/imagine
 * Body: { imageDataURL: string, prompt?: string, width?: number, height?: number }
 * Response: { imageDataURL: string }   (data:image/png;base64,...)
 *
 * Calls Amazon Nova Canvas via Bedrock Runtime (IMAGE_VARIATION task).
 * Auth: Bearer token from AWS_BEARER_TOKEN_BEDROCK env var (same pattern as /api/chat).
 */

/** Snap a pixel dimension to the nearest multiple of 64, clamped to [320, 4096]. */
function snapDim(n) {
  const v = Math.round((Number(n) || 512) / 64) * 64;
  return Math.max(320, Math.min(4096, v));
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')   return res.status(405).json({ error: 'Method not allowed' });

  const { imageDataURL, prompt = '', width, height } = req.body ?? {};
  if (!imageDataURL) return res.status(400).json({ error: 'imageDataURL is required' });

  const token  = process.env.AWS_BEARER_TOKEN_BEDROCK;
  const region = process.env.AWS_REGION || 'us-east-1';
  if (!token) return res.status(500).json({ error: 'AWS_BEARER_TOKEN_BEDROCK is not configured' });

  // Strip "data:image/png;base64," prefix → raw base64 string
  const base64 = imageDataURL.replace(/^data:image\/[a-z+]+;base64,/, '');

  const outW = snapDim(width);
  const outH = snapDim(height);

  const body = JSON.stringify({
    taskType: 'IMAGE_VARIATION',
    imageVariationParams: {
      images:             [base64],
      text:               prompt || 'high quality, detailed, clean artwork',
      negativeText:       'low quality, blurry, distorted, watermark, ugly, deformed',
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
      r.on('end', () => {
        const raw = Buffer.concat(chunks).toString();

        if (r.statusCode !== 200) {
          res.status(r.statusCode).json({ error: raw });
          return resolve();
        }

        try {
          const json      = JSON.parse(raw);
          const imgBase64 = json.images?.[0];
          if (!imgBase64) throw new Error('Bedrock returned no images');
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
window._jspaintCanvas   = $canvas[0];
window._jspaintUndoable = (typeof undoable === 'function') ? undoable : null;
};
