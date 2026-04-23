import React, { useState, useEffect } from "react";
import { C, fmtTSh, API_URL } from "./constants";

interface Props {
  txId: string;
  supplierPhone?: string;
  onClose?: () => void;
}

export default function SupplierConfirmationScreen({ txId, supplierPhone, onClose }: Props) {
  const [tx, setTx] = useState<any>({
    tx_id: txId,
    item: "Samsung Galaxy S24 Ultra",
    buyer_price: 1850000,
    supplier_cost: 1650000,
    hawker_name: "Amina Juma",
    hawker_phone: "+255712345678",
  });
  const [decision, setDecision] = useState<"accepted" | "declined" | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_URL}/api/escrow/verify/${txId}`);
        if (res.ok) {
          const data = await res.json();
          setTx({ ...tx, ...data });
        }
      } catch { /* use demo */ }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [txId]);

  const respond = async (accept: boolean) => {
    setLoading(true);
    try {
      await fetch(`${API_URL}/api/escrow/three-party/${txId}/supplier-response`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accepted: accept, supplier_phone: supplierPhone }),
      });
    } catch { /* offline fallback */ }
    setDecision(accept ? "accepted" : "declined");
    setLoading(false);
  };

  if (decision === "accepted")
    return (
      <div data-testid="supplier-confirm-accepted" style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 32, background: C.surface, fontFamily: "DM Sans,sans-serif" }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>✅</div>
        <div style={{ fontFamily: "Syne,sans-serif", fontSize: 22, fontWeight: 800, textAlign: "center", marginBottom: 8 }}>Umekubali! / Accepted!</div>
        <div style={{ fontSize: 13, color: C.muted, textAlign: "center", lineHeight: 1.6, marginBottom: 24, maxWidth: 360 }}>
          {tx.hawker_name} atakuja kuchukua bidhaa baada ya mnunuzi kulipa. Utapata M-Pesa ya {fmtTSh(tx.supplier_cost)} moja kwa moja baada ya utoaji.
          <br />
          <br />
          {tx.hawker_name} will come to collect after the buyer pays. You'll receive {fmtTSh(tx.supplier_cost)} directly to M-Pesa upon delivery.
        </div>
        <div style={{ background: C.emeraldPale, borderRadius: 13, padding: 16, width: "100%", maxWidth: 360, textAlign: "center" }}>
          <div style={{ fontFamily: "Syne,sans-serif", fontSize: 24, fontWeight: 800, color: C.emerald }}>{fmtTSh(tx.supplier_cost)}</div>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>Utapata M-Pesa · Your M-Pesa payout</div>
        </div>
      </div>
    );

  if (decision === "declined")
    return (
      <div data-testid="supplier-confirm-declined" style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 32, background: C.surface }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>📝</div>
        <div style={{ fontFamily: "Syne,sans-serif", fontSize: 18, fontWeight: 800, textAlign: "center", marginBottom: 8 }}>Imekataliwa / Declined</div>
        <div style={{ fontSize: 13, color: C.muted, textAlign: "center", lineHeight: 1.6, maxWidth: 360 }}>
          {tx.hawker_name} ataarifu mnunuzi. Hakuna hatua zaidi inahitajika kutoka kwako.
        </div>
      </div>
    );

  return (
    <div data-testid="supplier-confirm-screen" style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: C.surface, fontFamily: "DM Sans,sans-serif" }}>
      <div style={{ background: C.ink, padding: "32px 24px 20px", textAlign: "center", flexShrink: 0 }}>
        <div style={{ fontFamily: "Syne,sans-serif", fontSize: 22, fontWeight: 800, color: "white", marginBottom: 4 }}>
          Biz-<span style={{ color: C.gold }}>Salama</span>
        </div>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>Ombi la Kuidhinisha / Approval Request</div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "20px 16px" }}>
        <div style={{ background: "white", borderRadius: 16, padding: 18, marginBottom: 14, boxShadow: "0 2px 10px rgba(10,10,15,0.08)" }}>
          <div style={{ fontFamily: "Syne,sans-serif", fontSize: 14, fontWeight: 700, marginBottom: 14 }}>
            {tx.hawker_name} anataka kutoa bidhaa yako
          </div>
          {(
            [
              ["Bidhaa / Item", tx.item],
              ["Hawker", tx.hawker_name],
              ["Utakayopata / Your Payout", fmtTSh(tx.supplier_cost)],
              ["TX ID", tx.tx_id],
            ] as [string, string][]
          ).map(([l, v]) => (
            <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #F4F3EF", fontSize: 13 }}>
              <span style={{ color: C.muted }}>{l}</span>
              <span style={{ fontWeight: 700 }}>{v}</span>
            </div>
          ))}
        </div>

        <div style={{ background: C.emeraldPale, border: "1px solid rgba(26,122,90,0.15)", borderRadius: 13, padding: 14, marginBottom: 14 }}>
          <div style={{ fontFamily: "Syne,sans-serif", fontSize: 12, fontWeight: 700, color: C.emerald, marginBottom: 6 }}>🛡️ Hakikisho la Usalama</div>
          <div style={{ fontSize: 12, color: "rgba(10,10,15,0.6)", lineHeight: 1.6 }}>
            Pesa ya mnunuzi itashikwa escrow KABLA {tx.hawker_name} hajakuja kuchukua bidhaa. Utapata M-Pesa moja kwa moja baada ya bidhaa kuwasilishwa.
            <br />
            <br />
            Buyer's payment will be in escrow BEFORE {tx.hawker_name} comes to collect. You receive M-Pesa directly after delivery.
          </div>
        </div>
      </div>

      <div style={{ padding: "12px 16px 36px", background: C.ink, borderTop: "1px solid rgba(255,255,255,0.06)", flexShrink: 0 }}>
        <div style={{ display: "flex", gap: 10 }}>
          <button
            data-testid="supplier-accept-btn"
            onClick={() => respond(true)}
            disabled={loading}
            style={{ flex: 2, padding: 15, background: C.emerald, color: "white", border: "none", borderRadius: 13, fontFamily: "Syne,sans-serif", fontSize: 15, fontWeight: 800, cursor: "pointer", boxShadow: "0 4px 16px rgba(26,122,90,0.3)" }}
          >
            {loading ? "…" : "✅ NDIO — Ninakubali"}
          </button>
          <button
            data-testid="supplier-decline-btn"
            onClick={() => respond(false)}
            disabled={loading}
            style={{ flex: 1, padding: 15, background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.6)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 13, cursor: "pointer", fontFamily: "Syne,sans-serif", fontSize: 13, fontWeight: 700 }}
          >
            HAPANA
          </button>
        </div>
      </div>
    </div>
  );
}
