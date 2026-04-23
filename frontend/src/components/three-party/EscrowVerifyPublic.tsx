import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { C, fmtTSh, TX_STATES, API_URL } from "./constants";

interface Props {
  txId: string;
  onClose?: () => void;
}

type View = "public" | "supplier" | "buyer";

export default function EscrowVerifyPublic({ txId, onClose }: Props) {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("t") || searchParams.get("token") || "";
  const role = searchParams.get("r") || searchParams.get("role") || "";

  const [status, setStatus] = useState<"loading" | "verified" | "not_found">("loading");
  const [tx, setTx] = useState<any>(null);

  useEffect(() => {
    const verify = async () => {
      try {
        const qs = token ? `?token=${token}&role=${role}` : "";
        const res = await fetch(`${API_URL}/api/escrow/verify/${txId}${qs}`);
        if (res.ok) {
          setTx(await res.json());
          setStatus("verified");
        } else {
          setStatus("not_found");
        }
      } catch {
        setStatus("not_found");
      }
    };
    verify();
  }, [txId, token, role]);

  if (status === "loading")
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: C.surface }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ width: 44, height: 44, border: "3px solid rgba(200,169,110,0.2)", borderTopColor: C.gold, borderRadius: "50%", margin: "0 auto 16px", animation: "spin 0.8s linear infinite" }} />
          <div style={{ fontFamily: "Syne,sans-serif", fontWeight: 700 }}>Inathibitisha… / Verifying…</div>
        </div>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );

  if (status === "not_found")
    return (
      <div data-testid="verify-not-found" style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 32, background: C.surface }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>❌</div>
          <div style={{ fontFamily: "Syne,sans-serif", fontSize: 18, fontWeight: 800 }}>Haukupatikana / Not Found</div>
          <div style={{ fontSize: 13, color: C.muted, marginTop: 8 }}>Angalia nambari ya muamala / Check transaction ID</div>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 4, fontFamily: "monospace" }}>{txId}</div>
        </div>
      </div>
    );

  const view: View = (tx.view as View) || "public";
  const st = TX_STATES[tx.status] || TX_STATES.escrowed;

  // ── Role-specific row definitions ───────────────────────────────────
  let rows: [string, string, string | null][] = [];
  let audienceBadge = "";
  let guaranteeText = "";

  if (view === "supplier") {
    audienceBadge = "🏪 KWA MMILIKI WA DUKA · SUPPLIER VIEW";
    rows = [
      ["TX ID", tx.tx_id, "monospace"],
      ["Bidhaa / Item", tx.item, null],
      ["Hali / Condition", tx.item_condition || "—", null],
      ["Kiasi cha Mnunuzi / Buyer Price", fmtTSh(tx.buyer_price), "Syne,sans-serif"],
      ["💰 Utapata / Your Payout", fmtTSh(tx.supplier_cost), "Syne,sans-serif"],
      ["Mchuuzi / Hawker", tx.hawker_name, null],
      ["Imeshikwa Na / Held By", tx.bank, null],
      ["Hali / Status", st.label, null],
      ["Ilishikwa / Locked At", new Date(tx.locked_at || tx.created_at).toLocaleString("sw-TZ"), null],
    ];
    guaranteeText = `${fmtTSh(tx.supplier_cost)} itatolewa moja kwa moja kwa M-Pesa yako mara mnunuzi atakapothibitisha kupokea bidhaa.\n\n${fmtTSh(tx.supplier_cost)} will be released directly to your M-Pesa when the buyer confirms receipt.`;
  } else if (view === "buyer") {
    audienceBadge = "🛍 KWA MNUNUZI · BUYER VIEW";
    rows = [
      ["TX ID", tx.tx_id, "monospace"],
      ["Bidhaa / Item", tx.item, null],
      ["Hali / Condition", tx.item_condition || "—", null],
      ["Ulichopata Kulipa / Your Payment", fmtTSh(tx.buyer_price), "Syne,sans-serif"],
      ["Muuzaji / Seller", tx.seller_name, null],
      ["Imeshikwa Na / Held By", tx.bank, null],
      ["Hali / Status", st.label, null],
      ["Ilishikwa / Locked At", new Date(tx.locked_at || tx.created_at).toLocaleString("sw-TZ"), null],
    ];
    guaranteeText = `Pesa yako ya ${fmtTSh(tx.buyer_price)} iko salama — itatolewa kwa muuzaji TU baada ya wewe kuthibitisha kupokea bidhaa.\n\nYour ${fmtTSh(tx.buyer_price)} is safe — released to the seller ONLY after you confirm you've received the goods.`;
  } else {
    // Public view — minimal, non-competitive info
    audienceBadge = "🔒 UTHIBITISHO WA ESCROW · PUBLIC VERIFY";
    rows = [
      ["TX ID", tx.tx_id, "monospace"],
      ["Bidhaa / Item", tx.item, null],
      ["Kiasi Kilichoshikwa / Amount Locked", fmtTSh(tx.buyer_price), "Syne,sans-serif"],
      ["Imeshikwa Na / Held By", tx.bank, null],
      ["Hali / Status", st.label, null],
      ["Ilishikwa / Locked At", new Date(tx.locked_at || tx.created_at).toLocaleString("sw-TZ"), null],
    ];
    guaranteeText = `Muamala huu umelindwa na Biz-Salama. Pesa imeshikwa katika akaunti ya benki iliyoidhinishwa.\n\nThis transaction is protected by Biz-Salama. Funds are held in a licensed bank account.`;
  }

  return (
    <div data-testid={`verify-public-${view}`} style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "#F8F9FF", fontFamily: "DM Sans,sans-serif" }}>
      <div style={{ background: "linear-gradient(145deg,#0A0A0F,#0A1410)", padding: "32px 24px 24px", textAlign: "center", flexShrink: 0 }}>
        <div style={{ fontFamily: "Syne,sans-serif", fontSize: 24, fontWeight: 800, color: "white", marginBottom: 4 }}>
          Biz-<span style={{ color: C.gold }}>Salama</span>
        </div>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 14 }}>biz-salama.co.tz · Tanzania</div>

        {/* Audience badge */}
        <div data-testid="verify-audience-badge" style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 16, padding: "4px 12px", marginBottom: 10 }}>
          <span style={{ fontFamily: "Syne,sans-serif", fontSize: 10, fontWeight: 700, color: C.gold, letterSpacing: "0.5px" }}>{audienceBadge}</span>
        </div>
        <br />

        <div data-testid="verify-status-badge" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: C.emeraldPale, borderRadius: 20, padding: "8px 18px" }}>
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: C.emerald, boxShadow: "0 0 8px rgba(26,122,90,0.6)" }} />
          <span style={{ fontFamily: "Syne,sans-serif", fontSize: 13, fontWeight: 700, color: C.emerald }}>✓ IMESHIKWA SALAMA · VERIFIED SECURE</span>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "20px 16px" }}>
        <div style={{ background: "white", borderRadius: 16, padding: 18, marginBottom: 14, boxShadow: "0 2px 12px rgba(10,10,15,0.08)" }}>
          <div style={{ fontFamily: "Syne,sans-serif", fontSize: 11, fontWeight: 700, color: C.muted, marginBottom: 12, letterSpacing: "1px" }}>MAELEZO YA MUAMALA / TRANSACTION DETAILS</div>
          {rows.map(([l, v, font]) => (
            <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", borderBottom: "1px solid #F4F3EF", fontSize: 13 }}>
              <span style={{ color: C.muted }}>{l}</span>
              <span
                style={{
                  fontWeight: 700,
                  fontFamily: font || undefined,
                  maxWidth: "55%",
                  textAlign: "right",
                  color: l.includes("Status") ? st.color : undefined,
                }}
              >
                {v}
              </span>
            </div>
          ))}
        </div>

        <div style={{ background: C.emeraldPale, border: "1px solid rgba(26,122,90,0.15)", borderRadius: 14, padding: "16px", textAlign: "center" }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>🏦</div>
          <div style={{ fontFamily: "Syne,sans-serif", fontSize: 14, fontWeight: 700, color: C.emerald, marginBottom: 8 }}>Pesa Ipo Salama Benki</div>
          <div style={{ fontSize: 12, color: "rgba(10,10,15,0.6)", lineHeight: 1.7, whiteSpace: "pre-line" }}>{guaranteeText}</div>
        </div>

        {view === "public" && (
          <div style={{ marginTop: 14, background: "rgba(212,133,10,0.08)", border: "1px solid rgba(212,133,10,0.2)", borderRadius: 10, padding: "12px 14px", fontSize: 11, color: "rgba(10,10,15,0.6)", lineHeight: 1.6 }}>
            ℹ️ <strong>Privacy:</strong> This is a public verification page. To see payout details, the shop owner
            (supplier) must use the signed link sent to their phone. The buyer sees their own view from their order page.
          </div>
        )}

        <div style={{ marginTop: 14, textAlign: "center", fontSize: 11, color: C.muted }}>
          Je, una maswali? Piga simu: +255 7XX XXX XXX au barua pepe: info@biz-salama.co.tz
        </div>
      </div>
    </div>
  );
}
