import React from "react";
import { useNavigate } from "react-router-dom";
import SEO from "../components/SEO";
import SupplierPortal from "../components/three-party/SupplierPortal";

export default function SupplierPortalPage() {
  const navigate = useNavigate();
  return (
    <>
      <SEO title="Supplier Portal" url="/supplier/portal" noindex />
      <SupplierPortal onClose={() => navigate("/")} />
    </>
  );
}
