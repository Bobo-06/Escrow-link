// Shared constants for Three-Party Escrow UI
export const C = {
  ink: "#0A0A0F", ink2: "#1A1A26",
  gold: "#C8A96E", goldD: "#9A7A42", goldL: "#E8D4A8",
  emerald: "#1A7A5A", emeraldL: "#22A878", emeraldPale: "#E8F5F0",
  ruby: "#C0392B", rubyPale: "#FDF0EF",
  amber: "#D4850A", amberPale: "#FEF8EC",
  purple: "#7C3AED", blue: "#2563EB",
  surface: "#F4F3EF", surface2: "#ECEAE3", surface3: "#E2DED5",
  white: "#FFFFFF", muted: "#7A7A8A",
};

export const fmtTSh = (n: number | string) =>
  `TSh ${Number(n || 0).toLocaleString("sw-TZ")}`;

export const fmtK = (n: number) =>
  n >= 1e6
    ? `TSh ${(n / 1e6).toFixed(2)}M`
    : `TSh ${(n / 1000).toFixed(0)}K`;

export const TX_STATES: Record<string, { label: string; en: string; color: string; icon: string }> = {
  draft:              { label: "Rasimu",                en: "Draft",              color: C.muted,   icon: "📝" },
  awaiting_supplier:  { label: "Inasubiri Mmiliki",     en: "Awaiting Supplier",  color: C.amber,   icon: "⏳" },
  supplier_confirmed: { label: "Mmiliki Amethibitisha", en: "Supplier Confirmed", color: C.blue,    icon: "✅" },
  pending_approval:   { label: "Inasubiri Mmiliki",     en: "Awaiting Supplier",  color: C.amber,   icon: "⏳" },
  supplier_approved:  { label: "Mmiliki Amethibitisha", en: "Supplier Confirmed", color: C.blue,    icon: "✅" },
  payment_pending:    { label: "Malipo Yanakusuliwa",   en: "Payment Pending",    color: C.amber,   icon: "💳" },
  escrowed:           { label: "Imeshikwa Salama",      en: "Escrowed",           color: C.emerald, icon: "🔒" },
  paid:               { label: "Imeshikwa Salama",      en: "Escrowed",           color: C.emerald, icon: "🔒" },
  goods_released:     { label: "Bidhaa Imetolewa",      en: "Goods Released",     color: C.blue,    icon: "📦" },
  in_transit:         { label: "Inasafirishwa",         en: "In Transit",         color: C.amber,   icon: "🚚" },
  delivered:          { label: "Imewasilishwa",         en: "Delivered",          color: C.emerald, icon: "🎉" },
  disputed:           { label: "Tatizo",                en: "Disputed",           color: C.ruby,    icon: "⚠️" },
  completed:          { label: "Imekamilika",           en: "Completed",          color: C.emerald, icon: "🏆" },
  rejected:           { label: "Imekataliwa",           en: "Rejected",           color: C.ruby,    icon: "❌" },
};

export const API_URL = process.env.REACT_APP_BACKEND_URL || "";

export const authHeaders = (): Record<string, string> => {
  try {
    const raw = localStorage.getItem("biz-salama-auth");
    if (!raw) return { "Content-Type": "application/json" };
    const data = JSON.parse(raw);
    const token = data?.state?.token;
    return token
      ? { "Content-Type": "application/json", Authorization: `Bearer ${token}` }
      : { "Content-Type": "application/json" };
  } catch {
    return { "Content-Type": "application/json" };
  }
};
