const { getStore } = require('@netlify/blobs');

// Seed data used only the very first time the store is empty.
const SEED_ITEMS = [
  { id: 'hennessy-xo', name: 'Hennessy XO', category: 'Cognac', price: 285, twoWeeksAgoPrice: 279, history: [268, 272, 271, 276, 279, 285] },
  { id: 'remy-xo', name: 'Rémy Martin XO', category: 'Cognac', price: 245, twoWeeksAgoPrice: 251, history: [258, 254, 256, 250, 251, 245] },
  { id: 'martell-cordon-bleu', name: 'Martell Cordon Bleu', category: 'Cognac', price: 195, twoWeeksAgoPrice: 189, history: [180, 183, 185, 188, 189, 195] },
  { id: 'courvoisier-xo', name: 'Courvoisier XO', category: 'Cognac', price: 210, twoWeeksAgoPrice: 214, history: [220, 218, 216, 213, 214, 210] },
  { id: 'camus-xo', name: 'Camus XO', category: 'Cognac', price: 175, twoWeeksAgoPrice: 168, history: [160, 162, 165, 166, 168, 175] },
  { id: 'louis-xiii', name: 'Louis XIII', category: 'Cognac', price: 3850, twoWeeksAgoPrice: 3790, history: [3700, 3720, 3760, 3780, 3790, 3850] },
  { id: 'hennessy-paradis', name: 'Hennessy Paradis', category: 'Cognac', price: 780, twoWeeksAgoPrice: 805, history: [830, 820, 812, 808, 805, 780] },
  { id: 'remy-1738', name: 'Rémy Martin 1738', category: 'Cognac', price: 68, twoWeeksAgoPrice: 65, history: [61, 62, 63, 64, 65, 68] },
  { id: 'dusse-vsop', name: "D'USSE VSOP", category: 'Cognac', price: 45, twoWeeksAgoPrice: 46, history: [48, 47, 47, 46, 46, 45] },
  { id: 'pierre-ferrand-1840', name: 'Pierre Ferrand 1840', category: 'Brandy', price: 38, twoWeeksAgoPrice: 36, history: [34, 34, 35, 35, 36, 38] },
  { id: 'asbach-uralt', name: 'Asbach Uralt', category: 'Brandy', price: 28, twoWeeksAgoPrice: 29, history: [30, 30, 29, 29, 29, 28] },
  { id: 'torres-10', name: 'Torres 10', category: 'Brandy', price: 24, twoWeeksAgoPrice: 23, history: [21, 22, 22, 23, 23, 24] },
];

const STORE_NAME = 'brandy-index';
const STATE_KEY = 'state';
const HISTORY_LENGTH = 6;

function nowIso() {
  return new Date().toISOString();
}

function jsonResponse(statusCode, data) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
    body: JSON.stringify(data),
  };
}

async function loadState(store) {
  const existing = await store.get(STATE_KEY, { type: 'json' });
  if (existing && Array.isArray(existing.items)) return existing;

  const seeded = { updatedAt: nowIso(), items: SEED_ITEMS };
  await store.setJSON(STATE_KEY, seeded);
  return seeded;
}

function isAuthorized(event) {
  const adminToken = process.env.ADMIN_TOKEN;
  if (!adminToken) return false;
  const header = event.headers.authorization || event.headers.Authorization || '';
  const token = header.replace(/^Bearer\s+/i, '').trim();
  return token === adminToken;
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return jsonResponse(204, {});
  }

  const store = getStore(STORE_NAME);

  if (event.httpMethod === 'GET') {
    const state = await loadState(store);
    return jsonResponse(200, state);
  }

  if (event.httpMethod === 'POST') {
    if (!isAuthorized(event)) {
      return jsonResponse(401, { error: 'Unauthorized' });
    }

    let body;
    try {
      body = JSON.parse(event.body || '{}');
    } catch (err) {
      return jsonResponse(400, { error: 'Invalid JSON body' });
    }

    const state = await loadState(store);
    const byId = new Map(state.items.map((item) => [item.id, item]));

    // Bi-weekly price rotation: current price becomes "twoWeeksAgoPrice",
    // the new price is appended to history.
    if (body.updates && typeof body.updates === 'object') {
      for (const [id, rawPrice] of Object.entries(body.updates)) {
        const item = byId.get(id);
        const price = Number(rawPrice);
        if (!item || !Number.isFinite(price) || price <= 0) continue;
        item.twoWeeksAgoPrice = item.price;
        item.price = price;
        item.history = [...item.history.slice(-(HISTORY_LENGTH - 1)), price];
      }
    }

    if (Array.isArray(body.add)) {
      for (const entry of body.add) {
        if (!entry || !entry.id || byId.has(entry.id)) continue;
        const price = Number(entry.price);
        if (!Number.isFinite(price) || price <= 0) continue;
        const newItem = {
          id: String(entry.id),
          name: String(entry.name || entry.id),
          category: String(entry.category || 'Brandy'),
          price,
          twoWeeksAgoPrice: price,
          history: [price],
        };
        state.items.push(newItem);
        byId.set(newItem.id, newItem);
      }
    }

    if (Array.isArray(body.remove) && body.remove.length) {
      const removeSet = new Set(body.remove);
      state.items = state.items.filter((item) => !removeSet.has(item.id));
    }

    state.updatedAt = nowIso();
    await store.setJSON(STATE_KEY, state);
    return jsonResponse(200, state);
  }

  return jsonResponse(405, { error: 'Method not allowed' });
};
