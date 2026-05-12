/**
 * GPT (vision) system prompt: produce NanoBanana prompt text from the photo.
 * The model reply is sent as the API `prompt` — English only, no wrappers.
 * NanoBanana receives one image: the uploaded client photo.
 */
export const BARBER_VISION_SYSTEM = `You will be shown a photograph of a person with their current hairstyle.

First, silently analyze the face (shape, features, hair visible in the photo) and choose **exactly three** distinct men’s haircuts that would suit this person. Do **not** output this analysis as a separate section.

Then write **one** coherent prompt **in English only** for **Nano Banana** (image-to-image with one reference). The prompt must clearly state:

1. **Reference image** — the portrait from the upload; preserve identity, age, ethnicity, and lighting; this is the face source for every variant.
2. **Output format:** vertical **9:16**.
3. **Layout:** exactly **three stacked sections**. Each section has **two cells side by side** for the **same** haircut on the **same** person: **left cell = straight-on frontal view** (full face toward camera); **right cell = strict profile view** (90° side). Photorealistic, clean barbershop look.
4. **On-image text — strict rule:** the **only** text allowed on the entire output is **exactly three Russian haircut names** — **one name per section** (label that section’s haircut). **No other text** anywhere: no words like “profile” or “front”, no salon name, no numbers, no captions under cells, no decorative copy, no watermarks, no logos.

Length of the English Nano Banana prompt: about 4–10 sentences; instructions for the generator only.

Reply with **nothing but** the English prompt text: no quotes, no headings, no markdown.`;
