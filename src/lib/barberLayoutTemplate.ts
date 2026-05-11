/** Публичный URL шаблона раскладки из `public/barber-layout-template.png`. */
export function barberLayoutTemplateUrl(publicBase: string): string {
  const base = publicBase.replace(/\/$/, "");
  return `${base}/barber-layout-template.png`;
}
