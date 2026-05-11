"use client";

import { useState } from "react";

export default function Home() {
  const [photo, setPhoto] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [resultUrl, setResultUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [consent, setConsent] = useState(true);
  const [error, setError] = useState("");
  /** Заполняется только если на сервере BARBER_DEBUG_PROMPTS=1 */
  const [debugNanoBananaPrompt, setDebugNanoBananaPrompt] = useState("");

  function handlePhotoChange(file: File | null) {
    setError("");
    setResultUrl("");
    setDebugNanoBananaPrompt("");
    setPhoto(file);

    if (!file) {
      setPreviewUrl("");
      return;
    }

    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  }

  async function handleGenerate() {
    if (!photo) {
      setError("Сначала загрузите фото.");
      return;
    }
  
    if (!consent) {
      setError("Нужно согласие на обработку фотографии.");
      return;
    }
  
    setError("");
    setLoading(true);
    setResultUrl("");
    setDebugNanoBananaPrompt("");
  
    try {
      const formData = new FormData();
      formData.append("photo", photo);
  
      const response = await fetch("/api/generate", {
        method: "POST",
        body: formData,
      });
  
      const data = await response.json();
  
      if (!response.ok) {
        throw new Error(data.error || "Ошибка генерации");
      }
  
      setResultUrl(data.image);
      if (typeof data.nanoBananaPrompt === "string" && data.nanoBananaPrompt) {
        setDebugNanoBananaPrompt(data.nanoBananaPrompt);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Что-то пошло не так");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-neutral-950 px-4 py-8 text-white">
      <div className="mx-auto flex min-h-[calc(100vh-64px)] max-w-4xl items-center justify-center">
        <div className="w-full rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl md:p-8">
          <div className="mb-8 text-center">
            <p className="mb-3 text-sm font-medium uppercase tracking-[0.35em] text-neutral-500">
              AI Barber Preview
            </p>

            <h1 className="text-3xl font-semibold tracking-tight md:text-5xl">
              Подбери стрижку по фото
            </h1>

            <p className="mx-auto mt-4 max-w-2xl text-base text-neutral-300 md:text-lg">
              Загрузи фотографию, и система создаст итоговый образ в стиле
              барбершопа. Промпты и внутренняя логика скрыты от клиента.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <section className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-medium">Фото клиента</h2>
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-neutral-300">
                  Шаг 1
                </span>
              </div>

              {previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- Object URLs from file input are not optimized by next/image.
                <img
                  src={previewUrl}
                  alt="Загруженное фото"
                  className="mb-4 aspect-square w-full rounded-2xl object-cover"
                />
              ) : (
                <div className="mb-4 flex aspect-square w-full items-center justify-center rounded-2xl border border-dashed border-white/20 bg-white/[0.03] p-6 text-center text-sm text-neutral-500">
                  Здесь появится загруженное фото
                </div>
              )}

              <label className="block">
                <span className="mb-2 block text-sm text-neutral-300">
                  Загрузить фотографию
                </span>

                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) =>
                    handlePhotoChange(event.target.files?.[0] || null)
                  }
                  className="block w-full cursor-pointer rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-neutral-300 file:mr-4 file:rounded-lg file:border-0 file:bg-white file:px-4 file:py-2 file:text-sm file:font-medium file:text-black"
                />
              </label>
            </section>

            <section className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-medium">Итоговое изображение</h2>
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-neutral-300">
                  Шаг 2
                </span>
              </div>

              {resultUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- The generated image URL is returned dynamically by the API.
                <img
                  src={resultUrl}
                  alt="Итоговая фотография"
                  className="mb-4 aspect-square w-full rounded-2xl object-cover"
                />
              ) : (
                <div className="mb-4 flex aspect-square w-full items-center justify-center rounded-2xl border border-dashed border-white/20 bg-white/[0.03] p-6 text-center text-sm text-neutral-500">
                  Здесь появится готовый результат
                </div>
              )}

              {resultUrl ? (
                <a
                  href={resultUrl}
                  download="barber-result.png"
                  className="block rounded-xl bg-white px-4 py-3 text-center text-sm font-medium text-black transition hover:bg-neutral-200"
                >
                  Скачать результат
                </a>
              ) : (
                <div className="rounded-xl bg-white/5 px-4 py-3 text-center text-sm text-neutral-500">
                  Результат пока не создан
                </div>
              )}
            </section>
          </div>

          <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-4">
            <label className="mb-4 flex items-start gap-3 text-sm text-neutral-300">
              <input
                type="checkbox"
                checked={consent}
                onChange={(event) => setConsent(event.target.checked)}
                className="mt-1"
              />

              <span>
                Я согласен на обработку фотографии для создания изображения.
              </span>
            </label>

            <button
              onClick={handleGenerate}
              disabled={loading || !photo}
              className="w-full rounded-2xl bg-white px-5 py-4 text-base font-semibold text-black transition hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Создаем результат..." : "Получить итоговую фотографию"}
            </button>

            {loading && (
              <p className="mt-4 text-center text-sm text-neutral-300">
                Анализ фото через GPT, затем генерация изображения — это может
                занять до нескольких минут...
              </p>
            )}

            {error && (
              <p className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300">
                {error}
              </p>
            )}

            {debugNanoBananaPrompt && (
              <details className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-left text-sm text-amber-100/90">
                <summary className="cursor-pointer font-medium text-amber-200">
                  Отладка: промпт для Nano Banana (ответ GPT)
                </summary>
                <pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap break-words font-mono text-xs text-neutral-200">
                  {debugNanoBananaPrompt}
                </pre>
              </details>
            )}

            {resultUrl && (
              <a
                href="https://n1303186.yclients.com/"
                target="_blank"
                rel="noreferrer"
                className="mt-4 block rounded-2xl border border-white/10 px-5 py-4 text-center font-medium text-white transition hover:bg-white/10"
              >
                Записаться в барбершоп
              </a>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}