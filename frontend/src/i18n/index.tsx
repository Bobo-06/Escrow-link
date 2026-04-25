import React, { createContext, useContext, useEffect, useState, useCallback } from "react";

/**
 * Biz-Salama bilingual i18n.
 * Default language: Swahili (Tanzanian audience).
 * Toggle in navbar persists choice to localStorage.
 *
 * Add a new string by extending TRANSLATIONS — both `sw` and `en` keys
 * are required so we never silently fall back to a key string in the UI.
 *
 * Usage:
 *   const { t, lang, setLang } = useT();
 *   <h1>{t("hero.title")}</h1>
 */

export type Lang = "sw" | "en";

type Dict = Record<string, { sw: string; en: string }>;

export const TRANSLATIONS: Dict = {
  // ─── Navbar
  "nav.marketplace": { sw: "Soko", en: "Marketplace" },
  "nav.three_party": { sw: "Escrow ya Watatu", en: "3-Party Escrow" },
  "nav.how": { sw: "Inavyofanya kazi", en: "How It Works" },
  "nav.trust": { sw: "Usalama", en: "Trust & Safety" },
  "nav.dashboard": { sw: "Dashibodi", en: "Dashboard" },
  "nav.logout": { sw: "Toka", en: "Logout" },
  "nav.login": { sw: "Ingia", en: "Login" },
  "nav.signup": { sw: "Jisajili", en: "Sign Up" },
  "nav.cta_3p": { sw: "+ Watatu", en: "+ 3-Party" },
  "nav.cta_direct": { sw: "+ Moja kwa moja", en: "+ Direct" },
  "nav.cta_3p_full": { sw: "+ Muamala wa Watatu", en: "+ New 3-Party Transaction" },
  "nav.cta_direct_full": { sw: "+ Escrow ya Moja kwa Moja", en: "+ Direct Escrow (no middleman)" },
  "nav.about_3p": { sw: "Kuhusu Escrow ya Watatu", en: "About 3-Party Escrow" },

  // ─── Hero
  "hero.eyebrow": { sw: "Soko Salama la Tanzania", en: "Tanzania's Trusted Escrow Marketplace" },
  "hero.title_a": { sw: "Nunua na uuze", en: "Buy & sell" },
  "hero.title_b": { sw: "salama kabisa", en: "with confidence" },
  "hero.subtitle": {
    sw: "Pesa yako iko salama kwenye escrow hadi utakapopokea bidhaa. M-Pesa, Tigo Pesa, Airtel Money zinakubaliwa.",
    en: "Your money is held safely in escrow until you confirm delivery. M-Pesa, Tigo Pesa, Airtel Money supported.",
  },
  "hero.cta_browse": { sw: "Tazama Soko", en: "Browse Marketplace" },
  "hero.cta_sell": { sw: "Anza Kuuza", en: "Start Selling" },

  // ─── Install button
  "install.btn": { sw: "Sakinisha App", en: "Install App" },
  "install.installed": { sw: "App imesakinishwa", en: "App installed" },

  // ─── Common
  "common.continue": { sw: "Endelea", en: "Continue" },
  "common.cancel": { sw: "Ghairi", en: "Cancel" },
  "common.send": { sw: "Tuma", en: "Send" },
  "common.save": { sw: "Hifadhi", en: "Save" },
  "common.loading": { sw: "Inapakia…", en: "Loading…" },
  "common.required": { sw: "Lazima", en: "Required" },
  "common.optional": { sw: "Si lazima", en: "optional" },

  // ─── Trust / stats warning
  "trust.stats_warning": {
    sw: "⚠️ Nambari hizi ni mfano tu. Unganisha takwimu halisi za database kabla ya kuchapisha.",
    en: "⚠️ These numbers are placeholders. Connect real database stats before going live.",
  },
};

type Ctx = { lang: Lang; setLang: (l: Lang) => void; t: (key: string) => string };
const LangContext = createContext<Ctx | null>(null);

const STORAGE_KEY = "biz_lang";

const isLang = (v: any): v is Lang => v === "sw" || v === "en";

export const LangProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Default Swahili — primary audience is Tanzanian. Fall back to browser hint
  // if it's clearly English-locale, but localStorage choice always wins.
  const [lang, setLangState] = useState<Lang>(() => {
    if (typeof window === "undefined") return "sw";
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (isLang(stored)) return stored;
    const browser = (navigator?.language || "").toLowerCase();
    if (browser.startsWith("en")) return "en";
    return "sw";
  });

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      window.localStorage.setItem(STORAGE_KEY, l);
    } catch {
      /* private mode — ignore */
    }
  }, []);

  const t = useCallback(
    (key: string) => {
      const entry = TRANSLATIONS[key];
      if (!entry) return key;
      return entry[lang] || entry.sw || key;
    },
    [lang]
  );

  // Reflect lang on <html> for accessibility / screen readers
  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = lang;
    }
  }, [lang]);

  return <LangContext.Provider value={{ lang, setLang, t }}>{children}</LangContext.Provider>;
};

export const useT = (): Ctx => {
  const ctx = useContext(LangContext);
  if (!ctx) {
    // Safe fallback so any orphan call doesn't crash
    return {
      lang: "sw",
      setLang: () => {},
      t: (k) => TRANSLATIONS[k]?.sw || k,
    };
  }
  return ctx;
};

/** SW | EN toggle pill — slot anywhere in nav. */
export const LangToggle: React.FC<{ className?: string }> = ({ className = "" }) => {
  const { lang, setLang } = useT();
  return (
    <div
      data-testid="lang-toggle"
      className={
        "inline-flex items-center bg-ink-800 border border-ink-700 rounded-full p-0.5 text-[11px] font-mono " +
        className
      }
    >
      <button
        type="button"
        onClick={() => setLang("sw")}
        data-testid="lang-toggle-sw"
        className={
          "px-2.5 py-1 rounded-full transition-colors " +
          (lang === "sw" ? "bg-gold-500 text-ink-900 font-bold" : "text-ink-400 hover:text-white")
        }
      >
        SW
      </button>
      <button
        type="button"
        onClick={() => setLang("en")}
        data-testid="lang-toggle-en"
        className={
          "px-2.5 py-1 rounded-full transition-colors " +
          (lang === "en" ? "bg-gold-500 text-ink-900 font-bold" : "text-ink-400 hover:text-white")
        }
      >
        EN
      </button>
    </div>
  );
};

export default LangProvider;
