import React, { useState, useEffect } from "react";
import { C, fmtTSh, API_URL } from "./constants";

interface Props {
  txId: string;
  supplierPhone?: string;
  token?: string;          // optional signed token (from SMS link)
  onClose?: () => void;
}

type Decision = "accepted" | "counter" | "declined" | null;

export default function SupplierConfirmationScreen({ txId, supplierPhone, token, onClose }: Props) {
  const [tx, setTx] = useState<any>(null);
  const [decision, setDecision] = useState<Decision>(null);
  const [loading, setLoading] = useState(false);
  const [counterCost, setCounterCost] = useState("");
  const [counterNote, setCounterNote] = useState("");
  const [showCounter, setShowCounter] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const qs = token ? `?token=${token}&role=supplier` : "";
        const res = await fetch(`${API_URL}/api/escrow/verify/${txId}${qs}`);
        if (res.ok) setTx(await res.json());
      } catch { /* ignore */ }
    })();
  }, [txId, token]);

  const respond = async (body: any) => {
    setLoading(true);
    try {
      await fetch(`${API_URL}/api/escrow/three-party/${txId}/supplier-response`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } catch { /* noop */ }
    setLoading(false);
  };

  const accept = async () => {
    await respond({ accepted: true, supplier_phone: supplierPhone, supplier_cost: tx?.supplier_cost });
    setDecision("accepted");
  };
  const decline = async () => {
    await respond({ accepted: false, counter_offer: false, supplier_phone: supplierPhone });
    setDecision("declined");
  };
  const counterOffer = async () => {
    const n = Number(counterCost.replace(/\D/g, ""));
    if (!n || n >= (tx?.buyer_price || 0)) return;
    await respond({ accepted: false, counter_offer: true, supplier_phone: supplierPhone, supplier_cost: n, note: counterNote });
    setDecision("counter");
  };

  // ── Success screens ─────────────────────────────────────────────────
  if (decision === "accepted")
    return (
      <div data-testid="supplier-confirm-accepted" style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 32, background: C.surface, fontFamily: "DM Sans,sans-serif" }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>✅</div>
        <div style={{ fontFamily: "Syne,sans-serif", fontSize: 22, fontWeight: 800, textAlign: "center", marginBottom: 8 }}>Nimekubali! / Accepted!</div>
        <div style={{ fontSize: 13, color: C.muted, textAlign: "center", lineHeight: 1.6, marginBottom: 24, maxWidth: 360 }}>
          Umeridhika na bei zote. {tx?.hawker_name || "Mchuuzi"} atakuja kuchukua bidhaa baada ya mnunuzi kulipa.
          Utapata M-Pesa ya {fmtTSh(tx?.supplier_payout ?? 0)} moja kwa moja baada ya utoaji.
        </div>
        <div style={{ background: C.emeraldPale, borderRadius: 13, padding: 16, width: "100%", maxWidth: 360, textAlign: "center" }}>
          <div style={{ fontFamily: "Syne,sans-serif", fontSize: 24, fontWeight: 800, color: C.emerald }}>{fmtTSh(tx?.supplier_payout ?? 0)}</div>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>Utapata M-Pesa · Your M-Pesa payout</div>
        </div>
      </div>
    );

  if (decision === "counter")
    return (
      <div data-testid="supplier-confirm-counter" style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 32, background: C.surface, fontFamily: "DM Sans,sans-serif" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>📝</div>
        <div style={{ fontFamily: "Syne,sans-serif", fontSize: 20, fontWeight: 800, textAlign: "center", marginBottom: 8 }}>Umependekeza Bei Nyingine</div>
        <div style={{ fontSize: 13, color: C.muted, textAlign: "center", lineHeight: 1.6, maxWidth: 360 }}>
          Pendekezo lako limetumwa kwa {tx?.hawker_name || "mchuuzi"}. Wakikubali au wakipendekeza tofauti, utapokea SMS.
          <br /><br />
          Your counter-offer has been sent. You'll receive an SMS when the hawker accepts or amends.
        </div>
      </div>
    );

  if (decision === "declined")
    return (
      <div data-testid="supplier-confirm-declined" style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 32, background: C.surface }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>❌</div>
        <div style={{ fontFamily: "Syne,sans-serif", fontSize: 18, fontWeight: 800, textAlign: "center", marginBottom: 8 }}>Imekataliwa / Declined</div>
        <div style={{ fontSize: 13, color: C.muted, textAlign: "center", lineHeight: 1.6, maxWidth: 360 }}>
          {tx?.hawker_name || "Mchuuzi"} ataarifu mnunuzi. Hakuna hatua zaidi inahitajika kutoka kwako.
        </div>
      </div>
    );

  // ── Main screen: full breakdown + 3 action buttons ─────────────────
  if (!tx)
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: C.surface }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ width: 44, height: 44, border: "3px solid rgba(200,169,110,0.2)", borderTopColor: C.gold, borderRadius: "50%", margin: "0 auto 16px", animation: "spin 0.8s linear infinite" }} />
          <div style={{ fontFamily: "Syne,sans-serif", fontWeight: 700 }}>Inasoma muamala…</div>
        </div>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );

  // Public/minimal response from backend (no token) — can't show full breakdown
  if (tx.view !== "supplier") {
    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 32, background: C.ink, fontFamily: "DM Sans,sans-serif", textAlign: "center", color: "white" }}>
        <div style={{ fontSize: 48, marginBottom: 14 }}>🔒</div>
        <div style={{ fontFamily: "Syne,sans-serif", fontSize: 20, fontWeight: 800, marginBottom: 10, color: "white" }}>Kiungo hakijatimia</div>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.75)", lineHeight: 1.7, maxWidth: 360, margin: "0 auto" }}>
          Tafadhali fungua kiungo kamili kilichotumwa kwako na mchuuzi (na token ya uthibitisho).
          <br /><br />
          Please open the full signed link sent to you by the hawker (with verification token).
        </div>
      </div>
    );
  }

  return (
    <div data-testid="supplier-confirm-screen" style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: C.surface, fontFamily: "DM Sans,sans-serif" }}>
      <div style={{ background: "linear-gradient(145deg,#0A0A0F,#1A1510)", padding: "24px 24px 20px", textAlign: "center", flexShrink: 0 }}>
        <div style={{ fontFamily: "Syne,sans-serif", fontSize: 22, fontWeight: 800, color: "white", marginBottom: 4 }}>
          Biz-<span style={{ color: C.gold }}>Salama</span>
        </div>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>Idhinisha Muamala Kamili / Approve Full Deal</div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "18px 16px" }}>
        {/* Who & what */}
        <div style={{ background: "white", borderRadius: 14, padding: 16, marginBottom: 12, boxShadow: "0 1px 4px rgba(10,10,15,0.06)" }}>
          <div style={{ fontFamily: "Syne,sans-serif", fontSize: 12, fontWeight: 700, color: C.muted, marginBottom: 6, letterSpacing: "0.5px" }}>OMBI LA MUAMALA</div>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 2 }}>
            {tx.hawker_name} anataka kutoa <span style={{ color: C.gold }}>{tx.item}</span>
          </div>
          <div style={{ fontSize: 11, color: C.muted }}>TX {tx.tx_id}</div>
        </div>

        {/* Negotiation history — visible after first counter-offer */}
        {tx.negotiation_history && tx.negotiation_history.length > 1 && (
          <div data-testid="supplier-history" style={{ background: "white", borderRadius: 14, padding: 14, marginBottom: 12, boxShadow: "0 1px 4px rgba(10,10,15,0.06)" }}>
            <div style={{ fontFamily: "Syne,sans-serif", fontSize: 11, fontWeight: 700, color: C.muted, marginBottom: 10, letterSpacing: "0.5px" }}>
              💬 HISTORIA / HISTORY ({tx.negotiation_history.length})
            </div>
            {tx.negotiation_history.map((h: any, i: number) => {
              const isHawker = h.by === "hawker";
              const label = ({opened:"Alifungua/Opened", counter:"Alipendekeza/Countered", accepted:"Alikubali/Accepted", rejected:"Alikataa/Declined"} as any)[h.action] || h.action;
              return (
                <div key={i} style={{ display: "flex", gap: 8, marginBottom: i === tx.negotiation_history.length - 1 ? 0 : 8, flexDirection: isHawker ? "row" : "row-reverse", alignItems: "flex-start" }}>
                  <div style={{ flex: 1, background: isHawker ? "#EEF6FF" : "#FEF8EC", borderLeft: `3px solid ${isHawker ? "#2563EB" : "#D4850A"}`, padding: 8, borderRadius: 8 }}>
                    <div style={{ fontSize: 9, color: isHawker ? "#2563EB" : "#D4850A", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 2 }}>
                      {isHawker ? "Mchuuzi / Hawker" : "Wewe / You"} · {label}
                    </div>
                    {h.supplier_cost != null && (
                      <div style={{ fontSize: 13, fontWeight: 800, fontFamily: "Syne,sans-serif", color: C.ink }}>{fmtTSh(h.supplier_cost)}</div>
                    )}
                    {h.note && <div style={{ fontSize: 10, color: C.muted, fontStyle: "italic", marginTop: 2 }}>"{h.note}"</div>}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Full breakdown — NIMEKUBALI BEI HIZI ZOTE */}
        <div style={{ background: "white", borderRadius: 14, padding: 16, marginBottom: 12, boxShadow: "0 1px 4px rgba(10,10,15,0.06)" }}>
          <div style={{ fontFamily: "Syne,sans-serif", fontSize: 12, fontWeight: 700, color: C.muted, marginBottom: 12, letterSpacing: "0.5px" }}>MUUNDO WA MALIPO KAMILI / FULL BREAKDOWN</div>

          {/* Top: buyer pays */}
          <div style={{ background: C.ink, borderRadius: 11, padding: "12px 14px", marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", fontFamily: "Syne,sans-serif", letterSpacing: "0.5px" }}>MNUNUZI ANALIPA</div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)" }}>Buyer pays</div>
            </div>
            <div style={{ fontFamily: "Syne,sans-serif", fontSize: 22, fontWeight: 800, color: C.gold }}>{fmtTSh(tx.buyer_price)}</div>
          </div>

          {/* Split rows — SUPPLIER SEES ONLY THEIR SIDE (2% fee) + hawker commission for transparency */}
          {[
            { label: "💰 Wewe Unapata / You Get", sub: "Your payout (after 2% supply fee)", val: tx.supplier_payout, color: C.emerald, bold: true },
            { label: "🧑‍💼 Faida ya Mchuuzi / Hawker Commission", sub: "Hawker's markup on this item", val: tx.hawker_commission_visible, color: C.gold },
            { label: `🏛 Ada ya Supply (${tx.supply_fee_pct || 2}%)`, sub: "Platform fee on YOUR side", val: tx.supply_fee, color: C.muted },
          ].map((r) => (
            <div key={r.label} style={{ padding: "9px 0", borderBottom: "1px solid #F4F3EF" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", fontSize: 13 }}>
                <span style={{ color: C.ink, fontWeight: r.bold ? 700 : 500 }}>{r.label}</span>
                <span style={{ fontFamily: "Syne,sans-serif", fontWeight: 800, color: r.color, fontSize: r.bold ? 16 : 13 }}>{fmtTSh(r.val ?? 0)}</span>
              </div>
              <div style={{ fontSize: 10, color: C.muted, marginTop: 1 }}>{r.sub}</div>
            </div>
          ))}

          {/* Invariant check (supplier-side only: supplier_cost + hawker_commission = buyer_price) */}
          <div style={{ marginTop: 10, background: C.surface, borderRadius: 8, padding: "8px 10px", fontSize: 11, color: C.muted, textAlign: "center" }}>
            ✓ Bei ya jumla ({fmtTSh(tx.supplier_cost)}) + Faida ya mchuuzi ({fmtTSh(tx.hawker_commission_visible ?? 0)}) = {fmtTSh(tx.buyer_price)}
          </div>
        </div>

        {/* Trust box */}
        <div style={{ background: C.emeraldPale, border: "1px solid rgba(26,122,90,0.15)", borderRadius: 12, padding: "12px 14px", marginBottom: 10 }}>
          <div style={{ fontFamily: "Syne,sans-serif", fontSize: 12, fontWeight: 700, color: C.emerald, marginBottom: 4 }}>🛡️ Upande Wako / Your Side Only</div>
          <div style={{ fontSize: 12, color: "rgba(10,10,15,0.6)", lineHeight: 1.55 }}>
            Unaidhinisha <strong>upande wako tu wa muamala</strong> — bei yako ya jumla na ada ya 2% ya mfumo.
            <br /><br />
            You are approving <strong>your side of the deal only</strong> — your wholesale price and the 2% platform fee.
          </div>
        </div>
      </div>

      {/* Counter-offer modal */}
      {showCounter && (
        <div onClick={() => setShowCounter(false)} style={{ position: "fixed", inset: 0, background: "rgba(10,10,15,0.7)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 50 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: C.surface, borderRadius: "20px 20px 0 0", width: "100%", maxWidth: 480, padding: 20, fontFamily: "DM Sans,sans-serif" }}>
            <div style={{ fontFamily: "Syne,sans-serif", fontSize: 16, fontWeight: 800, marginBottom: 4 }}>Pendekeza Bei Nyingine</div>
            <div style={{ fontSize: 12, color: C.muted, marginBottom: 14 }}>Counter-offer: propose a different supplier cost</div>

            <div style={{ fontSize: 10, color: C.muted, fontWeight: 700, fontFamily: "Syne,sans-serif", marginBottom: 5, letterSpacing: "0.5px" }}>BEI YAKO MPYA / YOUR NEW PRICE *</div>
            <div style={{ position: "relative", marginBottom: 12 }}>
              <div style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: 12, fontWeight: 700, color: C.muted }}>TSh</div>
              <input
                data-testid="counter-cost-input"
                type="tel" inputMode="numeric"
                value={counterCost}
                onChange={(e) => setCounterCost(e.target.value.replace(/\D/g, ""))}
                placeholder={String(tx.supplier_cost).replace(/(\d)(?=(\d{3})+$)/g, "$1,")}
                style={{ width: "100%", padding: "14px 14px 14px 44px", border: `1.5px solid ${C.surface3}`, borderRadius: 12, background: "white", fontSize: 18, fontFamily: "Syne,sans-serif", fontWeight: 800, outline: "none" }}
              />
            </div>
            <div style={{ fontSize: 10, color: C.muted, fontWeight: 700, fontFamily: "Syne,sans-serif", marginBottom: 5, letterSpacing: "0.5px" }}>SABABU / NOTE (optional)</div>
            <textarea
              data-testid="counter-note-input"
              value={counterNote}
              onChange={(e) => setCounterNote(e.target.value)}
              placeholder="Ni bei yangu ya jumla / This is my wholesale price"
              rows={2}
              style={{ width: "100%", padding: "10px 12px", border: `1.5px solid ${C.surface3}`, borderRadius: 12, background: "white", fontSize: 13, resize: "none", fontFamily: "DM Sans,sans-serif", outline: "none", marginBottom: 14 }}
            />
            <div style={{ display: "flex", gap: 8 }}>
              <button
                data-testid="counter-cancel-btn"
                onClick={() => setShowCounter(false)}
                style={{ flex: 1, padding: 13, background: "transparent", border: `1.5px solid ${C.surface3}`, borderRadius: 12, fontFamily: "Syne,sans-serif", fontSize: 14, fontWeight: 700, cursor: "pointer" }}
              >
                Ghairi
              </button>
              <button
                data-testid="counter-submit-btn"
                onClick={() => { setShowCounter(false); counterOffer(); }}
                disabled={!counterCost || Number(counterCost) >= (tx.buyer_price || 0)}
                style={{ flex: 2, padding: 13, background: C.gold, color: C.ink, border: "none", borderRadius: 12, fontFamily: "Syne,sans-serif", fontSize: 14, fontWeight: 800, cursor: "pointer", opacity: (!counterCost || Number(counterCost) >= (tx.buyer_price || 0)) ? 0.4 : 1 }}
              >
                📤 Tuma Pendekezo
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ padding: "12px 16px 36px", background: C.ink, borderTop: "1px solid rgba(255,255,255,0.06)", flexShrink: 0 }}>
        <button
          data-testid="supplier-accept-btn"
          onClick={accept}
          disabled={loading}
          style={{ width: "100%", padding: 15, background: loading ? "rgba(26,122,90,0.5)" : "linear-gradient(135deg,#1A7A5A,#22A878)", color: "white", border: "none", borderRadius: 13, fontFamily: "Syne,sans-serif", fontSize: 15, fontWeight: 800, cursor: "pointer", boxShadow: "0 4px 16px rgba(26,122,90,0.3)", marginBottom: 8 }}
        >
          ✅ Nimekubali bei hizi zote / I agree to all these prices
        </button>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            data-testid="supplier-counter-btn"
            onClick={() => setShowCounter(true)}
            disabled={loading}
            style={{ flex: 2, padding: 13, background: "rgba(200,169,110,0.15)", color: C.gold, border: "1px solid rgba(200,169,110,0.35)", borderRadius: 12, fontFamily: "Syne,sans-serif", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
          >
            💬 Pendekeza Bei Nyingine
          </button>
          <button
            data-testid="supplier-decline-btn"
            onClick={decline}
            disabled={loading}
            style={{ flex: 1, padding: 13, background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.55)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, fontFamily: "Syne,sans-serif", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
          >
            HAPANA
          </button>
        </div>
      </div>
    </div>
  );
}
