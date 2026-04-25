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

  // ─── Hero — extras
  "hero.happy_customers": { sw: "Wateja Wenye Furaha", en: "Happy Customers" },
  "hero.card.amount": { sw: "Kiasi cha Muamala", en: "Transaction Amount" },
  "hero.card.seller": { sw: "Muuzaji", en: "Seller" },
  "hero.card.product": { sw: "Bidhaa", en: "Product" },
  "hero.card.status": { sw: "Hali", en: "Status" },
  "hero.card.funds_secured": { sw: "Pesa Imelindwa", en: "Funds Secured" },
  "hero.card.escrow_protected": { sw: "Imelindwa na Escrow", en: "Escrow Protected" },
  "hero.card.assurance": {
    sw: "Malipo yako yanahifadhiwa salama hadi utakapothibitisha utoaji",
    en: "Your payment is held securely until delivery is confirmed",
  },

  // ─── How It Works
  "how.title": { sw: "Jinsi Biz-Salama Inavyofanya Kazi", en: "How Biz-Salama Works" },
  "how.subtitle": {
    sw: "Rahisi, salama, na wazi. Hivi ndivyo tunavyolinda kila muamala.",
    en: "Simple, secure, and transparent. Here's how we protect every transaction.",
  },
  "how.step1.title": { sw: "Vinjari na Agiza", en: "Browse & Order" },
  "how.step1.desc": {
    sw: "Pata bidhaa kutoka kwa wauzaji waliothibitishwa kote Tanzania. Weka oda yako kwa imani.",
    en: "Find products from verified sellers across Tanzania. Place your order with confidence.",
  },
  "how.step2.title": { sw: "Lipa Salama", en: "Secure Payment" },
  "how.step2.desc": {
    sw: "Lipa kupitia M-Pesa, Airtel Money au Tigo Pesa. Pesa yako inashikiliwa salama kwenye escrow.",
    en: "Pay via M-Pesa, Airtel Money, or Tigo Pesa. Your money is held safely in escrow.",
  },
  "how.step3.title": { sw: "Thibitisha na Toa", en: "Confirm & Release" },
  "how.step3.desc": {
    sw: "Pokea bidhaa zako, thibitisha utoaji, na muuzaji atalipwa. Rahisi kabisa!",
    en: "Receive your goods, confirm delivery, and the seller gets paid. Simple!",
  },

  // ─── 3-Party showcase
  "tp.eyebrow": { sw: "Escrow ya Watatu · Mchuuzi ↔ Duka ↔ Mnunuzi", en: "Three-Party Escrow · Hawker ↔ Shop ↔ Buyer" },
  "tp.title_a": { sw: "Uza bidhaa", en: "Sell stock you" },
  "tp.title_b": { sw: "ambazo bado huzimiliki", en: "don't own yet" },
  "tp.subtitle": {
    sw: "Kwa Wachuuzi: orodhesha bidhaa kutoka maduka ya Kariakoo, shiriki kiungo cha escrow, na pata komishen pindi utoaji unapothibitishwa — bila kulipa hata shilingi mapema.",
    en: "For street hawkers: list items from Kariakoo shop owners, share an escrow link, and earn commission the moment delivery is confirmed — without paying a single shilling upfront.",
  },
  "tp.transparent_split": { sw: "Mgawanyo Wazi", en: "Transparent Split" },
  "tp.split_sub": { sw: "Kila mtu anaona kila shilingi", en: "Everyone sees every shilling" },
  "tp.example_buyer_pays": { sw: "Mnunuzi anatoa", en: "Buyer pays" },
  "tp.split_note": {
    sw: "Mgawanyo unafanyika kiotomatiki pindi mnunuzi anapoguza \"Thibitisha Utoaji\". Sehemu ya muuzaji huenda kwa M-Pesa yake · Komishen ya mchuuzi huenda kwa yake.",
    en: "Split happens automatically the moment the buyer taps \"Confirm Delivery\". Supplier's share goes to their M-Pesa · Hawker's commission goes to theirs.",
  },
  "tp.letter_title": { sw: "Barua ya Hakikisho", en: "Letter of Comfort" },
  "tp.letter_sub": { sw: "Kile mmiliki wa duka anachopata", en: "What the shop owner gets" },
  "tp.cta_try": { sw: "Jaribu Escrow ya Watatu", en: "Try 3-Party Escrow Now" },
  "tp.cta_supplier": { sw: "Mimi ni Mmiliki wa Duka (Supplier)", en: "I'm a Shop Owner (Supplier)" },

  // ─── Trust section
  "trust.title_a": { sw: "Kwa nini Watanzania Wanaamini", en: "Why Tanzanians Trust" },
  "trust.subtitle": {
    sw: "Tumejenga soko salama zaidi Afrika Mashariki, lililoundwa mahsusi kwa wauzaji wa kijamii na wateja wao.",
    en: "We've built the most secure marketplace in East Africa, specifically designed for social sellers and their customers.",
  },
  "trust.f1.title": { sw: "Ulinzi wa Escrow", en: "Escrow Protection" },
  "trust.f1.desc": {
    sw: "Kila muamala umelindwa. Wauzaji hulipwa tu utakapothibitisha utoaji.",
    en: "Every transaction is protected. Sellers only get paid when you confirm delivery.",
  },
  "trust.f2.title": { sw: "Wauzaji Waliothibitishwa", en: "Verified Sellers" },
  "trust.f2.desc": {
    sw: "Wauzaji wote hupitia uthibitisho wa KYC. Nunua kutoka kwa watu unaoweza kuwaamini.",
    en: "All sellers go through KYC verification. Shop from people you can trust.",
  },
  "trust.f3.title": { sw: "Pesa za Simu Kwanza", en: "Mobile Money First" },
  "trust.f3.desc": {
    sw: "Lipa kwa M-Pesa, Airtel Money, au Tigo Pesa. Hauhitaji akaunti ya benki.",
    en: "Pay with M-Pesa, Airtel Money, or Tigo Pesa. No bank account needed.",
  },
  "trust.f4.title": { sw: "Haki Kwa Wote", en: "Fair for Everyone" },
  "trust.f4.desc": {
    sw: "Ada ndogo zinagawanywa kati ya mnunuzi na muuzaji. Kila mtu hushinda.",
    en: "Low fees split between buyer and seller. Everyone wins.",
  },
  "trust.stats_title": { sw: "Tunaaminiwa na Maelfu", en: "Trusted by Thousands" },
  "trust.stat.tx": { sw: "Miamala", en: "Transactions" },
  "trust.stat.rate": { sw: "Kiwango cha Mafanikio", en: "Success Rate" },
  "trust.stat.protected": { sw: "Imehifadhiwa", en: "Protected" },
  "trust.stat.sellers": { sw: "Wauzaji", en: "Sellers" },

  // ─── CTA section
  "cta.ready": { sw: "Uko Tayari Kununua au Kuuza Salama?", en: "Ready to Shop or Sell Safely?" },
  "cta.ready_sub": {
    sw: "Jiunge na maelfu ya Watanzania wanaoamini Biz-Salama kwa miamala salama. Anza leo — ni bure!",
    en: "Join thousands of Tanzanians who trust Biz-Salama for secure transactions. Start today - it's free!",
  },
  "cta.explore": { sw: "Vinjari Soko", en: "Explore Marketplace" },
  "cta.start_selling": { sw: "Anza Kuuza Bure", en: "Start Selling Free" },

  // ─── Footer
  "footer.tagline": {
    sw: "Mfumo wa escrow unaoaminika Tanzania kwa wauzaji wa kijamii. Nunua salama, uza kwa imani. Pesa yako inalindwa hadi upokee bidhaa.",
    en: "Tanzania's trusted escrow platform for social sellers. Shop safely, sell confidently. Your money is protected until you receive your goods.",
  },
  "footer.quick_links": { sw: "Viungo vya Haraka", en: "Quick Links" },
  "footer.become_seller": { sw: "Kuwa Muuzaji", en: "Become a Seller" },
  "footer.contact": { sw: "Wasiliana Nasi", en: "Contact Us" },
  "footer.rights": { sw: "© 2026 Biz-Salama. Haki zote zimehifadhiwa.", en: "© 2026 Biz-Salama. All rights reserved." },
  "footer.privacy": { sw: "Sera ya Faragha", en: "Privacy Policy" },
  "footer.terms": { sw: "Masharti ya Huduma", en: "Terms of Service" },

  // ─── Login
  "login.welcome": { sw: "Karibu Tena", en: "Welcome Back" },
  "login.subtitle": { sw: "Ingia katika akaunti yako ya Biz-Salama", en: "Sign in to your Biz-Salama account" },
  "login.phone_label": { sw: "Nambari ya Simu", en: "Phone Number" },
  "login.phone_hint": { sw: "Fomati zote zinakubalika:", en: "Any format works:" },
  "login.password_label": { sw: "Nenosiri", en: "Password" },
  "login.password_placeholder": { sw: "Ingiza nenosiri lako", en: "Enter your password" },
  "login.remember": { sw: "Nikumbuke", en: "Remember me" },
  "login.forgot": { sw: "Umesahau nenosiri?", en: "Forgot password?" },
  "login.submit": { sw: "Ingia", en: "Sign In" },
  "login.no_account": { sw: "Huna akaunti?", en: "Don't have an account?" },
  "login.signup_link": { sw: "Jisajili", en: "Sign up" },
  "login.error_fill": { sw: "Tafadhali jaza sehemu zote", en: "Please fill in all fields" },
  "login.success": { sw: "Karibu tena!", en: "Welcome back!" },
  "login.failed": { sw: "Imeshindikana kuingia", en: "Login failed" },

  // ─── Register
  "reg.title": { sw: "Anza Kuuza kwa", en: "Start Selling with" },
  "reg.title_b": { sw: "Imani", en: "Confidence" },
  "reg.subtitle": {
    sw: "Jiunge na maelfu ya wauzaji waliofanikiwa kwenye soko linaloaminika zaidi Tanzania.",
    en: "Join thousands of successful sellers on Tanzania's most trusted marketplace.",
  },
  "reg.benefit1": { sw: "Ulinzi wa Escrow kwa miamala yote", en: "Escrow protection on all transactions" },
  "reg.benefit2": { sw: "Fikia wateja waliothibitishwa", en: "Access to verified buyers" },
  "reg.benefit3": { sw: "Malipo ya pesa za simu", en: "Mobile money payments" },
  "reg.benefit4": { sw: "Bure kuanza kuuza", en: "Free to start selling" },
  "reg.create": { sw: "Fungua Akaunti", en: "Create Account" },
  "reg.create_long": { sw: "Fungua Akaunti Yako", en: "Create Your Account" },
  "reg.join": { sw: "Jiunge na Biz-Salama leo", en: "Join Biz-Salama today" },
  "reg.full_name": { sw: "Jina Kamili", en: "Full Name" },
  "reg.full_name_ph": { sw: "Ingiza jina lako kamili", en: "Enter your full name" },
  "reg.password_ph": { sw: "Tengeneza nenosiri", en: "Create a password" },
  "reg.confirm_password": { sw: "Thibitisha Nenosiri", en: "Confirm Password" },
  "reg.confirm_password_ph": { sw: "Thibitisha nenosiri lako", en: "Confirm your password" },
  "reg.agree": { sw: "Ninakubali", en: "I agree to the" },
  "reg.terms": { sw: "Masharti ya Huduma", en: "Terms of Service" },
  "reg.and": { sw: "na", en: "and" },
  "reg.privacy": { sw: "Sera ya Faragha", en: "Privacy Policy" },
  "reg.have_account": { sw: "Una akaunti tayari?", en: "Already have an account?" },
  "reg.login_link": { sw: "Ingia", en: "Sign in" },
  "reg.error_fill": { sw: "Tafadhali jaza sehemu zote", en: "Please fill in all fields" },
  "reg.error_match": { sw: "Manenosiri hayalingani", en: "Passwords do not match" },
  "reg.error_terms": { sw: "Tafadhali kubali masharti", en: "Please accept the terms and conditions" },
  "reg.success": { sw: "Karibu! Akaunti imefunguliwa.", en: "Account created successfully!" },
  "reg.failed": { sw: "Usajili umeshindwa", en: "Registration failed" },
  "reg.testimonial_role": { sw: "Muuzaji wa Mavazi", en: "Fashion Seller" },
  "reg.testimonial_quote": {
    sw: "\"Biz-Salama imebadilisha biashara yangu. Wateja wananiamini zaidi kwa sababu wanajua pesa zao zimelindwa. Mauzo yangu yameongezeka mara mbili kwa miezi 3!\"",
    en: "\"Biz-Salama changed my business. Customers trust me more because they know their money is protected. My sales doubled in 3 months!\"",
  },

  // ─── Marketplace
  "mkt.title": { sw: "Gundua Bidhaa za Kushangaza", en: "Discover Amazing Products" },
  "mkt.subtitle": {
    sw: "Nunua kutoka kwa wauzaji waliothibitishwa kote Tanzania na ulinzi wa escrow",
    en: "Shop from verified sellers across Tanzania with escrow protection",
  },
  "mkt.search_ph": { sw: "Tafuta bidhaa…", en: "Search for products..." },
  "mkt.cat.all": { sw: "Aina Zote", en: "All Categories" },
  "mkt.cat.fashion": { sw: "Mavazi", en: "Fashion & Clothing" },
  "mkt.cat.electronics": { sw: "Elektroniki", en: "Electronics" },
  "mkt.cat.home": { sw: "Nyumbani", en: "Home & Living" },
  "mkt.cat.beauty": { sw: "Urembo na Afya", en: "Beauty & Health" },
  "mkt.cat.food": { sw: "Chakula", en: "Food & Groceries" },
  "mkt.sort.newest": { sw: "Mpya", en: "Newest" },
  "mkt.sort.price_low": { sw: "Bei: Chini → Juu", en: "Price: Low to High" },
  "mkt.sort.price_high": { sw: "Bei: Juu → Chini", en: "Price: High to Low" },
  "mkt.sort.rating": { sw: "Wanaopendwa Zaidi", en: "Top Rated" },
  "mkt.no_products": { sw: "Hakuna bidhaa zilizopatikana", en: "No products found" },
  "mkt.verified": { sw: "Imethibitishwa", en: "Verified" },
  "mkt.lowest_price": { sw: "Bei ya Chini Zaidi", en: "Lowest Price" },
  "mkt.by": { sw: "na", en: "by" },
  "mkt.compare_add": { sw: "Linganisha", en: "Compare" },
  "mkt.compare_added": { sw: "Imelinganishwa", en: "Added" },

  // ─── Trending sellers strip
  "trending.title": { sw: "Wauzaji Wanaopendwa", en: "Trending Sellers" },
  "trending.subtitle": { sw: "Wauzaji walio na bidhaa nyingi zaidi kwenye soko letu", en: "Sellers with the most active listings on our marketplace" },
  "trending.products": { sw: "bidhaa", en: "products" },

  // ─── Compare drawer
  "compare.title": { sw: "Linganisha Bidhaa", en: "Compare Products" },
  "compare.empty": { sw: "Bofya \"Linganisha\" kwenye kadi za bidhaa kuongeza hapa.", en: "Tap \"Compare\" on product cards to add them here." },
  "compare.clear": { sw: "Futa Yote", en: "Clear All" },
  "compare.remove": { sw: "Ondoa", en: "Remove" },
  "compare.view": { sw: "Tazama Bidhaa", en: "View Product" },
  "compare.fab": { sw: "Linganisha", en: "Compare" },

  // ─── Product detail
  "pd.escrow_protected": { sw: "Imelindwa na Escrow", en: "Escrow Protected" },
  "pd.reviews": { sw: "tathmini", en: "reviews" },
  "pd.view_seller": { sw: "Tazama wasifu wa muuzaji", en: "View seller profile" },
  "pd.buy_now": { sw: "Nunua Sasa", en: "Buy Now" },
  "pd.escrow_assurance_title": { sw: "Ulinzi wa Escrow", en: "Escrow Protection" },
  "pd.escrow_assurance_body": {
    sw: "Malipo yako yanahifadhiwa salama hadi uthibitishe utoaji. Ulinzi 100% kwa mnunuzi.",
    en: "Your payment is held securely until you confirm delivery. 100% buyer protection.",
  },
  "pd.related": { sw: "Bidhaa Zinazofanana", en: "Related Products" },
  "pd.related_sub": { sw: "Bidhaa zingine kama hii kutoka kwa wauzaji waliothibitishwa", en: "More items like this from verified sellers" },
  "pd.loading": { sw: "Inapakia bidhaa…", en: "Loading product…" },
  "pd.not_found": { sw: "Bidhaa haijapatikana.", en: "Product not found." },

  // ─── Watch / price-drop alerts
  "watch.add": { sw: "Niarifu bei ikishuka", en: "Notify on price drop" },
  "watch.added": { sw: "Unaifuatilia", en: "Watching" },
  "watch.login_required": { sw: "Ingia kwanza ili kufuatilia bei.", en: "Sign in to watch this product." },
  "watch.added_toast": { sw: "Tumeanza kufuatilia. Tutakutumia SMS bei ikishuka.", en: "Watching this product. We'll text you when the price drops." },
  "watch.removed_toast": { sw: "Umeacha kufuatilia.", en: "No longer watching." },
  "watch.error": { sw: "Imeshindikana. Jaribu tena.", en: "Something went wrong. Try again." },
  "nav.watches": { sw: "Ninavyofuatilia", en: "My Watches" },
  "watches.title": { sw: "Bidhaa Ninazozifuatilia", en: "Watched Products" },
  "watches.subtitle": {
    sw: "Tutakuarifu kwa SMS pindi muuzaji yeyote atakapoorodhesha bidhaa kama hizi kwa bei ya chini zaidi.",
    en: "We'll text you the moment any seller lists a similar product at a lower price.",
  },
  "watches.empty_title": { sw: "Hujaanza kufuatilia bidhaa yoyote", en: "You aren't watching anything yet" },
  "watches.empty_sub": {
    sw: "Bofya kengele kwenye kadi yoyote kwenye soko ili kuanza kufuatilia bei.",
    en: "Tap the bell on any marketplace card to start tracking price drops.",
  },
  "watches.go_marketplace": { sw: "Vinjari Soko", en: "Browse Marketplace" },
  "watches.anchor_price": { sw: "Bei Wakati Wa Kufuatilia", en: "Anchor price" },
  "watches.now_lowest": { sw: "Bei ya Chini Sasa", en: "Lowest now" },
  "watches.savings": { sw: "Akiba", en: "You'd save" },
  "watches.no_drop": { sw: "Hakuna bei ya chini bado", en: "No cheaper match yet" },
  "watches.view_match": { sw: "Tazama Mbadala", en: "View cheaper option" },
  "watches.view_anchor": { sw: "Tazama Bidhaa", en: "View product" },
  "watches.alerts_count": { sw: "tahadhari", en: "alerts" },
  "watches.unwatch": { sw: "Acha Kufuatilia", en: "Stop watching" },
  "watches.alerts_history": { sw: "Historia ya tahadhari", en: "Recent alerts" },

  // ─── Seller profile
  "sp.loading": { sw: "Inapakia muuzaji…", en: "Loading seller…" },
  "sp.not_found": { sw: "Muuzaji hajapatikana.", en: "Seller not found." },
  "sp.verified": { sw: "Muuzaji Aliyethibitishwa", en: "Verified Seller" },
  "sp.women_owned": { sw: "Biashara ya Mwanamke", en: "Women-owned business" },
  "sp.joined": { sw: "Alijiunga", en: "Joined" },
  "sp.products_by": { sw: "Bidhaa za", en: "Products by" },
  "sp.products_count": { sw: "bidhaa", en: "products" },
  "sp.no_products": { sw: "Bado hakuna bidhaa zilizoorodheshwa.", en: "No products listed yet." },
  "sp.stat.products": { sw: "Bidhaa", en: "Products" },
  "sp.stat.orders": { sw: "Maagizo Yaliyokamilika", en: "Orders completed" },
  "sp.stat.reviews": { sw: "tathmini", en: "reviews" },
  "sp.no_rating": { sw: "Hakuna tathmini bado", en: "No ratings yet" },
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
