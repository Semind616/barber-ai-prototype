/**
 * Nano Banana через Polza.ai Media API.
 * @see https://polza.ai/docs/gaidy/nanobanano-2.md
 */

export function polzaApiBase(): string {
  return (
    process.env.POLZA_API_BASE_URL?.trim().replace(/\/$/, "") ||
    "https://polza.ai/api/v1"
  );
}

function defaultNanoBananaModel(): string {
  return (
    process.env.POLZA_NANO_BANANA_MODEL?.trim() ||
    "google/gemini-3.1-flash-image-preview"
  );
}

function buildNanoBananaInput(params: {
  prompt: string;
  images: PolzaMediaImage[];
  aspectRatio: string;
  model: string;
}) {
  const input: Record<string, unknown> = {
    prompt: params.prompt,
    aspect_ratio: params.aspectRatio,
    images: params.images,
    output_format: "png",
  };

  if (params.model.includes("gemini-3.1")) {
    input.image_resolution =
      process.env.POLZA_IMAGE_RESOLUTION?.trim() || "1K";
  }

  return input;
}

/**
 * Polza может вернуть ссылку на файл в разных формах (доки: data.url, гайд NB2: output.url,
 * провайдеры — nested images[], image_url и т.д.).
 */
function isHttpUrl(s: string): boolean {
  return /^https?:\/\//i.test(s);
}

function urlFromRecord(obj: unknown): string | undefined {
  if (!obj || typeof obj !== "object") return undefined;
  const r = obj as Record<string, unknown>;
  for (const key of [
    "url",
    "image_url",
    "imageUrl",
    "file_url",
    "href",
    "src",
  ]) {
    const v = r[key];
    if (typeof v === "string" && isHttpUrl(v)) return v;
  }
  return undefined;
}

function collectHttpsUrlsSkipInput(node: unknown, out: string[]): void {
  if (node === null || node === undefined) return;
  if (typeof node === "string") {
    if (isHttpUrl(node)) out.push(node);
    return;
  }
  if (Array.isArray(node)) {
    for (const x of node) collectHttpsUrlsSkipInput(x, out);
    return;
  }
  if (typeof node === "object") {
    for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
      if (k === "input") continue;
      collectHttpsUrlsSkipInput(v, out);
    }
  }
}

function pickBestMediaUrl(candidates: string[]): string | undefined {
  const uniq = [...new Set(candidates)];
  if (uniq.length === 0) return undefined;
  const onPolza = uniq.filter((u) => /polza\.ai|s3\.polza/i.test(u));
  if (onPolza.length >= 1) return onPolza[0];
  const imageLike = uniq.filter((u) =>
    /\.(png|jpe?g|webp|gif)(\?|$)/i.test(u.split("?")[0] ?? "")
  );
  if (imageLike.length === 1) return imageLike[0];
  if (uniq.length === 1) return uniq[0];
  return undefined;
}

function extractCompletedMediaUrl(payload: Record<string, unknown>): string | undefined {
  if (typeof payload.data === "string" && isHttpUrl(payload.data)) {
    return payload.data;
  }

  const tryBranch = (branch: unknown): string | undefined => {
    if (!branch) return undefined;
    if (Array.isArray(branch)) {
      for (const item of branch) {
        const u = urlFromRecord(item);
        if (u) return u;
      }
      return undefined;
    }
    const direct = urlFromRecord(branch);
    if (direct) return direct;
    if (typeof branch !== "object") return undefined;
    const rec = branch as Record<string, unknown>;
    for (const nest of ["images", "outputs", "files", "items", "artifacts"]) {
      const nested = rec[nest];
      if (Array.isArray(nested)) {
        for (const item of nested) {
          const u = urlFromRecord(item);
          if (u) return u;
        }
      } else {
        const u = urlFromRecord(nested);
        if (u) return u;
      }
    }
    return undefined;
  };

  const structured =
    tryBranch(payload.output) ||
    tryBranch(payload.data) ||
    tryBranch(payload.result);

  if (structured) return structured;

  const fallback: string[] = [];
  collectHttpsUrlsSkipInput(payload.output, fallback);
  collectHttpsUrlsSkipInput(payload.data, fallback);
  return pickBestMediaUrl(fallback);
}

function formatPolzaMissingUrlHint(payload: Record<string, unknown>): string {
  try {
    return JSON.stringify({
      status: payload.status,
      keys: Object.keys(payload),
      data: payload.data,
      output: payload.output,
    }).slice(0, 900);
  } catch {
    return "(не удалось сериализовать ответ)";
  }
}

type CreateResponse = {
  id?: string;
  status?: string;
  output?: { url?: string };
  data?: { url?: string };
  error?: { message?: string; code?: string };
};

type PolzaMediaImage = {
  type: "url" | "base64";
  data: string;
};

export type PolzaNanoBananaSubmit =
  | { kind: "sync"; url: string }
  | { kind: "async"; mediaId: string };

/**
 * Создаёт задачу редактирования (референсы + промпт).
 * Редко API может вернуть resultado сразу (sync).
 */
export async function createPolzaNanoBananaTask(params: {
  apiKey: string;
  prompt: string;
  images: PolzaMediaImage[];
  aspectRatio?: string;
}): Promise<PolzaNanoBananaSubmit> {
  const model = defaultNanoBananaModel();
  const base = polzaApiBase();
  const body = {
    model,
    async: true,
    input: buildNanoBananaInput({
      prompt: params.prompt,
      images: params.images,
      aspectRatio: params.aspectRatio ?? "9:16",
      model,
    }),
  };

  const res = await fetch(`${base}/media`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${params.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  let json: CreateResponse;
  try {
    json = JSON.parse(text) as CreateResponse;
  } catch {
    throw new Error(`Polza media: неверный JSON (${res.status}): ${text.slice(0, 200)}`);
  }

  if (!res.ok) {
    const msg =
      json.error?.message || (text ? text.slice(0, 300) : res.statusText);
    throw new Error(`Polza media: ${msg}`);
  }

  if (json.status === "completed") {
    const url = extractCompletedMediaUrl(json as Record<string, unknown>);
    if (url) return { kind: "sync", url };
  }

  const id = json.id;
  if (!id) {
    throw new Error("Polza media: в ответе нет id задачи");
  }
  return { kind: "async", mediaId: id };
}

type StatusResponse = {
  status?: string;
  output?: { url?: string };
  data?: { url?: string };
  error?: { message?: string; code?: string };
};

export async function waitPolzaMediaResultUrl(params: {
  apiKey: string;
  mediaId: string;
  pollMs?: number;
  maxWaitMs?: number;
}): Promise<string> {
  const { apiKey, mediaId, pollMs = 4000, maxWaitMs = 300_000 } = params;

  const base = polzaApiBase();
  const start = Date.now();
  let completedWithoutUrl = 0;

  while (Date.now() - start < maxWaitMs) {
    const res = await fetch(
      `${base}/media/${encodeURIComponent(mediaId)}`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${apiKey}` },
      }
    );

    const text = await res.text();
    let json: StatusResponse;
    try {
      json = JSON.parse(text) as StatusResponse;
    } catch {
      throw new Error(
        `Polza media status: неверный JSON (${res.status}): ${text.slice(0, 200)}`
      );
    }

    if (!res.ok) {
      const msg = json.error?.message || text.slice(0, 300);
      throw new Error(`Polza media status: ${msg}`);
    }

    if (json.status === "completed") {
      const raw = json as Record<string, unknown>;
      const url = extractCompletedMediaUrl(raw);
      if (url) {
        return url;
      }
      completedWithoutUrl++;
      // Иногда API отдаёт completed до заполнения data — ждём следующий опрос.
      if (completedWithoutUrl >= 12) {
        throw new Error(
          `Polza media: статус completed, но не удалось извлечь URL результата. Ответ: ${formatPolzaMissingUrlHint(raw)}`
        );
      }
      await new Promise((r) => setTimeout(r, pollMs));
      continue;
    }

    completedWithoutUrl = 0;

    if (json.status === "failed" || json.status === "cancelled") {
      const msg = json.error?.message || json.status;
      throw new Error(`Polza media: ${msg}`);
    }

    await new Promise((r) => setTimeout(r, pollMs));
  }

  throw new Error("Polza media: превышено время ожидания");
}
