import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import SEO from "../components/SEO";
import EscrowVerifyPublic from "../components/three-party/EscrowVerifyPublic";

export default function VerifyPage() {
  const { txId } = useParams();
  const navigate = useNavigate();
  return (
    <>
      <SEO
        title={`Verify Transaction ${txId}`}
        description="Public verification of Biz-Salama protected transaction. No login required."
        url={`/verify/${txId}`}
      />
      <EscrowVerifyPublic txId={txId || ""} onClose={() => navigate("/")} />
    </>
  );
}
