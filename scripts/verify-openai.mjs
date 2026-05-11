/**
 * Проверка OPENAI_API_KEY: GET /v1/models (без расхода на completion).
 * Запуск из корня проекта:
 *   npm run verify:openai
 *   node ./scripts/verify-openai.mjs
 */

import { loadEnvLocal } from "./load-env-local.mjs";

loadEnvLocal();

const key = process.env.OPENAI_API_KEY?.trim();

if (!key) {
  console.error(
    "OPENAI_API_KEY пустой. Проверьте .env.local: имя ровно OPENAI_API_KEY=sk-..."
  );
  process.exit(1);
}

const base =
  process.env.OPENAI_API_BASE_URL?.trim().replace(/\/$/, "") ||
  "https://api.openai.com/v1";

const res = await fetch(`${base}/models`, {
  headers: { Authorization: `Bearer ${key}` },
});

const body = await res.text();

if (!res.ok) {
  console.error("Ответ API (models):", base, res.status, body.slice(0, 500));
  process.exit(1);
}

let count = 0;
try {
  const json = JSON.parse(body);
  count = Array.isArray(json.data) ? json.data.length : 0;
} catch {
  // ignore
}

console.log(
  "Ключ принят.",
  base,
  "HTTP",
  res.status + ",",
  "моделей в ответе:",
  count
);
process.exit(0);
