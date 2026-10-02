// ============================================================
// useI18n — React hook chính thức
// ============================================================
// Usage:
//   const { t, lang, setLang, languages, ready } = useI18n();
//   <h1>{t("Thực đơn")}</h1>
//   <p>{t("Xin chào {name}", { name: user.name })}</p>
// ============================================================

import { useState, useEffect, useCallback } from "react";
import {
  t as translate,
  getLang,
  setLang as setLangGlobal,
  getAvailableLangs,
  onLangChange,
  isReady,
} from "../lib/i18n";

export function useI18n() {
  const [lang, setLangState] = useState(getLang);
  const [ready, setReady] = useState(isReady);

  useEffect(() => {
    const unsub = onLangChange((newLang) => {
      setLangState(newLang);
      setReady(true);
    });
    return unsub;
  }, []);

  const t = useCallback(
    (source, vars) => translate(source, vars),
    [lang] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const setLang = useCallback((newLang) => {
    setLangGlobal(newLang);
  }, []);

  return {
    t,
    lang,
    setLang,
    languages: getAvailableLangs(),
    ready,
  };
}