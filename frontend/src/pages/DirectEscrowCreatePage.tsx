import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { C } from "../components/three-party/constants";

const API_URL = process.env.REACT_APP_BACKEND_URL || "";

/** Seller-initiated direct escrow creator.
 *  Simpler sibling of the 3-Party wizard — no hawker, no supplier split.
 *  Flow: Seller enters item + price + buyer phone → signed link goes out via
 *  SMS/WhatsApp → buyer accepts/counters/declines → on accept, buyer pays.
 */
export default function DirectEscrowCreatePage() {
  const { isAuthenticated, user } = useAuthStore();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    item_name: "",
    price: "",
    buyer_phone: "",
    buyer_name: "",
    notes: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [err, setErr] = useState("");

  const BUYER_FEE_PCT = 0.03;

  const authHeaders = (): HeadersInit => {
    const token = (JSON.parse(localStorage.getItem("auth-storage") || "{}")?.state?.token) || "";
    return {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  };

  const fmt = (n: any) => `TSh ${Number(n || 0).toLocaleString()}`;

  const canSubmit = form.item_name.trim() && Number(form.price) > 0 && form.buyer_phone.replace(/\D/g, "").length >= 9;

  const submit = async () => {
    setErr("");
    if (!canSubmit) {
      setErr("Jaza taarifa zote / Fill in all required fields.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/api/escrow/direct/create`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          item_name: form.item_name.trim(),
          price: Number(form.price),
          buyer_phone: form.buyer_phone.trim(),
          buyer_name: form.buyer_name.trim() || undefined,
          notes: form.notes.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Kosa la kutengeneza / Failed to create");
      setResult(data);
    } catch (e: any) {
      setErr(e?.message || "Kosa la mtandao / Network error");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div style={{ minHeight: "100vh", background: C.surface, paddingTop: 100, textAlign: "center" }}>
        <p style={{ color: C.ink, marginBottom: 16 }}>Lazima uingie kwanza / Please sign in first</p>
        <Link to="/login" style={{ color: C.gold, fontWeight: 700 }}>Ingia / Sign In →</Link>
      </div>
    );
  }

  if (result) {
    return (
      <div style={{ minHeight: "100vh", background: C.surface, paddingTop: 80, paddingBottom: 40 }}>
        <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}`}</style>
        <div style={{ maxWidth: 440, margin: "0 auto", padding: "0 16px", animation: "fadeUp 0.4s ease-out" }}>
          <div style={{ background: "white", borderRadius: 18, padding: 24, boxShadow: "0 4px 20px rgba(10,10,15,0.08)", border: `2px solid ${C.emerald}40` }}>
            <div style={{ fontSize: 40, textAlign: "center", marginBottom: 8 }}>✅</div>
            <h2 style={{ fontFamily: "Syne,sans-serif", fontSize: 20, fontWeight: 800, color: C.ink, textAlign: "center", marginBottom: 6 }}>
              Ombi limetumwa / Proposal sent!
            </h2>
            <p style={{ fontSize: 13, color: C.muted, textAlign: "center", marginBottom: 18 }}>
              Tuma kiungo hiki kwa mnunuzi ili akubali au apendekeze bei nyingine.
            </p>

            <div style={{ background: C.emeraldPale, borderRadius: 12, padding: 12, marginBottom: 14 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: C.emerald, letterSpacing: "0.5px", marginBottom: 4 }}>
                TX {result.tx_id}
              </div>
              <div style={{ fontSize: 12, color: C.ink, marginBottom: 6 }}>Kiungo cha Mnunuzi / Buyer Link:</div>
              <div style={{ fontSize: 11, color: C.muted, fontFamily: "monospace", wordBreak: "break-all", padding: 8, background: "white", borderRadius: 8 }}>
                {result.buyer_offer_url}
              </div>
            </div>

            <a
              href={result.whatsapp_share_url}
              target="_blank"
              rel="noreferrer"
              data-testid="direct-whatsapp-share-btn"
              style={{
                display: "block",
                textAlign: "center",
                width: "100%",
                padding: 14,
                background: "#25D366",
                color: "white",
                textDecoration: "none",
                borderRadius: 12,
                fontFamily: "Syne,sans-serif",
                fontWeight: 800,
                fontSize: 15,
                marginBottom: 10,
                boxShadow: "0 4px 14px rgba(37,211,102,0.3)",
              }}
            >
              📱 Tuma WhatsApp / Send on WhatsApp
            </a>
            <button
              onClick={() => { navigator.clipboard.writeText(result.buyer_offer_url); }}
              data-testid="direct-copy-link-btn"
              style={{ width: "100%", padding: 12, background: "white", color: C.ink, border: `1.5px solid ${C.surface3}`, borderRadius: 12, fontFamily: "Syne,sans-serif", fontWeight: 700, fontSize: 13, cursor: "pointer", marginBottom: 14 }}
            >
              📋 Nakili Kiungo / Copy Link
            </button>

            <button onClick={() => navigate("/dashboard")} style={{ width: "100%", padding: 12, background: "transparent", color: C.muted, border: "none", fontSize: 13, cursor: "pointer" }}>
              ← Rudi Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: C.surface, paddingTop: 80, paddingBottom: 40 }}>
      <style>{`
        .d2p-input::placeholder{color:#B8B4A8;opacity:1;font-weight:400;}
        .d2p-input:focus{border-color:#F59E0B!important;box-shadow:0 0 0 3px rgba(245,158,11,0.15);}
      `}</style>
      <div style={{ maxWidth: 440, margin: "0 auto", padding: "0 16px" }}>
        <Link to="/dashboard" style={{ fontSize: 13, color: C.muted, textDecoration: "none", marginBottom: 12, display: "inline-block" }}>← Dashboard</Link>

        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.gold, letterSpacing: "1px", marginBottom: 6 }}>
            DIRECT ESCROW · 2-PARTY · NO MIDDLEMAN
          </div>
          <h1 style={{ fontFamily: "Syne,sans-serif", fontSize: 24, fontWeight: 800, color: C.ink, marginBottom: 4 }}>
            Tuma ombi kwa mnunuzi
          </h1>
          <p style={{ fontSize: 13, color: C.muted }}>
            Send a buyer a secure escrow proposal. They can accept, counter, or decline. Funds are held safely until they confirm delivery.
          </p>
        </div>

        <div style={{ background: "white", borderRadius: 16, padding: 20, boxShadow: "0 1px 4px rgba(10,10,15,0.06)", marginBottom: 16 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: "0.5px", display: "block", marginBottom: 5 }}>
            JINA LA BIDHAA / ITEM NAME *
          </label>
          <input
            data-testid="direct-item-input"
            className="d2p-input"
            value={form.item_name}
            onChange={(e) => setForm((f) => ({ ...f, item_name: e.target.value }))}
            placeholder="MacBook Air M3 2024"
            style={{ width: "100%", padding: "13px 14px", border: `1.5px solid ${C.surface3}`, borderRadius: 12, fontSize: 14, outline: "none", marginBottom: 14, color: C.ink }}
          />

          <label style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: "0.5px", display: "block", marginBottom: 5 }}>
            BEI / PRICE (TSh) *
          </label>
          <div style={{ position: "relative", marginBottom: 14 }}>
            <div style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: 12, fontWeight: 700, color: C.muted }}>TSh</div>
            <input
              data-testid="direct-price-input"
              className="d2p-input"
              value={form.price}
              onChange={(e) => setForm((f) => ({ ...f, price: e.target.value.replace(/\D/g, "") }))}
              placeholder="2,800,000"
              type="tel"
              inputMode="numeric"
              style={{ width: "100%", padding: "13px 14px 13px 44px", border: `1.5px solid ${C.surface3}`, borderRadius: 12, fontSize: 18, fontWeight: 800, fontFamily: "Syne,sans-serif", outline: "none", color: C.ink }}
            />
          </div>

          <label style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: "0.5px", display: "block", marginBottom: 5 }}>
            SIMU YA MNUNUZI / BUYER PHONE *
          </label>
          <div style={{ display: "flex", border: `1.5px solid ${C.surface3}`, borderRadius: 12, overflow: "hidden", background: "white", marginBottom: 14 }}>
            <div style={{ padding: "13px 12px", background: C.surface2, color: C.muted, fontSize: 13, fontWeight: 700 }}>🇹🇿 +255</div>
            <input
              data-testid="direct-buyer-phone-input"
              className="d2p-input"
              value={form.buyer_phone}
              onChange={(e) => setForm((f) => ({ ...f, buyer_phone: e.target.value }))}
              placeholder="7XX XXX XXX"
              type="tel"
              inputMode="numeric"
              style={{ flex: 1, padding: "13px 12px", border: "none", outline: "none", fontSize: 15, background: "white", fontFamily: "monospace", color: C.ink }}
            />
          </div>

          <label style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: "0.5px", display: "block", marginBottom: 5 }}>
            JINA LA MNUNUZI / BUYER NAME (optional)
          </label>
          <input
            data-testid="direct-buyer-name-input"
            className="d2p-input"
            value={form.buyer_name}
            onChange={(e) => setForm((f) => ({ ...f, buyer_name: e.target.value }))}
            placeholder="Juma Hassan"
            style={{ width: "100%", padding: "13px 14px", border: `1.5px solid ${C.surface3}`, borderRadius: 12, fontSize: 14, outline: "none", marginBottom: 14, color: C.ink }}
          />

          <label style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: "0.5px", display: "block", marginBottom: 5 }}>
            MAELEZO / NOTES (optional)
          </label>
          <textarea
            data-testid="direct-notes-input"
            className="d2p-input"
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            placeholder="Warranty ya mwaka mmoja, delivery Dar es Salaam"
            rows={3}
            style={{ width: "100%", padding: "13px 14px", border: `1.5px solid ${C.surface3}`, borderRadius: 12, fontSize: 13, outline: "none", resize: "none", fontFamily: "DM Sans,sans-serif", color: C.ink }}
          />
        </div>

        {form.price && (
          <div style={{ background: C.emeraldPale, borderRadius: 12, padding: 14, marginBottom: 16, border: `1px solid ${C.emerald}33` }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.emerald, letterSpacing: "0.5px", marginBottom: 6 }}>MNUNUZI ATALIPA / BUYER WILL PAY</div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: C.muted, marginBottom: 4 }}>
              <span>Bei / Price</span>
              <span style={{ fontWeight: 700, color: C.ink }}>{fmt(form.price)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: C.muted, marginBottom: 4 }}>
              <span>Escrow fee (3%)</span>
              <span>{fmt(Number(form.price) * BUYER_FEE_PCT)}</span>
            </div>
            <div style={{ borderTop: `1px solid ${C.emerald}33`, paddingTop: 6, display: "flex", justifyContent: "space-between", fontFamily: "Syne,sans-serif", fontSize: 16, fontWeight: 800, color: C.ink }}>
              <span>Jumla / Total</span>
              <span>{fmt(Number(form.price) * (1 + BUYER_FEE_PCT))}</span>
            </div>
            <div style={{ fontSize: 11, color: C.muted, marginTop: 8, fontStyle: "italic" }}>
              Wewe utapokea <strong style={{ color: C.ink }}>{fmt(form.price)}</strong> kikamilifu baada ya mnunuzi kuthibitisha kupokea bidhaa.
            </div>
          </div>
        )}

        {err && <div style={{ background: C.rubyPale, color: C.ruby, padding: 10, borderRadius: 10, fontSize: 13, marginBottom: 12 }}>{err}</div>}

        <button
          onClick={submit}
          disabled={!canSubmit || submitting}
          data-testid="direct-submit-btn"
          style={{
            width: "100%",
            padding: 15,
            background: canSubmit ? "linear-gradient(135deg, #F59E0B, #D97706)" : "#C8A96E",
            color: C.ink,
            border: "none",
            borderRadius: 13,
            fontFamily: "Syne,sans-serif",
            fontSize: 15,
            fontWeight: 800,
            cursor: canSubmit ? "pointer" : "not-allowed",
            boxShadow: canSubmit ? "0 4px 14px rgba(245,158,11,0.3)" : "none",
            opacity: submitting ? 0.6 : 1,
          }}
        >
          {submitting ? "Inatuma…" : "📤 Tuma Ombi / Send Proposal →"}
        </button>
      </div>
    </div>
  );
}
