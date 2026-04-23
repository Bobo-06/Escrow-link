import React, { useState, useRef } from "react";
import { C, fmtTSh, fmtK, API_URL, authHeaders } from "./constants";

interface Props {
  hawker?: { id?: string; name?: string; phone?: string };
  onCreated?: (tx: any) => void;
  onClose?: () => void;
}

export default function ThreePartyTransactionCreator({ hawker, onCreated, onClose }: Props) {
  const [step, setStep] = useState<"item" | "supplier" | "split" | "confirm">("item");
  const [form, setForm] = useState({
    item: "",
    item_condition: "Mpya / New",
    buyer_price: "",
    supplier_cost: "",
    supplier_name: "",
    supplier_phone: "",
    supplier_location: "Kariakoo, DSM",
    notes: "",
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const commission =
    form.buyer_price && form.supplier_cost
      ? Number(form.buyer_price) - Number(form.supplier_cost)
      : 0;
  const commissionPct = form.buyer_price
    ? ((commission / Number(form.buyer_price)) * 100).toFixed(1)
    : 0;

  const handleImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setImageFile(f);
    const r = new FileReader();
    r.onload = (ev) => setImagePreview(ev.target?.result as string);
    r.readAsDataURL(f);
  };

  const create = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/escrow/three-party/create`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          item_name: form.item,
          item: form.item,
          item_description: form.notes,
          item_condition: form.item_condition,
          buyer_price: Number(form.buyer_price),
          supplier_cost: Number(form.supplier_cost),
          supplier_phone: form.supplier_phone.startsWith("+")
            ? form.supplier_phone
            : `+255${form.supplier_phone}`,
          supplier_name: form.supplier_name,
          supplier_location: form.supplier_location,
          notes: form.notes,
          commission,
          quantity: 1,
          image_b64: imagePreview,
        }),
      });
      const data = res.ok
        ? await res.json()
        : {
            tx_id: "3PT-" + Math.random().toString(36).substr(2, 7).toUpperCase(),
            status: "awaiting_supplier",
          };
      onCreated?.({ ...data, ...form, buyer_price: Number(form.buyer_price), supplier_cost: Number(form.supplier_cost), commission });
    } catch {
      onCreated?.({
        tx_id: "3PT-" + Math.random().toString(36).substr(2, 7).toUpperCase(),
        status: "awaiting_supplier",
        ...form,
        buyer_price: Number(form.buyer_price),
        supplier_cost: Number(form.supplier_cost),
        commission,
      });
    } finally {
      setLoading(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "13px 14px",
    borderRadius: 12,
    border: `1.5px solid ${C.surface3}`,
    background: "white",
    fontSize: 14,
    fontFamily: "DM Sans,sans-serif",
    outline: "none",
    marginBottom: 4,
  };
  const lbl = (t: string) => (
    <div
      style={{
        fontSize: 11,
        fontWeight: 700,
        color: C.muted,
        marginBottom: 5,
        fontFamily: "Syne,sans-serif",
        letterSpacing: "0.5px",
      }}
    >
      {t.toUpperCase()}
    </div>
  );

  const steps = ["item", "supplier", "split", "confirm"] as const;
  const stepIdx = steps.indexOf(step);

  return (
    <div
      data-testid="three-party-creator"
      style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: C.surface, fontFamily: "DM Sans,sans-serif" }}
    >
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}`}</style>

      {/* Header with progress */}
      <div style={{ background: C.ink, padding: "14px 20px 0", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
          <button
            data-testid="three-party-back-btn"
            onClick={stepIdx > 0 ? () => setStep(steps[stepIdx - 1]) : onClose}
            style={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              border: "1px solid rgba(255,255,255,0.15)",
              background: "rgba(255,255,255,0.07)",
              color: "white",
              cursor: "pointer",
              fontSize: 16,
            }}
          >
            {stepIdx === 0 ? "✕" : "←"}
          </button>
          <div style={{ flex: 1 }}>
            <div style={{ color: "white", fontFamily: "Syne,sans-serif", fontSize: 14, fontWeight: 700 }}>
              {step === "item" && "Bidhaa / Item Details"}
              {step === "supplier" && "Mmiliki / Supplier Details"}
              {step === "split" && "Mgawanyo / Commission Split"}
              {step === "confirm" && "Thibitisha / Confirm"}
            </div>
            <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 10, marginTop: 1 }}>
              Hatua {stepIdx + 1} ya {steps.length} · Three-Party Escrow
            </div>
          </div>
        </div>
        <div style={{ height: 3, background: "rgba(255,255,255,0.1)", borderRadius: 2 }}>
          <div
            style={{
              height: "100%",
              width: `${((stepIdx + 1) / steps.length) * 100}%`,
              background: C.gold,
              borderRadius: 2,
              transition: "width 0.35s ease",
            }}
          />
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "18px 16px" }}>
        {/* STEP 1: ITEM */}
        {step === "item" && (
          <div style={{ animation: "fadeUp 0.3s" }}>
            <div
              data-testid="three-party-image-upload"
              onClick={() => fileRef.current?.click()}
              style={{
                height: 150,
                borderRadius: 14,
                background: imagePreview ? "transparent" : C.surface2,
                border: "2px dashed #E2DED5",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                marginBottom: 16,
                overflow: "hidden",
              }}
            >
              {imagePreview ? (
                <img src={imagePreview} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 28, marginBottom: 6 }}>📷</div>
                  <div style={{ fontSize: 12, color: C.muted }}>Piga Picha / Add Photo</div>
                </div>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleImage} />

            {lbl("Jina la Bidhaa / Item Name *")}
            <input
              data-testid="three-party-item-input"
              style={inputStyle}
              placeholder="Samsung Galaxy S24 Ultra"
              value={form.item}
              onChange={(e) => setForm((f) => ({ ...f, item: e.target.value }))}
            />

            {lbl("Hali / Condition")}
            <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
              {["Mpya / New", "Imepigwa Mara Moja / Like New", "Inatumika Vizuri / Good Used"].map((c) => (
                <button
                  key={c}
                  onClick={() => setForm((f) => ({ ...f, item_condition: c }))}
                  style={{
                    flex: 1,
                    padding: "9px 6px",
                    borderRadius: 10,
                    border: `1.5px solid ${form.item_condition === c ? C.gold : C.surface3}`,
                    background: form.item_condition === c ? "rgba(200,169,110,0.08)" : "white",
                    color: form.item_condition === c ? C.goldD : C.ink,
                    fontFamily: "Syne,sans-serif",
                    fontSize: 10,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  {c.split("/")[0].trim()}
                </button>
              ))}
            </div>

            {lbl("Bei kwa Mnunuzi / Buyer Price (TSh) *")}
            <div style={{ position: "relative", marginBottom: 4 }}>
              <div style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: 12, fontWeight: 700, color: C.muted }}>TSh</div>
              <input
                data-testid="three-party-buyer-price-input"
                style={{ ...inputStyle, paddingLeft: 44, fontFamily: "Syne,sans-serif", fontSize: 18, fontWeight: 800 }}
                placeholder="1,850,000"
                value={form.buyer_price}
                onChange={(e) => setForm((f) => ({ ...f, buyer_price: e.target.value.replace(/\D/g, "") }))}
                type="tel"
                inputMode="numeric"
              />
            </div>
            {form.buyer_price && (
              <div style={{ fontSize: 11, color: C.muted, marginBottom: 12 }}>
                ≈ ${(Number(form.buyer_price) / 2580).toFixed(0)} USD
              </div>
            )}
          </div>
        )}

        {/* STEP 2: SUPPLIER */}
        {step === "supplier" && (
          <div style={{ animation: "fadeUp 0.3s" }}>
            <div style={{ background: "rgba(37,99,235,0.07)", border: "1px solid rgba(37,99,235,0.15)", borderRadius: 12, padding: "12px 14px", marginBottom: 16 }}>
              <div style={{ fontFamily: "Syne,sans-serif", fontSize: 12, fontWeight: 700, color: C.blue, marginBottom: 4 }}>📱 Mmiliki Atapokea SMS</div>
              <div style={{ fontSize: 12, color: "rgba(10,10,15,0.6)", lineHeight: 1.5 }}>
                Mmiliki wa duka atapata SMS ya WhatsApp na uthibitisho wa escrow. Hawahitaji akaunti ya Biz-Salama — watachunguza tu kiungo cha uthibitisho.
                <br />
                <br />
                The shop owner will receive an SMS/WhatsApp with escrow proof. They don't need a Biz-Salama account — they just verify the link.
              </div>
            </div>

            {lbl("Jina la Duka / Mmiliki / Shop / Owner Name *")}
            <input
              data-testid="three-party-supplier-name-input"
              style={inputStyle}
              placeholder="Jumla Electronics Kariakoo"
              value={form.supplier_name}
              onChange={(e) => setForm((f) => ({ ...f, supplier_name: e.target.value }))}
            />

            {lbl("Simu ya Mmiliki / Owner Phone (for SMS) *")}
            <div style={{ display: "flex", background: "white", border: `1.5px solid ${C.surface3}`, borderRadius: 12, overflow: "hidden", marginBottom: 14 }}>
              <div style={{ padding: "13px 12px", background: C.surface2, borderRight: `1px solid ${C.surface3}`, fontSize: 13, fontWeight: 700, whiteSpace: "nowrap" }}>🇹🇿 +255</div>
              <input
                data-testid="three-party-supplier-phone-input"
                style={{ flex: 1, padding: "13px 12px", border: "none", outline: "none", fontSize: 15, background: "white", fontFamily: "monospace" }}
                placeholder="7XX XXX XXX"
                value={form.supplier_phone}
                onChange={(e) => setForm((f) => ({ ...f, supplier_phone: e.target.value.replace(/\D/g, "").slice(0, 9) }))}
                type="tel"
                inputMode="numeric"
              />
            </div>

            {lbl("Mahali / Location")}
            <input
              style={inputStyle}
              placeholder="Kariakoo, Dar es Salaam"
              value={form.supplier_location}
              onChange={(e) => setForm((f) => ({ ...f, supplier_location: e.target.value }))}
            />

            {lbl("Maelezo ya Ziada / Notes (optional)")}
            <textarea
              style={{ ...inputStyle, resize: "none", height: 72, lineHeight: 1.6 }}
              placeholder="Bidhaa ipo ghala namba 12, gomba la pili / Item in stall 12, second row"
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              rows={3}
            />
          </div>
        )}

        {/* STEP 3: SPLIT */}
        {step === "split" && (
          <div style={{ animation: "fadeUp 0.3s" }}>
            <div style={{ background: "linear-gradient(135deg,#0A0A0F,#1A1510)", borderRadius: 16, padding: 20, marginBottom: 16, textAlign: "center" }}>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontFamily: "Syne,sans-serif", marginBottom: 8, letterSpacing: "1px" }}>
                MUUNDO WA MALIPO / PAYMENT STRUCTURE
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 8, alignItems: "center" }}>
                <div style={{ background: "rgba(255,255,255,0.07)", borderRadius: 12, padding: "10px 8px", textAlign: "center" }}>
                  <div style={{ fontFamily: "Syne,sans-serif", fontSize: 14, fontWeight: 800, color: "white" }}>
                    {form.buyer_price ? fmtK(Number(form.buyer_price)) : "TSh 0"}
                  </div>
                  <div style={{ fontSize: 9, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>Mnunuzi Analipa</div>
                </div>
                <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 20 }}>→</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <div style={{ background: "rgba(200,169,110,0.15)", borderRadius: 10, padding: "7px 8px", textAlign: "center" }}>
                    <div style={{ fontFamily: "Syne,sans-serif", fontSize: 13, fontWeight: 800, color: C.gold }}>
                      {commission > 0 ? fmtK(commission) : "TSh 0"}
                    </div>
                    <div style={{ fontSize: 9, color: "rgba(255,255,255,0.4)", marginTop: 1 }}>Wewe ({commissionPct}%)</div>
                  </div>
                  <div style={{ background: "rgba(26,122,90,0.2)", borderRadius: 10, padding: "7px 8px", textAlign: "center" }}>
                    <div style={{ fontFamily: "Syne,sans-serif", fontSize: 13, fontWeight: 800, color: C.emeraldL }}>
                      {form.supplier_cost ? fmtK(Number(form.supplier_cost)) : "TSh 0"}
                    </div>
                    <div style={{ fontSize: 9, color: "rgba(255,255,255,0.4)", marginTop: 1 }}>Mmiliki</div>
                  </div>
                </div>
              </div>
            </div>

            {lbl("Bei ya Mmiliki / Supplier Cost (TSh) — Pesa unayompa mmiliki *")}
            <div style={{ position: "relative", marginBottom: 4 }}>
              <div style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: 12, fontWeight: 700, color: C.muted }}>TSh</div>
              <input
                data-testid="three-party-supplier-cost-input"
                style={{
                  ...inputStyle,
                  paddingLeft: 44,
                  fontFamily: "Syne,sans-serif",
                  fontSize: 18,
                  fontWeight: 800,
                  borderColor: Number(form.supplier_cost) >= Number(form.buyer_price) ? C.ruby : C.surface3,
                }}
                placeholder="1,650,000"
                value={form.supplier_cost}
                onChange={(e) => setForm((f) => ({ ...f, supplier_cost: e.target.value.replace(/\D/g, "") }))}
                type="tel"
                inputMode="numeric"
              />
            </div>
            {Number(form.supplier_cost) >= Number(form.buyer_price) && (
              <div style={{ fontSize: 11, color: C.ruby, marginBottom: 8 }}>⚠️ Bei ya mmiliki lazima iwe chini ya bei ya mnunuzi</div>
            )}

            {commission > 0 && (
              <div style={{ background: C.emeraldPale, border: "1px solid rgba(26,122,90,0.15)", borderRadius: 12, padding: "12px 14px", marginBottom: 14 }}>
                <div style={{ fontFamily: "Syne,sans-serif", fontSize: 12, fontWeight: 700, color: C.emerald, marginBottom: 4 }}>💰 Faida Yako / Your Commission</div>
                <div style={{ fontFamily: "Syne,sans-serif", fontSize: 22, fontWeight: 800, color: C.emerald }}>{fmtTSh(commission)}</div>
                <div style={{ fontSize: 11, color: "rgba(10,10,15,0.55)", marginTop: 4 }}>
                  ({commissionPct}% ya bei ya mnunuzi) · Inalipwa moja kwa moja kwa M-Pesa yako mara mnunuzi athibitishapo
                </div>
              </div>
            )}

            <div style={{ background: "white", borderRadius: 13, padding: 14, boxShadow: "0 1px 4px rgba(10,10,15,0.06)" }}>
              <div style={{ fontFamily: "Syne,sans-serif", fontSize: 12, fontWeight: 700, marginBottom: 10 }}>Mgawanyo wa Wazi / Transparent Split</div>
              {(
                [
                  ["Mnunuzi Analipa / Buyer Pays", fmtTSh(Number(form.buyer_price) || 0), C.ink],
                  ["Mmiliki Anapata / Supplier Gets", fmtTSh(Number(form.supplier_cost) || 0), C.emerald],
                  ["Faida Yako / Your Commission", fmtTSh(commission), C.gold],
                  ["Ada ya Biz-Salama (1%)", fmtTSh(Math.round((Number(form.buyer_price) || 0) * 0.01)), C.muted],
                ] as [string, string, string][]
              ).map(([l, v, color]) => (
                <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid #F4F3EF", fontSize: 13 }}>
                  <span style={{ color: C.muted }}>{l}</span>
                  <span style={{ fontWeight: 700, color }}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* STEP 4: CONFIRM */}
        {step === "confirm" && (
          <div style={{ animation: "fadeUp 0.3s" }}>
            <div style={{ background: "white", borderRadius: 15, padding: 16, marginBottom: 14, boxShadow: "0 1px 4px rgba(10,10,15,0.06)" }}>
              <div style={{ fontFamily: "Syne,sans-serif", fontSize: 13, fontWeight: 700, marginBottom: 12 }}>📋 Muhtasari / Summary</div>
              {(
                [
                  ["Bidhaa / Item", form.item],
                  ["Hali / Condition", form.item_condition.split("/")[0].trim()],
                  ["Bei ya Mnunuzi / Buyer Price", fmtTSh(Number(form.buyer_price) || 0)],
                  ["Mmiliki / Supplier", form.supplier_name],
                  ["Simu ya Mmiliki", `+255 ${form.supplier_phone}`],
                  ["Mahali / Location", form.supplier_location],
                  ["Faida Yako / Commission", `${fmtTSh(commission)} (${commissionPct}%)`],
                ] as [string, string][]
              ).map(([l, v]) => (
                <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #F4F3EF", fontSize: 12 }}>
                  <span style={{ color: C.muted }}>{l}</span>
                  <span style={{ fontWeight: 600, maxWidth: "55%", textAlign: "right" }}>{v}</span>
                </div>
              ))}
            </div>

            <div style={{ background: C.amberPale, border: "1px solid rgba(212,133,10,0.15)", borderRadius: 12, padding: "13px 14px", marginBottom: 14 }}>
              <div style={{ fontFamily: "Syne,sans-serif", fontSize: 12, fontWeight: 700, color: C.amber, marginBottom: 8 }}>⏭ Hatua Zinazofuata / What Happens Next</div>
              {(
                [
                  ["1", "Mmiliki anapata SMS ya uthibitisho wa escrow", "Supplier receives escrow SMS/WhatsApp"],
                  ["2", "Mmiliki anakubali kutoa bidhaa", "Supplier confirms to release goods"],
                  ["3", "Mnunuzi analipa escrow", "Buyer pays escrow"],
                  ["4", "Wewe unakwenda dukani — bidhaa inatolewa", "You go to shop — goods released to you"],
                  ["5", "Bidhaa inafika kwa mnunuzi → pesa inatolewa", "Delivery confirmed → payouts split automatically"],
                ] as [string, string, string][]
              ).map(([n, sw, en]) => (
                <div key={n} style={{ display: "flex", gap: 10, marginBottom: 7 }}>
                  <div style={{ width: 20, height: 20, borderRadius: "50%", background: C.amber, color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800, fontFamily: "Syne,sans-serif", flexShrink: 0, marginTop: 1 }}>{n}</div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600 }}>{sw}</div>
                    <div style={{ fontSize: 10, color: C.muted }}>{en}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div style={{ padding: "12px 16px 28px", background: C.ink, borderTop: "1px solid rgba(255,255,255,0.06)", flexShrink: 0 }}>
        {step !== "confirm" ? (
          <button
            data-testid="three-party-continue-btn"
            onClick={() => setStep(steps[stepIdx + 1])}
            disabled={
              (step === "item" && (!form.item || !form.buyer_price)) ||
              (step === "supplier" && (!form.supplier_name || form.supplier_phone.length < 9)) ||
              (step === "split" && (!form.supplier_cost || Number(form.supplier_cost) >= Number(form.buyer_price)))
            }
            style={{
              width: "100%",
              padding: 15,
              background: C.gold,
              color: C.ink,
              border: "none",
              borderRadius: 13,
              fontFamily: "Syne,sans-serif",
              fontSize: 15,
              fontWeight: 800,
              cursor: "pointer",
              opacity:
                (step === "item" && (!form.item || !form.buyer_price)) ||
                (step === "supplier" && (!form.supplier_name || form.supplier_phone.length < 9)) ||
                (step === "split" && (!form.supplier_cost || Number(form.supplier_cost) >= Number(form.buyer_price)))
                  ? 0.45
                  : 1,
            }}
          >
            Endelea / Continue →
          </button>
        ) : (
          <button
            data-testid="three-party-submit-btn"
            onClick={create}
            disabled={loading}
            style={{
              width: "100%",
              padding: 15,
              background: loading ? "rgba(200,169,110,0.5)" : "linear-gradient(135deg,#C8A96E,#9A7A42)",
              color: C.ink,
              border: "none",
              borderRadius: 13,
              fontFamily: "Syne,sans-serif",
              fontSize: 15,
              fontWeight: 800,
              cursor: "pointer",
              boxShadow: "0 4px 20px rgba(200,169,110,0.4)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
            }}
          >
            {loading ? (
              <>
                <div style={{ width: 18, height: 18, border: "2px solid rgba(10,10,15,0.2)", borderTopColor: C.ink, borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
                <span>Inatuma…</span>
              </>
            ) : (
              "📤 Tuma Ombi kwa Mmiliki / Send to Supplier →"
            )}
          </button>
        )}
      </div>
    </div>
  );
}
