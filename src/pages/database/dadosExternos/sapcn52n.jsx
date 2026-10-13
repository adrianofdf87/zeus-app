// src/pages/database/dadosInternos/contratos.jsx
import React from "react";
import { FileText } from "lucide-react";

export default function SapCn52n() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100%', minHeight: '60vh', gap: '15px' }}>
      <div style={{ background: "rgba(0, 85, 150, 0.1)", padding: "16px", borderRadius: "50%", display: "flex", color: "#005596" }}>
        <FileText size={32} />
      </div>
      <h3 style={{ fontSize: '20px', color: '#0f172a', fontWeight: '600', margin: 0, textAlign: 'center' }}>
        Tela de dados SAP-CN52N em construção...
      </h3>
      <p style={{ fontSize: '14px', color: '#64748b', margin: 0, textAlign: 'center' }}>
        Este módulo de dados internos estará disponível em breve.
      </p>
    </div>
  );
}