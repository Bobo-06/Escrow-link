import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import SEO from "../components/SEO";
import ThreePartyTransactionCreator from "../components/three-party/ThreePartyTransactionCreator";
import EscrowLetterOfComfort from "../components/three-party/EscrowLetterOfComfort";

export default function Hawker() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();
  const [createdTx, setCreatedTx] = useState<any>(null);

  if (!isAuthenticated) {
    return (
      <div style={{ minHeight: "100vh", paddingTop: 90, textAlign: "center", color: "white", background: "#0A0A0F" }}>
        <SEO title="Three-Party Escrow — Login Required" url="/hawker/new" noindex />
        <h2 style={{ fontFamily: "Syne,sans-serif", fontSize: 22 }}>Tafadhali ingia kwanza / Please sign in</h2>
        <button
          data-testid="hawker-login-redirect"
          onClick={() => navigate("/login")}
          style={{ marginTop: 18, padding: "12px 28px", background: "#C8A96E", color: "#0A0A0F", border: "none", borderRadius: 12, fontWeight: 800, cursor: "pointer" }}
        >
          Ingia / Sign In
        </button>
      </div>
    );
  }

  if (createdTx) {
    return (
      <>
        <SEO title="Letter of Comfort" url="/hawker/new" noindex />
        <EscrowLetterOfComfort tx={createdTx} onClose={() => navigate("/dashboard")} />
      </>
    );
  }

  return (
    <>
      <SEO
        title="Create Three-Party Escrow"
        description="Hawker creates stock request to supplier with buyer price and commission split"
        url="/hawker/new"
        noindex
      />
      <ThreePartyTransactionCreator
        hawker={{ id: user?.user_id, name: user?.name, phone: user?.phone }}
        onCreated={(tx) => setCreatedTx(tx)}
        onClose={() => navigate("/dashboard")}
      />
    </>
  );
}
