import React, { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { C } from "../components/three-party/constants";

const API_URL = process.env.REACT_APP_BACKEND_URL || "";

/**
 * Buyer-facing offer screen for direct 2-party escrow (no hawker).
 * User arrives here via signed SMS/WhatsApp link: /direct-offer/:txId?t=<hmac>
 */
export default function DirectBuyerOfferPage() {
  const { txId = "" } = useParams();
  const [params] = useSearchParams();
  const token = params.get("t") || "";

  const [tx, setTx] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [mode, setMode] = useState<"view" | "counter">("view");
  const [counterPrice, setCounterPrice] = useState("");
  const [counterNote, setCounterNote] = useState("");

  const fmt = (n: any) => `TSh ${Number(n || 0).toLocaleString()}`;
  const BUYER_FEE_PCT = 0.03;

  const load = async () => {
    setLoading(true);
    try {
      const qs = token ? `?token=${encodeURIComponent(token)}` : "";
      const res = await fetch(`${API_URL}/api/escrow/direct/${txId}${qs}`);
      if (!res.ok) throw new Error((await res.json()).detail || "Not found");
      const data = await res.json();
      setTx(data);
    } catch (e: any) {
      setMsg("⚠️ " + (e?.message || "Kosa / Error"));
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [txId]);

  const respond = async (accepted: boolean, counter = false) => {
    setBusy(true); setMsg("");
    try {
      const body: any = { token, accepted, counter_offer: counter };
      if (counter) {
        body.counter_price = Number(counterPrice);
        body.note = counterNote || undefined;
      }
      const res = await fetch(`${API_URL}/api/escrow/direct/${txId}/buyer-response`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed");
      setMsg(
        data.status === "buyer_accepted" ? "✅ Umekubali. Taarifa za malipo zinakuja."
        : data.status === "buyer_countered" ? "✅ Pendekezo lako limetumwa kwa muuzaji."
        : "Umekataa ombi hili."
      );
      setMode("view");
      await load();
    } catch (e: any) {
      setMsg("⚠️ " + (e?.message || "Kosa"));
    } finally { setBusy(false); }
  };

  if (loading) {
    return <div style={{ minHeight: "100vh", background: C.surface, display: "flex", alignItems: "center", justifyContent: "center" }}><div style={{ color: C.muted, fontSize: 14 }}>Inapakia…</div></div>;
  }
  if (!tx || tx.view === "public") {
    return (
      <div style={{ minHeight: "100vh", background: C.surface, paddingTop: 80 }}>
        <div style={{ maxWidth: 440, margin: "0 auto", padding: "0 16px", textAlign: "center" }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>🔒</div>
          <h2 style={{ fontFamily: "Syne,sans-serif", color: C.ink, marginBottom: 6 }}>Kiungo hakitambuliki</h2>
          <p style={{ color: C.muted, fontSize: 13 }}>Hii link haina uthibitisho wa kisheria. Hakikisha umeitumia link uliyotumiwa na muuzaji.</p>
        </div>
      </div>
    );
  }

  const alreadyDone = ["buyer_accepted", "buyer_declined", "paid", "completed", "released"].includes(tx.status);
  const price = tx.price;
  const buyerFee = price * BUYER_FEE_PCT;
  const total = price + buyerFee;

  return (
    <div style={{ minHeight: "100vh", background: C.surface, paddingTop: 60, paddingBottom: 40 }}>
      <style>{`
        .do-input::placeholder{color:#B8B4A8;opacity:1}
        .do-input:focus{border-color:#F59E0B!important;box-shadow:0 0 0 3px rgba(245,158,11,0.15);outline:none}
      `}</style>
      <div style={{ maxWidth: 440, margin: "0 auto", padding: "0 16px" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.emerald, letterSpacing: "1px", marginBottom: 6 }}>🛡️ BIZ-SALAMA ESCROW</div>
          <h1 style={{ fontFamily: "Syne,sans-serif", fontSize: 22, fontWeight: 800, color: C.ink }}>Ombi la Ununuzi / Purchase Offer</h1>
        </div>

        {/* Item card */}
        <div style={{ background: "white", borderRadius: 14, padding: 16, marginBottom: 12, boxShadow: "0 1px 4px rgba(10,10,15,0.06)" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: "0.5px", marginBottom: 4 }}>KUTOKA KWA / FROM</div>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8, color: C.ink }}>{tx.seller_name}</div>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: "0.5px", marginBottom: 4 }}>BIDHAA / ITEM</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: C.gold, marginBottom: 2 }}>{tx.item_name}</div>
          {tx.notes && <div style={{ fontSize: 12, color: C.muted, fontStyle: "italic", marginTop: 6 }}>"{tx.notes}"</div>}
        </div>

        {/* Price breakdown */}
        <div style={{ background: C.emeraldPale, borderRadius: 14, padding: 16, marginBottom: 12, border: `1px solid ${C.emerald}33` }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.emerald, letterSpacing: "0.5px", marginBottom: 8 }}>UTALIPA / YOU PAY</div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: 13 }}><span style={{ color: C.muted }}>Bei / Price</span><span style={{ fontWeight: 700, color: C.ink }}>{fmt(price)}</span></div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: 12 }}><span style={{ color: C.muted }}>Escrow fee (3%)</span><span style={{ color: C.muted }}>{fmt(buyerFee)}</span></div>
          <div style={{ borderTop: `1px solid ${C.emerald}33`, paddingTop: 6, display: "flex", justifyContent: "space-between", fontFamily: "Syne,sans-serif", fontSize: 18, fontWeight: 800, color: C.ink }}><span>Jumla / Total</span><span>{fmt(total)}</span></div>
        </div>

        {/* Negotiation history */}
        {tx.negotiation_history && tx.negotiation_history.length > 1 && (
          <div style={{ background: "white", borderRadius: 14, padding: 14, marginBottom: 12, boxShadow: "0 1px 4px rgba(10,10,15,0.06)" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: "0.5px", marginBottom: 10 }}>💬 MAJADILIANO / NEGOTIATION</div>
            {tx.negotiation_history.map((h: any, i: number) => {
              const isSeller = h.by === "seller";
              const label = ({ opened: "Alifungua/Opened", counter: "Alipendekeza/Countered", accepted: "Alikubali/Accepted", rejected: "Alikataa/Declined" } as any)[h.action] || h.action;
              return (
                <div key={i} style={{ display: "flex", flexDirection: isSeller ? "row" : "row-reverse", marginBottom: i === tx.negotiation_history.length - 1 ? 0 : 8 }}>
                  <div style={{ flex: 1, background: isSeller ? "#FEF8EC" : "#EEF6FF", borderLeft: `3px solid ${isSeller ? C.gold : "#2563EB"}`, padding: 8, borderRadius: 8 }}>
                    <div style={{ fontSize: 9, fontWeight: 700, color: isSeller ? C.gold : "#2563EB", letterSpacing: "0.5px", marginBottom: 2, textTransform: "uppercase" }}>
                      {isSeller ? "Muuzaji / Seller" : "Wewe / You"} · {label}
                    </div>
                    {h.price != null && <div style={{ fontSize: 13, fontWeight: 800, fontFamily: "Syne,sans-serif", color: C.ink }}>{fmt(h.price)}</div>}
                    {h.note && <div style={{ fontSize: 10, color: C.muted, fontStyle: "italic", marginTop: 2 }}>"{h.note}"</div>}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {msg && <div style={{ padding: 10, background: msg.startsWith("✅") ? C.emeraldPale : C.rubyPale, color: msg.startsWith("✅") ? C.emerald : C.ruby, borderRadius: 10, fontSize: 13, marginBottom: 12 }}>{msg}</div>}

        {/* Action buttons */}
        {alreadyDone ? (
          <div style={{ background: "white", borderRadius: 14, padding: 20, textAlign: "center", boxShadow: "0 1px 4px rgba(10,10,15,0.06)" }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, letterSpacing: "0.5px", marginBottom: 4 }}>HALI / STATUS</div>
            <div style={{ fontFamily: "Syne,sans-serif", fontSize: 18, fontWeight: 800, color: C.ink, textTransform: "capitalize" }}>{tx.status.replace(/_/g, " ")}</div>
          </div>
        ) : mode === "view" ? (
          <div>
            <button
              onClick={() => respond(true, false)}
              disabled={busy}
              data-testid="direct-buyer-accept-btn"
              style={{ width: "100%", padding: 15, background: "linear-gradient(135deg, #10B981, #059669)", color: "white", border: "none", borderRadius: 13, fontFamily: "Syne,sans-serif", fontSize: 15, fontWeight: 800, cursor: "pointer", marginBottom: 10, boxShadow: "0 4px 14px rgba(16,185,129,0.3)" }}
            >
              ✅ Nakubali / Accept — {fmt(total)}
            </button>
            <button
              onClick={() => setMode("counter")}
              disabled={busy}
              data-testid="direct-buyer-counter-btn"
              style={{ width: "100%", padding: 13, background: "white", color: C.gold, border: `2px solid ${C.gold}`, borderRadius: 13, fontFamily: "Syne,sans-serif", fontSize: 14, fontWeight: 800, cursor: "pointer", marginBottom: 10 }}
            >
              💬 Pendekeza Bei Nyingine / Counter-Offer
            </button>
            <button
              onClick={() => respond(false, false)}
              disabled={busy}
              data-testid="direct-buyer-decline-btn"
              style={{ width: "100%", padding: 12, background: "transparent", color: C.ruby, border: "none", fontSize: 13, cursor: "pointer" }}
            >
              ❌ Kataa / Decline
            </button>
          </div>
        ) : (
          <div style={{ background: "white", borderRadius: 14, padding: 16, boxShadow: "0 1px 4px rgba(10,10,15,0.06)" }}>
            <div style={{ fontFamily: "Syne,sans-serif", fontSize: 14, fontWeight: 800, color: C.ink, marginBottom: 10 }}>💬 Pendekeza Bei Nyingine</div>
            <label style={{ fontSize: 11, fontWeight: 700, color: C.muted, display: "block", marginBottom: 4 }}>BEI UNAYOPENDEKEZA (TSh)</label>
            <input
              data-testid="direct-counter-price-input"
              className="do-input"
              value={counterPrice}
              onChange={(e) => setCounterPrice(e.target.value.replace(/\D/g, ""))}
              placeholder={String(price)}
              type="tel"
              inputMode="numeric"
              style={{ width: "100%", padding: "13px 14px", border: `1.5px solid ${C.surface3}`, borderRadius: 12, fontSize: 18, fontWeight: 800, fontFamily: "Syne,sans-serif", color: C.ink, marginBottom: 12 }}
            />
            <label style={{ fontSize: 11, fontWeight: 700, color: C.muted, display: "block", marginBottom: 4 }}>UJUMBE / NOTE (optional)</label>
            <input
              data-testid="direct-counter-note-input"
              className="do-input"
              value={counterNote}
              onChange={(e) => setCounterNote(e.target.value)}
              placeholder="Bei kubwa kidogo, nisaidie"
              style={{ width: "100%", padding: "12px 14px", border: `1.5px solid ${C.surface3}`, borderRadius: 12, fontSize: 13, color: C.ink, marginBottom: 12 }}
            />
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setMode("view")} style={{ flex: 1, padding: 12, background: "white", color: C.muted, border: `1.5px solid ${C.surface3}`, borderRadius: 12, fontSize: 13, cursor: "pointer" }}>Rudi</button>
              <button
                onClick={() => respond(false, true)}
                disabled={busy || !counterPrice || Number(counterPrice) <= 0}
                data-testid="direct-counter-send-btn"
                style={{ flex: 2, padding: 12, background: (counterPrice && Number(counterPrice) > 0) ? "linear-gradient(135deg, #F59E0B, #D97706)" : "#C8A96E", color: C.ink, border: "none", borderRadius: 12, fontFamily: "Syne,sans-serif", fontSize: 14, fontWeight: 800, cursor: "pointer" }}
              >
                📤 Tuma Pendekezo
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
