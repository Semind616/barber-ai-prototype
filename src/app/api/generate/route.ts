import { NextResponse } from "next/server";
import { BARBER_VISION_SYSTEM } from "@/lib/barberPrompts";
import { barberLayoutTemplateUrl } from "@/lib/barberLayoutTemplate";
import {
  createPolzaNanoBananaTask,
  waitPolzaMediaResultUrl,
} from "@/lib/polzaNanoBanana";
import { requestBarberPromptFromGpt } from "@/lib/openaiVision";
import {
  isLikelyUnreachableForExternalFetch,
  resolvePublicAppUrl,
} from "@/lib/publicAppUrl";
import { putTempImage } from "@/lib/tempImageStore";

export const runtime = "nodejs";

/** Один ключ Polza для chat/completions и Media API (Nano Banana). */
function resolvePolzaApiKey(): string | undefined {
  return (
    process.env.POLZA_API_KEY?.trim() || process.env.OPENAI_API_KEY?.trim()
  );
}

/** Вернуть в JSON поле `nanoBananaPrompt` (текст от GPT → prompt для Nano Banana). */
function barberDebugPromptsEnabled(): boolean {
  const v = process.env.BARBER_DEBUG_PROMPTS?.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

/** Polza/OpenAI-compatible ошибки квоты — показываем клиенту без префикса Vision LLM. */
function friendlyGenerateError(message: string): string {
  const lower = message.toLowerCase();
  if (
    lower.includes("дневной лимит") ||
    lower.includes("лимит по сумме") ||
    lower.includes("daily limit") ||
    lower.includes("insufficient_quota")
  ) {
    return "На стороне провайдера AI исчерпан дневной лимит расходов или баланс. Пополните счёт в Polza (или подождите сброса лимита). Это не связано с тем, с телефона или с компьютера загружаете фото.";
  }
  return message.replace(/^Vision LLM:\s*/i, "");
}

export async function POST(request: Request) {
  try {
    const apiKey = resolvePolzaApiKey();

    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "Задайте POLZA_API_KEY (или OPENAI_API_KEY) — один ключ Polza для GPT vision и Nano Banana.",
        },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const photo = formData.get("photo");
    if (!(photo instanceof File) || photo.size === 0) {
      return NextResponse.json(
        { error: "Загрузите изображение (поле photo)." },
        { status: 400 }
      );
    }

    const publicBase = resolvePublicAppUrl(request);
    if (isLikelyUnreachableForExternalFetch(publicBase)) {
      return NextResponse.json(
        {
          error:
            "Нужен публичный URL приложения, чтобы Polza скачала исходные фото. Укажите APP_BASE_URL (например https://ваш-домен.vercel.app) или ngrok при локальной разработке.",
        },
        { status: 400 }
      );
    }

    const arrayBuffer = await photo.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64 = buffer.toString("base64");
    const token = putTempImage(buffer, photo.type);
    const sourceImageUrl = `${publicBase}/api/temp-image/${token}`;
    const templateImageUrl = barberLayoutTemplateUrl(publicBase);

    const imagePrompt = await requestBarberPromptFromGpt({
      apiKey,
      imageBase64: base64,
      mimeType: photo.type,
      systemPrompt: BARBER_VISION_SYSTEM,
    });

    if (barberDebugPromptsEnabled()) {
      console.log("[/api/generate] nanoBananaPrompt (от GPT):", imagePrompt);
    }

    const submit = await createPolzaNanoBananaTask({
      apiKey,
      prompt: imagePrompt,
      imageUrls: [sourceImageUrl, templateImageUrl],
      aspectRatio: "9:16",
    });

    const resultImageUrl =
      submit.kind === "sync"
        ? submit.url
        : await waitPolzaMediaResultUrl({
            apiKey,
            mediaId: submit.mediaId,
          });

    return NextResponse.json({
      success: true,
      image: resultImageUrl,
      ...(barberDebugPromptsEnabled() && {
        nanoBananaPrompt: imagePrompt,
      }),
    });
  } catch (error: unknown) {
    const raw =
      error instanceof Error ? error.message : "Ошибка сервера при обработке";
    console.error("API /api/generate:", error);

    return NextResponse.json(
      { error: friendlyGenerateError(raw) },
      { status: 500 }
    );
  }
}
