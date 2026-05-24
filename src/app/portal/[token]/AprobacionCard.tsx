"use client";

import { useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface Aprobacion {
  id: string;
  estado: string;
  deadline: string | null;
  entregable?: { id: string; nombre: string; tipo: string; url: string | null } | null;
  tarea?: { id: string; nombre: string } | null;
}

export function AprobacionCard({
  aprobacion,
  token,
  onResuelta,
}: {
  aprobacion: Aprobacion;
  token: string;
  onResuelta: (id: string, estado: "APROBADO" | "RECHAZADO") => void;
}) {
  const [procesando, setProcesando] = useState(false);
  const [mostrarRechazo, setMostrarRechazo] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [resuelta, setResuelta] = useState<"APROBADO" | "RECHAZADO" | null>(null);

  const nombre = aprobacion.entregable?.nombre ?? aprobacion.tarea?.nombre ?? "Entregable";

  async function resolver(estado: "APROBADO" | "RECHAZADO") {
    if (estado === "RECHAZADO" && !mostrarRechazo) {
      setMostrarRechazo(true);
      return;
    }
    setProcesando(true);
    try {
      const res = await fetch(`/api/portal/${token}/aprobar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          aprobacionId: aprobacion.id,
          estado,
          motivoRechazo: motivo || undefined,
        }),
      });
      if (res.ok) {
        setResuelta(estado);
        onResuelta(aprobacion.id, estado);
      }
    } finally {
      setProcesando(false);
    }
  }

  if (resuelta) {
    return (
      <div className={`rounded-xl border p-4 flex items-center gap-3 ${resuelta === "APROBADO" ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
        <span className="text-xl">{resuelta === "APROBADO" ? "✅" : "❌"}</span>
        <div>
          <p className="font-medium text-slate-900">{nombre}</p>
          <p className={`text-sm ${resuelta === "APROBADO" ? "text-green-700" : "text-red-700"}`}>
            {resuelta === "APROBADO" ? "Aprobado — gracias" : "Rechazado — el equipo recibirá tu feedback"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-amber-200 p-4">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div>
          <p className="font-medium text-slate-900">{nombre}</p>
          {aprobacion.entregable?.tipo && (
            <p className="text-xs text-slate-500 mt-0.5">Tipo: {aprobacion.entregable.tipo}</p>
          )}
          {aprobacion.deadline && (
            <p className="text-xs text-amber-600 mt-1">
              Límite: {format(new Date(aprobacion.deadline), "d MMM yyyy", { locale: es })}
            </p>
          )}
        </div>
        {aprobacion.entregable?.url && (
          <a
            href={aprobacion.entregable.url}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 text-sm font-medium text-indigo-600 hover:text-indigo-700 underline"
          >
            Ver archivo
          </a>
        )}
      </div>

      {mostrarRechazo && (
        <div className="mb-3">
          <textarea
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Describe qué cambios necesitas (opcional)..."
            rows={2}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-400"
          />
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={() => resolver("APROBADO")}
          disabled={procesando}
          className="flex-1 bg-green-600 text-white text-sm font-semibold py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
        >
          {procesando ? "Enviando…" : "✓ Aprobar"}
        </button>
        <button
          onClick={() => resolver("RECHAZADO")}
          disabled={procesando}
          className="flex-1 bg-white border border-red-300 text-red-600 text-sm font-semibold py-2 rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors"
        >
          {mostrarRechazo ? "Confirmar rechazo" : "✗ Rechazar"}
        </button>
        {mostrarRechazo && (
          <button
            onClick={() => { setMostrarRechazo(false); setMotivo(""); }}
            className="px-3 text-slate-400 hover:text-slate-600 text-sm"
          >
            Cancelar
          </button>
        )}
      </div>
    </div>
  );
}
