import React from "react";
import { C, fmtK, TX_STATES } from "./constants";

interface Props {
  supplier?: any;
  onClose?: () => void;
}

export default function SupplierPortal({ supplier, onClose }: Props) {
  const DEMO = supplier || {
    name: "Jumla Electronics Kariakoo",
    phone: "+255755123456",
    stall: "Stall 12B, Kariakoo Market",
    total_orders: 47,
    total_payout_tzs: 78400000,
    pending_orders: 3,
    hawkers: [
      { name: "Amina Juma", orders: 18, volume_tzs: 31200000, status: "active" },
      { name: "John Mwenda", orders: 12, volume_tzs: 22800000, status: "active" },
      { name: "Neema Ally", orders: 7, volume_tzs: 11400000, status: "active" },
    ],
    recent: [
      { id: "3PT-AB12X", item: "Samsung S24", amount: 1650000, status: "completed", hawker: "Amina", date: "Apr 15" },
      { id: "3PT-CD34Y", item: "iPhone 15", amount: 2100000, status: "escrowed", hawker: "John", date: "Apr 16" },
      { id: "3PT-EF56Z", item: "AirPods Pro", amount: 280000, status: "pending_approval", hawker: "Neema", date: "Apr 17" },
    ],
  };

  return (
    <div data-testid="supplier-portal" style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: C.surface, fontFamily: "DM Sans,sans-serif" }}>
      <div style={{ background: "linear-gradient(145deg,#0A0A0F,#1A1510)", padding: "14px 20px 20px", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <button
            data-testid="supplier-portal-back-btn"
            onClick={onClose}
            style={{ width: 36, height: 36, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.07)", color: "white", cursor: "pointer" }}
          >
            ←
          </button>
          <div style={{ flex: 1 }}>
            <div style={{ color: "white", fontFamily: "Syne,sans-serif", fontSize: 14, fontWeight: 700 }}>{DEMO.name}</div>
            <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 11 }}>{DEMO.stall}</div>
          </div>
          <span style={{ background: "rgba(200,169,110,0.2)", color: C.gold, borderRadius: 20, padding: "3px 10px", fontSize: 10, fontWeight: 700, fontFamily: "Syne,sans-serif" }}>SUPPLIER</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
          {(
            [
              ["Maagizo / Orders", String(DEMO.total_orders), C.gold],
              ["Mapato / Earned", fmtK(DEMO.total_payout_tzs), C.emeraldL],
              ["Wanasubiri / Pending", String(DEMO.pending_orders), C.amber],
            ] as [string, string, string][]
          ).map(([l, v, c]) => (
            <div key={l} style={{ background: "rgba(255,255,255,0.06)", borderRadius: 11, padding: "9px 8px", textAlign: "center" }}>
              <div style={{ fontFamily: "Syne,sans-serif", fontSize: 17, fontWeight: 800, color: c }}>{v}</div>
              <div style={{ fontSize: 9, color: "rgba(255,255,255,0.35)", marginTop: 1 }}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "14px" }}>
        <div style={{ fontFamily: "Syne,sans-serif", fontSize: 11, fontWeight: 700, color: "rgba(10,10,15,0.4)", letterSpacing: "1px", marginBottom: 8 }}>
          HAWKER WANAOKUFANYIA KAZI / YOUR HAWKERS
        </div>
        {DEMO.hawkers.map((h: any) => (
          <div key={h.name} data-testid={`supplier-hawker-${h.name.split(" ")[0].toLowerCase()}`} style={{ background: "white", borderRadius: 13, padding: "12px 14px", marginBottom: 8, display: "flex", gap: 12, alignItems: "center", boxShadow: "0 1px 4px rgba(10,10,15,0.06)" }}>
            <div style={{ width: 38, height: 38, borderRadius: "50%", background: "rgba(26,122,90,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>🧑‍💼</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700 }}>{h.name}</div>
              <div style={{ fontSize: 11, color: C.muted }}>{h.orders} maagizo · {fmtK(h.volume_tzs)}</div>
            </div>
            <span style={{ fontSize: 10, fontWeight: 700, color: C.emerald, fontFamily: "Syne,sans-serif" }}>ACTIVE</span>
          </div>
        ))}

        <div style={{ fontFamily: "Syne,sans-serif", fontSize: 11, fontWeight: 700, color: "rgba(10,10,15,0.4)", letterSpacing: "1px", marginBottom: 8, marginTop: 16 }}>
          MIAMALA YA HIVI KARIBUNI / RECENT
        </div>
        {DEMO.recent.map((tx: any) => {
          const st = TX_STATES[tx.status] || TX_STATES.escrowed;
          return (
            <div key={tx.id} data-testid={`supplier-recent-${tx.id}`} style={{ background: "white", borderRadius: 13, padding: "12px 14px", marginBottom: 8, display: "flex", gap: 12, alignItems: "center", boxShadow: "0 1px 4px rgba(10,10,15,0.06)" }}>
              <div style={{ width: 38, height: 38, borderRadius: "50%", background: `${st.color}18`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>{st.icon}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tx.item}</div>
                <div style={{ fontSize: 11, color: C.muted }}>{tx.hawker} · {tx.date}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontFamily: "Syne,sans-serif", fontSize: 13, fontWeight: 800 }}>TSh {(tx.amount / 1000).toFixed(0)}K</div>
                <div style={{ fontSize: 9, color: st.color, fontWeight: 700 }}>{st.label}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
