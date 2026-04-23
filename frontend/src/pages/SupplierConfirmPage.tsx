import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import SEO from "../components/SEO";
import SupplierConfirmationScreen from "../components/three-party/SupplierConfirmationScreen";

export default function SupplierConfirmPage() {
  const { txId } = useParams();
  const navigate = useNavigate();
  return (
    <>
      <SEO title="Supplier Approval" url={`/supplier-confirm/${txId}`} noindex />
      <SupplierConfirmationScreen txId={txId || ""} onClose={() => navigate("/")} />
    </>
  );
}
