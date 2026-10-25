"use client";

import { useEffect, useSyncExternalStore } from "react";

const key = "dad-language";
function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener("dad-language-change", callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("dad-language-change", callback);
  };
}
let selectedLanguage: "en" | "hi" | undefined;
function getLanguage(): "en" | "hi" {
  if (selectedLanguage) return selectedLanguage;
  try { return localStorage.getItem(key) === "hi" ? "hi" : "en"; }
  catch { return "en"; }
}
function useLanguage() {
  return useSyncExternalStore(subscribe, getLanguage, () => "en" as const);
}

export function TranslatedText({ en, hi }: { en: string; hi: string }) {
  const language = useLanguage();
  return <>{language === "hi" ? hi : en}</>;
}

export function LanguageSwitcher() {
  const language = useLanguage();
  useEffect(() => {
    document.documentElement.lang = language;
    return () => { document.documentElement.lang = "en"; };
  }, [language]);

  function select(next: "en" | "hi") {
    try {
      localStorage.setItem(key, next);
      selectedLanguage = undefined;
    } catch {
      selectedLanguage = next;
    }
    window.dispatchEvent(new Event("dad-language-change"));
  }

  return (
    <div className="header-language-switch" role="group" aria-label="Language / भाषा">
      <button type="button" lang="en" aria-pressed={language === "en"} onClick={() => select("en")}>English</button>
      <button type="button" lang="hi" aria-pressed={language === "hi"} onClick={() => select("hi")}>हिंदी</button>
    </div>
  );
}
