import english from "./en.mjs";
export const locale =
  typeof location !== "undefined" && /^\/en(?:\/|$)/.test(location.pathname)
    ? "en"
    : "id";
export function translate(text, language = locale, ...values) {
  const result = language === "en" ? (english[text] ?? text) : text;
  return result.replace(/\{(\d+)\}/g, (match, index) =>
    values[Number(index)] === undefined ? match : String(values[Number(index)]),
  );
}
export const t = (text, ...values) => translate(text, locale, ...values);
export const languagePath = (
  language,
  hash = typeof location === "undefined" ? "" : location.hash,
) => `/${language}/${hash}`;
