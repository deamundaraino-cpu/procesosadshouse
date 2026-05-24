"use client";

import { useState } from "react";
import { AprobacionCard } from "./AprobacionCard";

interface Aprobacion {
  id: string;
  estado: string;
  deadline: string | null;
  entregable?: { id: string; nombre: string; tipo: string; url: string | null } | null;
  tarea?: { id: string; nombre: string } | null;
}

export function AprobacionesSection({
  aprobaciones: inicial,
  token,
}: {
  aprobaciones: Aprobacion[];
  token: string;
}) {
  const [lista, setLista] = useState(inicial);
  const pendientes = lista.filter((a) => a.estado === "PENDIENTE");

  function onResuelta(id: string, estado: "APROBADO" | "RECHAZADO") {
    setLista((prev) => prev.map((a) => (a.id === id ? { ...a, estado } : a)));
  }

  if (pendientes.length === 0) return null;

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
      <h2 className="font-semibold text-amber-900 mb-4 flex items-center gap-2">
        <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
        Requieren tu aprobación ({pendientes.length})
      </h2>
      <div className="space-y-3">
        {lista.map((ap) => (
          <AprobacionCard
            key={ap.id}
            aprobacion={ap}
            token={token}
            onResuelta={onResuelta}
          />
        ))}
      </div>
    </div>
  );
}
