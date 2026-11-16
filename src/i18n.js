/* Interface language: English, or Japanese for menus, buttons and the study buddy (Jose, 2026-11-16).
   Questions, answers, explanations, sources, area names and section codes stay English, as on the exam.
   LANG is chosen once at start: the More switch (localStorage "eaTaxTown.lang"), else the phone's language.
   t("English text", { n: 3 }) returns the Japanese for that exact English text when LANG is "ja" and
   src/i18n-ja.js has it, else the English; {name} placeholders are filled from the object. Keys are the
   English text itself, so English never depends on this file. tn(n, one, many, vars) picks the English
   singular or plural first (Japanese has one form). Static markup in shell.html marks its text with
   data-t (text), data-th (text with a link in it) and data-ta (aria-label); all three are translated as soon as this file runs.
   Runs first, before mascot.js, intro.js and app.js, so every one of them can call t(). */
const LANG = (() => {
  let pick = null;
  try { pick = localStorage.getItem("eaTaxTown.lang"); } catch (e) {}
  if (pick === "en" || pick === "ja") return pick;
  const langs = (navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || ""]);
  return /^ja\b/i.test(langs[0] || "") ? "ja" : "en";
})();
/* dates: Japanese format in Japanese; undefined keeps the phone's own format in English, as before */
const LOC = LANG === "ja" ? "ja-JP" : undefined;
const JA = window.__JA || {};
function t(s, vars) {
  let out = LANG === "ja" && Object.hasOwn(JA, s) ? JA[s] : s;
  if (vars) out = out.replace(/\{(\w+)\}/g, (m, k) => (Object.hasOwn(vars, k) ? String(vars[k]) : m));
  return out;
}
function tn(n, one, many, vars) { return t(n === 1 ? one : many, Object.assign({ n }, vars)); }
/* the More switch: keep the choice and load the page again, straight back to More with no launch screen */
function setLang(l) {
  try { localStorage.setItem("eaTaxTown.lang", l); sessionStorage.setItem("eaTaxTown.afterLang", "1"); } catch (e) {}
  location.replace(location.pathname + "?intro=0");
}
function afterLang() {
  try { if (sessionStorage.getItem("eaTaxTown.afterLang")) { sessionStorage.removeItem("eaTaxTown.afterLang"); return true; } } catch (e) {}
  return false;
}
document.documentElement.lang = LANG;
if (LANG !== "en") {
  document.querySelectorAll("[data-t]").forEach(e => { e.textContent = t(e.dataset.t || e.textContent.trim()); });
  document.querySelectorAll("[data-th]").forEach(e => { e.innerHTML = t(e.innerHTML.trim()); });
  document.querySelectorAll("[data-ta]").forEach(e => { e.setAttribute("aria-label", t(e.getAttribute("aria-label"))); });
  document.title = t(document.title);
}
