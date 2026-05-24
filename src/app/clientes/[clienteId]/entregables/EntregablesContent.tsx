"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const APROBACION_CONFIG = {
  PENDIENTE: { label: "Pendiente", bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
  APROBADO: { label: "Aprobado", bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  RECHAZADO: { label: "Rechazado", bg: "bg-red-50", text: "text-red-700", border: "border-red-200" },
  NO_APLICA: { label: "Sin aprobación", bg: "bg-slate-50", text: "text-slate-500", border: "border-slate-200" },
} as const;

const TIPO_LABEL: Record<string, string> = {
  DOCUMENTO: "Documento",
  PRESENTACION: "Presentación",
  REPORTE: "Reporte",
  CREATIVE: "Creativo",
  ESTRATEGIA: "Estrategia",
  OTRO: "Otro",
};

interface Entregable {
  id: string;
  nombre: string;
  tipo: string;
  version: number;
  url: string | null;
  driveId: string | null;
  requiereAprobacion: boolean;
  estadoAprobacion: keyof typeof APROBACION_CONFIG;
  notas: string | null;
  createdAt: string;
  tarea: { id: string; nombre: string; fase: { codigo: string; color: string } } | null;
  aprobaciones: { estado: string; motivoRechazo: string | null; deadline: string | null }[];
}

export default function EntregablesContent({
  clienteId,
  empresa,
  entregables,
}: {
  clienteId: string;
  empresa: string;
  entregables: Entregable[];
}) {
  const router = useRouter();
  const [filtro, setFiltro] = useState<"todos" | "pendientes" | "aprobados" | "rechazados">("todos");
  const [creando, setCreando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [form, setForm] = useState({ nombre: "", tipo: "DOCUMENTO", notas: "" });

  const entregablesFiltrados = entregables.filter((e) => {
    if (filtro === "pendientes") return e.estadoAprobacion === "PENDIENTE";
    if (filtro === "aprobados") return e.estadoAprobacion === "APROBADO";
    if (filtro === "rechazados") return e.estadoAprobacion === "RECHAZADO";
    return true;
  });

  async function crearEntregable() {
    if (!form.nombre.trim()) return;
    setGuardando(true);
    try {
      await fetch("/api/entregables", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clienteId, ...form }),
      });
      setForm({ nombre: "", tipo: "DOCUMENTO", notas: "" });
      setCreando(false);
      router.refresh();
    } finally {
      setGuardando(false);
    }
  }

  async function solicitarAprobacion(entregableId: string) {
    await fetch("/api/aprobaciones", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clienteId, entregableId, tipo: "CLIENTE" }),
    });
    router.refresh();
  }

  const pendientes = entregables.filter((e) => e.estadoAprobacion === "PENDIENTE" && e.requiereAprobacion).length;
  const aprobados = entregables.filter((e) => e.estadoAprobacion === "APROBADO").length;

  return (
    <div className="min-h-screen bg-slate-50">
      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Entregables</h1>
            <p className="text-slate-500 text-sm mt-1">{empresa}</p>
          </div>
          <button
            onClick={() => setCreando(true)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors"
          >
            + Nuevo entregable
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-4 text-center">
            <div className="text-3xl font-bold text-slate-800">{entregables.length}</div>
            <div className="text-sm text-slate-500 mt-1">Total</div>
          </div>
          <div className="bg-amber-50 rounded-2xl border border-amber-200 p-4 text-center">
            <div className="text-3xl font-bold text-amber-700">{pendientes}</div>
            <div className="text-sm text-amber-600 mt-1">Pendientes de aprobación</div>
          </div>
          <div className="bg-emerald-50 rounded-2xl border border-emerald-200 p-4 text-center">
            <div className="text-3xl font-bold text-emerald-700">{aprobados}</div>
            <div className="text-sm text-emerald-600 mt-1">Aprobados</div>
          </div>
        </div>

        {/* Filtros */}
        <div className="flex gap-2 mb-5">
          {(["todos", "pendientes", "aprobados", "rechazados"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFiltro(f)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors capitalize ${
                filtro === f
                  ? "bg-indigo-600 text-white"
                  : "bg-white border border-slate-200 text-slate-600 hover:border-indigo-300"
              }`}
            >
              {f === "todos" ? "Todos" : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {/* Lista */}
        {entregablesFiltrados.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
            <div className="text-slate-400 text-4xl mb-3">📄</div>
            <div className="text-slate-600 font-medium">No hay entregables aún</div>
            <div className="text-slate-400 text-sm mt-1">
              Los entregables se crean desde las tareas o manualmente
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {entregablesFiltrados.map((e) => {
              const cfg = APROBACION_CONFIG[e.estadoAprobacion] ?? APROBACION_CONFIG.NO_APLICA;
              const ultimaAprobacion = e.aprobaciones[0];
              return (
                <div
                  key={e.id}
                  className="bg-white rounded-xl border border-slate-200 px-5 py-4 hover:shadow-sm transition-all"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-semibold text-slate-800">{e.nombre}</span>
                        <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
                          {TIPO_LABEL[e.tipo] ?? e.tipo}
                        </span>
                        <span className="text-xs text-slate-400">v{e.version}</span>
                        {e.tarea && (
                          <span
                            className="text-xs px-2 py-0.5 rounded-full text-white"
                            style={{ backgroundColor: e.tarea.fase.color }}
                          >
                            {e.tarea.fase.codigo} — {e.tarea.nombre}
                          </span>
                        )}
                      </div>
                      {e.notas && (
                        <p className="text-sm text-slate-500 mb-2">{e.notas}</p>
                      )}
                      {ultimaAprobacion?.motivoRechazo && (
                        <div className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 mt-2">
                          Motivo rechazo: {ultimaAprobacion.motivoRechazo}
                        </div>
                      )}
                      <div className="text-xs text-slate-400 mt-1">
                        Creado {new Date(e.createdAt).toLocaleDateString("es-MX")}
                        {ultimaAprobacion?.deadline && (
                          <span className="ml-3">
                            Deadline: {new Date(ultimaAprobacion.deadline).toLocaleDateString("es-MX")}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      {e.url && (
                        <a
                          href={e.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-indigo-600 hover:underline"
                        >
                          Ver archivo ↗
                        </a>
                      )}
                      {e.requiereAprobacion && e.estadoAprobacion === "PENDIENTE" && (
                        <button
                          onClick={() => solicitarAprobacion(e.id)}
                          className="text-xs px-3 py-1.5 bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 transition-colors font-medium"
                        >
                          Solicitar aprobación
                        </button>
                      )}
                      <span className={`text-xs font-semibold px-3 py-1.5 rounded-full border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
                        {cfg.label}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Modal nuevo entregable */}
      {creando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setCreando(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h3 className="font-bold text-slate-900 text-lg mb-5">Nuevo entregable</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">Nombre</label>
                <input
                  value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                  placeholder="Ej. Brief de marca v1"
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">Tipo</label>
                <select
                  value={form.tipo}
                  onChange={(e) => setForm({ ...form, tipo: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {Object.entries(TIPO_LABEL).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">Notas</label>
                <textarea
                  value={form.notas}
                  onChange={(e) => setForm({ ...form, notas: e.target.value })}
                  rows={2}
                  placeholder="Descripción o notas opcionales..."
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setCreando(false)}
                className="flex-1 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                onClick={crearEntregable}
                disabled={guardando || !form.nombre.trim()}
                className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60 transition-colors"
              >
                {guardando ? "Guardando..." : "Crear entregable"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
