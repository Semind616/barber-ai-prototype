/**
 * Проверка ключа Polza: GET /v1/balance
 * @see https://polza.ai/docs/api-reference/other/balance.md
 *
 * Ключ: POLZA_API_KEY или OPENAI_API_KEY (тот же ключ Polza для приложения).
 */

import { loadEnvLocal } from "./load-env-local.mjs";

loadEnvLocal();

function resolvePolzaKey() {
  return (
    process.env.POLZA_API_KEY?.trim() || process.env.OPENAI_API_KEY?.trim()
  );
}

const baseUrl =
  process.env.POLZA_API_BASE_URL?.trim().replace(/\/$/, "") ||
  "https://polza.ai/api/v1";

const key = resolvePolzaKey();

if (!key) {
  console.error(
    "Задайте POLZA_API_KEY или OPENAI_API_KEY (ключ Polza)."
  );
  process.exit(1);
}

const res = await fetch(`${baseUrl}/balance`, {
  headers: { Authorization: `Bearer ${key}` },
});

const body = await res.text();
let json;
try {
  json = JSON.parse(body);
} catch {
  console.error("Не JSON:", res.status, body.slice(0, 400));
  process.exit(1);
}

if (!res.ok) {
  console.error("Polza balance:", res.status, json?.error || body.slice(0, 400));
  process.exit(1);
}

console.log("Polza OK. Баланс (руб.):", json.amount ?? json);
process.exit(0);
