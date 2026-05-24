"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Reporte {
  id: string;
  titulo: string;
  tipo: string;
  formato: "HTML" | "TEXTO";
  contenido: string;
  periodo: string | null;
  autoGenerado: boolean;
  createdAt: string;
}

export default function ReportesContent({
  clienteId,
  empresa,
  reportes,
  avanceGlobal,
}: {
  clienteId: string;
  empresa: string;
  reportes: Reporte[];
  avanceGlobal: number;
}) {
  const router = useRouter();
  const [generando, setGenerando] = useState(false);
  const [reporteActivo, setReporteActivo] = useState<Reporte | null>(null);
  const [formato, setFormato] = useState<"HTML" | "TEXTO">("HTML");

  async function generarReporte() {
    setGenerando(true);
    try {
      const semana = Math.ceil(reportes.length + 1);
      const res = await fetch("/api/reportes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clienteId,
          formato,
          tipo: "SEMANAL",
          semana,
        }),
      });
      if (res.ok) {
        router.refresh();
      }
    } finally {
      setGenerando(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Reportes</h1>
            <p className="text-slate-500 text-sm mt-1">{empresa}</p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={formato}
              onChange={(e) => setFormato(e.target.value as "HTML" | "TEXTO")}
              className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="HTML">Formato HTML</option>
              <option value="TEXTO">Formato Texto</option>
            </select>
            <button
              onClick={generarReporte}
              disabled={generando}
              className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60 transition-colors"
            >
              {generando ? "Generando..." : "Generar reporte semanal"}
            </button>
          </div>
        </div>

        {/* Resumen avance */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-3">
            <span className="font-semibold text-slate-700">Avance global del onboarding</span>
            <span className="text-2xl font-bold text-indigo-600">{avanceGlobal}%</span>
          </div>
          <div className="h-3 bg-slate-100 rounded-full">
            <div
              className="h-full bg-indigo-500 rounded-full transition-all"
              style={{ width: `${avanceGlobal}%` }}
            />
          </div>
          <div className="mt-3 text-sm text-slate-500">
            {reportes.length === 0
              ? "Genera tu primer reporte semanal para documentar el progreso."
              : `${reportes.length} reporte${reportes.length !== 1 ? "s" : ""} generado${reportes.length !== 1 ? "s" : ""}`}
          </div>
        </div>

        {/* Lista de reportes */}
        {reportes.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center">
            <div className="text-5xl mb-3">📊</div>
            <div className="text-slate-600 font-medium">Aún no hay reportes</div>
            <div className="text-slate-400 text-sm mt-1">
              Genera el primer reporte semanal usando el botón de arriba
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {reportes.map((r) => (
              <div
                key={r.id}
                className="bg-white rounded-xl border border-slate-200 px-5 py-4 hover:shadow-sm transition-all"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-slate-800">{r.titulo}</span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          r.formato === "HTML"
                            ? "bg-indigo-100 text-indigo-700"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {r.formato}
                      </span>
                      {r.autoGenerado && (
                        <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                          Auto
                        </span>
                      )}
                    </div>
                    {r.periodo && (
                      <div className="text-sm text-slate-500">{r.periodo}</div>
                    )}
                    <div className="text-xs text-slate-400 mt-0.5">
                      {new Date(r.createdAt).toLocaleDateString("es-MX", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>
                  <button
                    onClick={() => setReporteActivo(reporteActivo?.id === r.id ? null : r)}
                    className="px-4 py-2 text-sm font-medium text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-xl transition-colors"
                  >
                    {reporteActivo?.id === r.id ? "Cerrar" : "Ver reporte"}
                  </button>
                </div>

                {reporteActivo?.id === r.id && (
                  <div className="mt-4 border-t border-slate-100 pt-4">
                    {r.formato === "HTML" ? (
                      <div
                        className="prose prose-sm max-w-none text-slate-700"
                        dangerouslySetInnerHTML={{ __html: r.contenido }}
                      />
                    ) : (
                      <pre className="text-sm text-slate-700 bg-slate-50 rounded-xl p-4 overflow-auto whitespace-pre-wrap font-mono">
                        {r.contenido}
                      </pre>
                    )}
                    <button
                      onClick={() => {
                        const blob = new Blob([r.contenido], {
                          type: r.formato === "HTML" ? "text/html" : "text/plain",
                        });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = `${r.titulo}.${r.formato === "HTML" ? "html" : "txt"}`;
                        a.click();
                        URL.revokeObjectURL(url);
                      }}
                      className="mt-4 text-sm text-slate-500 hover:text-slate-700 underline"
                    >
                      Descargar archivo
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
