import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import SEO from "../components/SEO";
import { useAuthStore } from "../store/authStore";
import { C, fmtTSh, API_URL, authHeaders } from "../components/three-party/constants";

/**
 * Hawker's edit view — typically reached after the supplier counter-offers.
 * Pre-fills form with current tx values; on save calls /api/escrow/three-party/{tx_id}/edit
 * which resets status to pending_approval and regenerates the supplier verify URL.
 */
export default function HawkerTxEditPage() {
  const { txId } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const [tx, setTx] = useState<any>(null);
  const [buyerPrice, setBuyerPrice] = useState("");
  const [supplierCost, setSupplierCost] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_URL}/api/escrow/three-party/${txId}`, { headers: authHeaders() });
        if (res.ok) {
          const data = await res.json();
          setTx(data);
          setBuyerPrice(String(data.buyer_price || ""));
          setSupplierCost(String(data.supplier_cost || ""));
        }
      } catch { /* ignore */ }
    })();
  }, [txId]);

  if (!isAuthenticated) {
    return (
      <div style={{ minHeight: "100vh", paddingTop: 90, textAlign: "center", color: "white", background: C.ink }}>
        <SEO title="Sign In Required" url={`/hawker/edit/${txId}`} noindex />
        <h2 style={{ fontFamily: "Syne,sans-serif", fontSize: 22 }}>Tafadhali ingia kwanza / Please sign in</h2>
        <button onClick={() => navigate("/login")} style={{ marginTop: 18, padding: "12px 28px", background: C.gold, color: C.ink, border: "none", borderRadius: 12, fontWeight: 800, cursor: "pointer" }}>Ingia / Sign In</button>
      </div>
    );
  }

  const bp = Number(buyerPrice) || 0;
  const sc = Number(supplierCost) || 0;
  const supplyFee = Math.round(sc * 0.02);
  const buyerFee = Math.round(bp * 0.03);
  const supplierPayout = sc - supplyFee;
  const commission = bp && sc ? bp - sc - buyerFee : 0;
  const platformFee = supplyFee + buyerFee;

  const submit = async () => {
    if (!bp || !sc || sc >= bp) { setMsg("Bei si sahihi"); return; }
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/api/escrow/three-party/${txId}/edit`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ buyer_price: bp, supplier_cost: sc }),
      });
      if (res.ok) {
        setMsg("✅ Imehifadhiwa! Mmiliki atapata ombi jipya.");
        setTimeout(() => navigate("/dashboard"), 1500);
      } else {
        setMsg("⚠️ Kosa, jaribu tena");
      }
    } catch {
      setMsg("⚠️ Mtandao hauhusi");
    } finally {
      setSaving(false);
    }
  };

  if (!tx) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "white", background: C.ink }}>
      <div>Inasoma… / Loading…</div>
    </div>
  );

  const isCounter = tx.status === "counter_offered";

  return (
    <div data-testid="hawker-edit-page" style={{ minHeight: "100vh", background: C.surface, fontFamily: "DM Sans,sans-serif" }}>
      <SEO title="Edit Three-Party Transaction" url={`/hawker/edit/${txId}`} noindex />
      <div style={{ background: C.ink, padding: "14px 20px 16px", display: "flex", alignItems: "center", gap: 12 }}>
        <button onClick={() => navigate("/dashboard")} style={{ width: 36, height: 36, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.07)", color: "white", cursor: "pointer", fontSize: 16 }}>←</button>
        <div>
          <div style={{ color: "white", fontFamily: "Syne,sans-serif", fontSize: 14, fontWeight: 700 }}>Hariri Muamala / Edit Transaction</div>
          <div style={{ color: "rgba(255,255,255,0.42)", fontSize: 11, marginTop: 1 }}>{tx.tx_id} · {tx.item_name}</div>
        </div>
      </div>

      <div style={{ padding: 18, maxWidth: 520, margin: "0 auto" }}>
        {isCounter && (
          <div data-testid="counter-offer-banner" style={{ background: "#FEF8EC", border: "1px solid rgba(212,133,10,0.3)", borderRadius: 12, padding: 14, marginBottom: 14 }}>
            <div style={{ fontFamily: "Syne,sans-serif", fontSize: 12, fontWeight: 700, color: "#D4850A", marginBottom: 4 }}>
              💬 Pendekezo Jipya kutoka kwa Mmiliki
            </div>
            <div style={{ fontSize: 13, color: C.ink, marginBottom: 4 }}>
              Mmiliki ameomba <strong>{fmtTSh(tx.supplier_cost)}</strong> badala ya kile ulichopendekeza.
            </div>
            {tx.counter_note && <div style={{ fontSize: 12, color: C.muted, fontStyle: "italic" }}>"{tx.counter_note}"</div>}
            <div style={{ fontSize: 11, color: C.muted, marginTop: 6 }}>
              Ukikubali pendekezo lake, bonyeza "Hifadhi" hapa chini. Ukitaka kubadilisha bei ya mnunuzi pia, irekebishe kisha hifadhi.
            </div>
          </div>
        )}

        <div style={{ background: "white", borderRadius: 14, padding: 18, marginBottom: 14, boxShadow: "0 1px 4px rgba(10,10,15,0.06)" }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: C.muted, fontFamily: "Syne,sans-serif", letterSpacing: "0.5px" }}>BEI YA MNUNUZI / BUYER PRICE *</label>
          <div style={{ position: "relative", marginTop: 5, marginBottom: 14 }}>
            <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 12, color: C.muted, fontWeight: 700 }}>TSh</span>
            <input data-testid="edit-buyer-price" type="tel" inputMode="numeric" value={buyerPrice} onChange={e => setBuyerPrice(e.target.value.replace(/\D/g, ""))} style={{ width: "100%", padding: "12px 14px 12px 44px", border: `1.5px solid ${C.surface3}`, borderRadius: 12, fontSize: 18, fontFamily: "Syne,sans-serif", fontWeight: 800, outline: "none" }} />
          </div>
          <label style={{ fontSize: 11, fontWeight: 700, color: C.muted, fontFamily: "Syne,sans-serif", letterSpacing: "0.5px" }}>BEI YA MMILIKI / SUPPLIER COST *</label>
          <div style={{ position: "relative", marginTop: 5 }}>
            <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 12, color: C.muted, fontWeight: 700 }}>TSh</span>
            <input data-testid="edit-supplier-cost" type="tel" inputMode="numeric" value={supplierCost} onChange={e => setSupplierCost(e.target.value.replace(/\D/g, ""))} style={{ width: "100%", padding: "12px 14px 12px 44px", border: `1.5px solid ${sc >= bp ? C.ruby : C.surface3}`, borderRadius: 12, fontSize: 18, fontFamily: "Syne,sans-serif", fontWeight: 800, outline: "none" }} />
          </div>
        </div>

        {bp > 0 && sc > 0 && sc < bp && (
          <div style={{ background: "white", borderRadius: 14, padding: 16, marginBottom: 14, boxShadow: "0 1px 4px rgba(10,10,15,0.06)" }}>
            <div style={{ fontFamily: "Syne,sans-serif", fontSize: 12, fontWeight: 700, marginBottom: 10 }}>Mgawanyo Mpya / New Split</div>
            {[
              ["Mnunuzi Analipa", fmtTSh(bp), C.ink],
              ["💰 Mmiliki (payout)", fmtTSh(supplierPayout), C.emerald],
              ["🧑‍💼 Faida Yako", fmtTSh(commission), C.gold],
              ["🏛 Ada (2% + 3%)", fmtTSh(platformFee), C.muted],
            ].map(([l, v, col]) => (
              <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid #F4F3EF", fontSize: 13 }}>
                <span style={{ color: C.muted }}>{l}</span>
                <span style={{ fontWeight: 700, color: col }}>{v}</span>
              </div>
            ))}
          </div>
        )}

        {msg && (
          <div style={{ padding: 10, borderRadius: 10, marginBottom: 10, background: msg.startsWith("✅") ? C.emeraldPale : C.rubyPale, color: msg.startsWith("✅") ? C.emerald : C.ruby, fontWeight: 700, fontSize: 13, textAlign: "center" }}>
            {msg}
          </div>
        )}

        <button
          data-testid="edit-save-btn"
          onClick={submit}
          disabled={saving || !bp || !sc || sc >= bp}
          style={{ width: "100%", padding: 15, background: (saving || !bp || !sc || sc >= bp) ? "rgba(200,169,110,0.5)" : C.gold, color: C.ink, border: "none", borderRadius: 13, fontFamily: "Syne,sans-serif", fontSize: 15, fontWeight: 800, cursor: "pointer" }}
        >
          {saving ? "Inahifadhi…" : "📤 Hifadhi na Tuma kwa Mmiliki / Save & Resubmit"}
        </button>
      </div>
    </div>
  );
}
