import React, { useState } from "react";
import { C, fmtTSh } from "./constants";

interface Props {
  tx?: any;
  onClose?: () => void;
}

export default function EscrowLetterOfComfort({ tx, onClose }: Props) {
  const [shared, setShared] = useState(false);
  const txId = tx?.tx_id || "3PT-AB12XYZ";
  const origin = typeof window !== "undefined" ? window.location.origin : "https://www.biz-salama.co.tz";

  // Prefer the backend-provided signed URL; fall back to public URL for demo data
  const verifyUrl =
    tx?.supplier_verify_url ||
    (tx?.supplier_token ? `${origin}/verify/${txId}?t=${tx.supplier_token}&r=supplier` : `${origin}/verify/${txId}`);

  const letter = {
    sw: `Biz-Salama Tanzania inathibitisha kwamba ${fmtTSh(tx?.buyer_price || 1850000)} imeshikwa salama katika akaunti ya escrow iliyoidhinishwa kwa ajili ya muamala ${txId}.\n\nPesa hii itatolewa MOJA KWA MOJA kwa M-Pesa yako (+255${tx?.supplier_phone || "7XX"}) mara mnunuzi athibitishapo kupokea bidhaa.\n\nThibitisha hapa: ${verifyUrl}`,
    en: `Biz-Salama Tanzania confirms that ${fmtTSh(tx?.buyer_price || 1850000)} is securely held in a licensed escrow account for transaction ${txId}.\n\nFunds will be released DIRECTLY to your M-Pesa (+255${tx?.supplier_phone || "7XX"}) upon buyer delivery confirmation.\n\nVerify at: ${verifyUrl}`,
  };

  const shareViaWhatsApp = () => {
    const msg = `🔒 *Biz-Salama — Barua ya Uthibitisho / Letter of Comfort*\n\nHabari,\n\nPesa ya muamala wetu imeshikwa salama:\n\n📦 Bidhaa: *${tx?.item || "Bidhaa"}*\n💰 Kiasi: *${fmtTSh(tx?.buyer_price || 1850000)}*\n🔐 Nambari ya Muamala: *${txId}*\n\n${letter.sw}\n\n---\n${letter.en}\n\n✅ Thibitisha moja kwa moja: ${verifyUrl}`;
    const phone = tx?.supplier_phone ? `+255${tx.supplier_phone}` : "";
    const deep = phone
      ? `whatsapp://send?phone=${phone}&text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`;
    try {
      window.location.href = deep;
    } catch {
      window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
    }
    setShared(true);
  };

  const shareSMS = () => {
    const msg = `Biz-Salama: ${fmtTSh(tx?.buyer_price || 1850000)} imeshikwa kwa ${txId}. Thibitisha: ${verifyUrl}`;
    window.location.href = `sms:+255${tx?.supplier_phone || ""}?body=${encodeURIComponent(msg)}`;
    setShared(true);
  };

  return (
    <div data-testid="letter-of-comfort" style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: C.surface, fontFamily: "DM Sans,sans-serif" }}>
      <div style={{ background: C.ink, padding: "14px 20px 16px", display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
        <button
          data-testid="letter-back-btn"
          onClick={onClose}
          style={{ width: 36, height: 36, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.07)", color: "white", cursor: "pointer", fontSize: 16 }}
        >
          ←
        </button>
        <div>
          <div style={{ color: "white", fontFamily: "Syne,sans-serif", fontSize: 14, fontWeight: 700 }}>Barua ya Uthibitisho</div>
          <div style={{ color: "rgba(255,255,255,0.42)", fontSize: 11, marginTop: 1 }}>Letter of Comfort · Tuma kwa Mmiliki wa Duka</div>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "16px" }}>
        <div style={{ background: "white", borderRadius: 16, padding: 20, marginBottom: 14, boxShadow: "0 2px 12px rgba(10,10,15,0.1)", border: "1px solid rgba(200,169,110,0.2)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, paddingBottom: 14, borderBottom: "1px solid #F4F3EF" }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: "linear-gradient(135deg,#C8A96E,#9A7A42)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>🔒</div>
            <div>
              <div style={{ fontFamily: "Syne,sans-serif", fontSize: 16, fontWeight: 800 }}>
                Biz-<span style={{ color: C.gold }}>Salama</span>
              </div>
              <div style={{ fontSize: 10, color: C.muted }}>Tanzania · biz-salama.co.tz · Escrow Licensed</div>
            </div>
            <div style={{ marginLeft: "auto", textAlign: "right" }}>
              <div style={{ fontSize: 10, color: C.muted }}>Tarehe / Date</div>
              <div style={{ fontSize: 12, fontWeight: 700 }}>{new Date().toLocaleDateString("sw-TZ")}</div>
            </div>
          </div>

          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: C.emeraldPale, borderRadius: 20, padding: "5px 14px", marginBottom: 16 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: C.emerald, boxShadow: "0 0 6px rgba(26,122,90,0.5)" }} />
            <span style={{ fontFamily: "Syne,sans-serif", fontSize: 11, fontWeight: 700, color: C.emerald }}>IMESHIKWA SALAMA · FUNDS SECURED</span>
          </div>

          {(
            [
              ["🔐 TX ID", txId, "monospace"],
              ["📦 Bidhaa / Item", tx?.item || "Samsung Galaxy S24 Ultra", null],
              ["💰 Kiasi / Amount", fmtTSh(tx?.buyer_price || 1850000), "Syne,sans-serif"],
              ["📱 Mmiliki / Supplier", tx?.supplier_name || "Duka la Mmiliki", null],
              ["🏦 Imeshikwa Na / Held At", "CRDB Bank PLC (Escrow Trust)", null],
              ["⏳ Itatoka Lini / Released When", "Mnunuzi atakapopokelewa bidhaa", null],
            ] as [string, string, string | null][]
          ).map(([l, v, font]) => (
            <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #F4F3EF", fontSize: 12 }}>
              <span style={{ color: C.muted }}>{l}</span>
              <span style={{ fontWeight: 700, maxWidth: "55%", textAlign: "right", fontFamily: font || undefined }}>{v}</span>
            </div>
          ))}

          <div style={{ marginTop: 16, background: C.surface, borderRadius: 10, padding: "12px 14px", textAlign: "center" }}>
            <div style={{ fontSize: 10, color: C.muted, fontFamily: "Syne,sans-serif", fontWeight: 700, marginBottom: 6, letterSpacing: "0.8px" }}>THIBITISHA MWENYEWE / VERIFY YOURSELF</div>
            <div data-testid="letter-verify-url" style={{ fontFamily: "monospace", fontSize: 12, color: C.emerald, fontWeight: 700, wordBreak: "break-all" }}>{verifyUrl}</div>
            <div style={{ fontSize: 10, color: C.muted, marginTop: 4 }}>Fungua kwenye simu yoyote · Open on any phone · No login required</div>
          </div>

          <div style={{ marginTop: 14, fontSize: 12, color: "rgba(10,10,15,0.65)", lineHeight: 1.7, background: "rgba(26,122,90,0.04)", borderRadius: 10, padding: "10px 12px" }}>
            <strong>Kwa Mmiliki wa Bidhaa:</strong>
            <br />
            Pesa ya {fmtTSh(tx?.supplier_cost || 1650000)} itatolewa moja kwa moja kwa M-Pesa yako mara mnunuzi atakapothibitisha kupokea bidhaa. Hakuna haja ya kusubiri — utoaji ni wa papo hapo.
          </div>
        </div>

        <div style={{ background: C.amberPale, border: "1px solid rgba(212,133,10,0.15)", borderRadius: 12, padding: "12px 14px", marginBottom: 14 }}>
          <div style={{ fontFamily: "Syne,sans-serif", fontSize: 12, fontWeight: 700, color: C.amber, marginBottom: 4 }}>💡 Jinsi ya Kutumia / How to Use</div>
          <div style={{ fontSize: 12, color: "rgba(10,10,15,0.6)", lineHeight: 1.6 }}>
            Mwonyeshe mmiliki wa duka barua hii kwenye skrini yako, au itumie WhatsApp. Wanaweza kuchunguza kiungo cha uthibitisho mwenyewe kwenye simu yao bila kuwa na akaunti ya Biz-Salama.
            <br />
            <br />
            Show the shop owner this letter on your screen, or send via WhatsApp. They can verify the link on their own phone without a Biz-Salama account.
          </div>
        </div>

        {shared && (
          <div data-testid="letter-shared-confirm" style={{ background: C.emeraldPale, border: "1px solid rgba(26,122,90,0.15)", borderRadius: 12, padding: "10px 14px", marginBottom: 8, textAlign: "center" }}>
            <div style={{ fontFamily: "Syne,sans-serif", fontSize: 13, fontWeight: 700, color: C.emerald }}>✅ Imetumwa! / Sent! Mmiliki atapata ujumbe hivi karibuni.</div>
          </div>
        )}
      </div>

      <div style={{ padding: "12px 16px 28px", background: C.ink, borderTop: "1px solid rgba(255,255,255,0.06)", flexShrink: 0 }}>
        <button
          data-testid="letter-whatsapp-btn"
          onClick={shareViaWhatsApp}
          style={{ width: "100%", padding: 14, background: "#25D366", color: "white", border: "none", borderRadius: 13, fontFamily: "Syne,sans-serif", fontSize: 14, fontWeight: 700, cursor: "pointer", marginBottom: 8, boxShadow: "0 4px 16px rgba(37,211,102,0.3)" }}
        >
          💬 Tuma WhatsApp kwa Mmiliki / Send to Supplier
        </button>
        <button
          data-testid="letter-sms-btn"
          onClick={shareSMS}
          style={{ width: "100%", padding: 14, background: "rgba(255,255,255,0.07)", color: "white", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 13, fontFamily: "Syne,sans-serif", fontSize: 14, fontWeight: 700, cursor: "pointer" }}
        >
          📱 Tuma SMS (Feature Phone)
        </button>
      </div>
    </div>
  );
}
