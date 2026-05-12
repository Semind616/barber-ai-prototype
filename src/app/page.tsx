"use client";

import NextImage from "next/image";
import { useEffect, useRef, useState } from "react";

const MAX_UPLOAD_IMAGE_SIDE = 1600;
const MIN_UPLOAD_IMAGE_SIDE = 640;
const TARGET_UPLOAD_IMAGE_BYTES = 400 * 1024;
const JPEG_UPLOAD_QUALITIES = [0.82, 0.74, 0.66, 0.58, 0.5, 0.44];
const LOADING_MESSAGES = [
  "Приглашаем стилиста к зеркалу",
  "Стилист изучает форму лица",
  "Передаем задачу барберу",
  "Барбер оценивает линию роста волос",
  "Стилист подбирает настроение образа",
  "Барбер примеряет подходящую длину",
  "Смотрим, как образ будет выглядеть в фас",
  "Проверяем профиль",
  "Стилист оставляет только лучшие варианты",
  "Барбер доводит контуры",
  "Собираем финальный образ",
  "Команда проверяет детали",
  "Добавляем уверенности в кадр",
  "Делаем последний штрих",
  "Образ почти готов",
];

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const url = URL.createObjectURL(file);

    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Не удалось подготовить изображение."));
    };
    image.src = url;
  });
}

function formatPhotoSize(bytes: number): string {
  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} КБ`;
  }
  return `${(bytes / 1024 / 1024).toFixed(1)} МБ`;
}

async function preparePhotoForUpload(file: File): Promise<File> {
  const image = await loadImageFromFile(file);

  if (file.size <= TARGET_UPLOAD_IMAGE_BYTES && file.type === "image/jpeg") {
    return file;
  }

  const originalMaxSide = Math.max(image.naturalWidth, image.naturalHeight);
  let maxSide = Math.min(originalMaxSide, MAX_UPLOAD_IMAGE_SIDE);
  let bestBlob: Blob | null = null;

  while (maxSide >= MIN_UPLOAD_IMAGE_SIDE) {
    const scale = Math.min(1, maxSide / originalMaxSide);
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));

    const context = canvas.getContext("2d");
    if (!context) {
      return file;
    }

    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    for (const quality of JPEG_UPLOAD_QUALITIES) {
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, "image/jpeg", quality);
      });

      if (!blob) {
        continue;
      }

      if (!bestBlob || blob.size < bestBlob.size) {
        bestBlob = blob;
      }

      if (blob.size <= TARGET_UPLOAD_IMAGE_BYTES) {
        bestBlob = blob;
        maxSide = 0;
        break;
      }
    }

    maxSide = Math.floor(maxSide * 0.8);
  }

  if (!bestBlob) {
    return file;
  }

  const name = file.name.replace(/\.[^.]+$/, "") || "client-photo";
  return new File([bestBlob], `${name}.jpg`, {
    type: "image/jpeg",
    lastModified: Date.now(),
  });
}

export default function Home() {
  const photoInputRef = useRef<HTMLInputElement>(null);
  const photoSelectionIdRef = useRef(0);
  const [photo, setPhoto] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [resultUrl, setResultUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);
  const [consent, setConsent] = useState(true);
  const [error, setError] = useState("");
  const [photoInfo, setPhotoInfo] = useState("");
  /** Заполняется только если на сервере BARBER_DEBUG_PROMPTS=1 */
  const [debugNanoBananaPrompt, setDebugNanoBananaPrompt] = useState("");

  useEffect(() => {
    if (!loading) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setLoadingMessageIndex((current) => (current + 1) % LOADING_MESSAGES.length);
    }, 2400);

    return () => window.clearInterval(intervalId);
  }, [loading]);

  async function handlePhotoChange(file: File | null) {
    const selectionId = photoSelectionIdRef.current + 1;
    photoSelectionIdRef.current = selectionId;

    setError("");
    setResultUrl("");
    setDebugNanoBananaPrompt("");
    setPhoto(null);
    setPhotoInfo("");

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    if (!file) {
      setPreviewUrl("");
      return;
    }

    const url = URL.createObjectURL(file);
    setPreviewUrl(url);

    try {
      const prepared = await preparePhotoForUpload(file);
      if (photoSelectionIdRef.current !== selectionId) {
        return;
      }
      setPhoto(prepared);
      if (prepared.size < file.size) {
        setPhotoInfo(
          `Фото сжато для отправки: ${formatPhotoSize(
            file.size
          )} → ${formatPhotoSize(prepared.size)}`
        );
      }
    } catch (err: unknown) {
      if (photoSelectionIdRef.current !== selectionId) {
        return;
      }
      setPhoto(file);
      setPhotoInfo("");
      console.warn("Не удалось сжать фото перед отправкой:", err);
    }
  }

  function handleClearPhoto() {
    photoSelectionIdRef.current += 1;

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    if (photoInputRef.current) {
      photoInputRef.current.value = "";
    }

    setPhoto(null);
    setPreviewUrl("");
    setResultUrl("");
    setDebugNanoBananaPrompt("");
    setPhotoInfo("");
    setError("");
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
    setLoadingMessageIndex(0);
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
            <div className="mb-6 flex flex-col items-center gap-4">
              <div className="flex h-24 w-44 items-center justify-center rounded-full border border-white/10 bg-black/70 px-4 shadow-[0_0_40px_rgba(255,255,255,0.08)]">
                <NextImage
                  src="/brand/logo_eye.png"
                  alt="BarberVision"
                  width={414}
                  height={236}
                  preload
                  className="h-auto w-full"
                />
              </div>

              <NextImage
                src="/brand/logo_text.png"
                alt="BarberVision"
                width={603}
                height={140}
                preload
                className="h-auto w-64 max-w-full md:w-80"
              />
            </div>

            <h1 className="text-3xl font-semibold tracking-tight md:text-5xl">
              Подбери стрижку по фото
            </h1>

            <p className="mx-auto mt-4 max-w-2xl text-base text-neutral-300 md:text-lg">
              Загрузи фотографию, и мы подберем тебе самый подходящий образ.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <section className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-medium">Ваше фото</h2>
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-neutral-300">
                  Шаг 1
                </span>
              </div>

              <div className="relative">
                <label className="group block cursor-pointer">
                  <input
                    ref={photoInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(event) =>
                      handlePhotoChange(event.target.files?.[0] || null)
                    }
                    className="sr-only"
                  />

                  {previewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- Object URLs from file input are not optimized by next/image.
                    <img
                      src={previewUrl}
                      alt="Загруженное фото"
                      className="aspect-square w-full rounded-2xl object-cover transition hover:opacity-90"
                    />
                  ) : (
                    <div className="flex aspect-square w-full items-center justify-center rounded-2xl bg-white/[0.03] p-6 text-center text-sm font-medium text-white transition hover:bg-white/[0.06]">
                      <span className="rounded-2xl border border-dashed border-white/30 px-5 py-4 transition group-hover:border-white/50">
                        Нажми, чтобы загрузить свое фото
                      </span>
                    </div>
                  )}
                </label>

                {previewUrl && (
                  <button
                    type="button"
                    onClick={handleClearPhoto}
                    aria-label="Удалить выбранное фото"
                    className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-black/70 text-xl leading-none text-white shadow-lg transition hover:bg-white hover:text-black"
                  >
                    ×
                  </button>
                )}
              </div>

              {photoInfo && (
                <p className="mt-3 text-xs text-neutral-400">{photoInfo}</p>
              )}
            </section>

            <section className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-medium">Подходящий образ</h2>
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
                <div className="flex aspect-square w-full items-center justify-center rounded-2xl border border-dashed border-white/20 bg-white/[0.03] p-6 text-center text-sm text-neutral-500">
                  Здесь появится готовый результат
                </div>
              )}

              {resultUrl && (
                <a
                  href={resultUrl}
                  download="barber-result.png"
                  className="block rounded-xl bg-white px-4 py-3 text-center text-sm font-medium text-black transition hover:bg-neutral-200"
                >
                  Сохранить образ
                </a>
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
              <div className="mt-4 flex flex-col items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-5 text-center">
                <div className="flex items-center gap-2" aria-hidden="true">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
                  <span className="h-2 w-2 animate-pulse rounded-full bg-white [animation-delay:150ms]" />
                  <span className="h-2 w-2 animate-pulse rounded-full bg-white [animation-delay:300ms]" />
                </div>

                <p className="text-sm font-medium text-white">
                  {LOADING_MESSAGES[loadingMessageIndex]}
                </p>

                <p className="text-xs text-neutral-400">
                  Обычно это занимает пару минут. Не закрывайте страницу.
                </p>
              </div>
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