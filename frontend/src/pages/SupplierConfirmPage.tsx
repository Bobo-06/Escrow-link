import React from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import SEO from "../components/SEO";
import SupplierConfirmationScreen from "../components/three-party/SupplierConfirmationScreen";

export default function SupplierConfirmPage() {
  const { txId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("t") || searchParams.get("token") || "";
  return (
    <>
      <SEO title="Supplier Approval" url={`/supplier-confirm/${txId}`} noindex />
      <SupplierConfirmationScreen txId={txId || ""} token={token} onClose={() => navigate("/")} />
    </>
  );
}
