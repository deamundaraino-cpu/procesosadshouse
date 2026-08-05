"use client";

import { useState } from "react";
import { FormEngine } from "@/components/forms/dynamic/FormEngine";
import type { SeccionForm } from "@/components/forms/dynamic/FormEngine";
import { CAMPOS_POR_SECCION } from "@/lib/alcanza/brief-campos";
import CompartirBrief from "./CompartirBrief";

interface Pendiente {
  clave: string;
  etiqueta: string;
  seccion: string;
}

interface Props {
  clienteId: string;
  clienteNombre: string;
  empresa: string;
  secciones: Array<{
    seccionCodigo: string;
    seccionNombre: string;
    campos: any[];
  }>;
  prefillMap: Record<string, { valor: string; confianza: number; docFuente?: string }>;
  pendientes: Pendiente[];
  tokenPortal: string;
}

export default function BriefContent({ clienteId, clienteNombre, empresa, secciones, prefillMap, pendientes, tokenPortal }: Props) {
  const [mostrarTodosPendientes, setMostrarTodosPendientes] = useState(false);

  // Agrupar pendientes por sección para mostrar ordenado
  const pendientesPorSeccion = pendientes.reduce<Record<string, Pendiente[]>>((acc, p) => {
    if (!acc[p.seccion]) acc[p.seccion] = [];
    acc[p.seccion].push(p);
    return acc;
  }, {});

  const camposLlenadosDesdeDoc = Object.keys(prefillMap).length;

  const seccionesForm: SeccionForm[] = secciones.map((sec) => {
    const camposBase = CAMPOS_POR_SECCION[sec.seccionCodigo] ?? [];
    // Valores guardados en DB (manual del cliente/equipo tienen prioridad sobre IA)
    const camposGuardados: Record<string, any> = {};
    for (const c of (sec.campos as any[]) ?? []) {
      if (c.clave && c.valor && c.valor !== "") camposGuardados[c.clave] = c;
    }

    return {
      codigo: sec.seccionCodigo,
      titulo: sec.seccionNombre,
      campos: camposBase.map((campo) => {
        const guardado = camposGuardados[campo.clave];
        const fromDoc = prefillMap[campo.clave];
        // Prioridad: valor manual guardado > valor de IA en doc
        const valorPrefill = guardado?.valor ?? fromDoc?.valor;
        const confianza = guardado?.confianza ?? fromDoc?.confianza;
        const fuente = guardado?.docFuente ?? fromDoc?.docFuente;
        const origen = guardado?.origen ?? (fromDoc ? "IA" : undefined);
        return {
          ...campo,
          prefill: valorPrefill,
          confianzaPrefill: confianza,
          docFuente: fuente,
          origenPrefill: origen,
        };
      }),
    };
  });

  return (
    <div>
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="font-bold text-slate-900">Brief de Onboarding</h1>
          <p className="text-sm text-slate-500">{empresa} — {clienteNombre}</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-6 space-y-4">

        <CompartirBrief tokenPortal={tokenPortal} empresa={empresa} />

        {/* Banner resumen IA */}
        {camposLlenadosDesdeDoc > 0 && (
          <div className="bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3 flex items-start gap-3">
            <span className="text-xl mt-0.5">🤖</span>
            <div>
              <p className="text-sm font-semibold text-indigo-800">
                {camposLlenadosDesdeDoc} campos completados automáticamente desde documentos
              </p>
              <p className="text-xs text-indigo-600 mt-0.5">
                Los campos marcados con <span className="font-semibold">IA</span> fueron extraídos de los documentos cargados. Revísalos y corrígelos si es necesario.
              </p>
            </div>
          </div>
        )}

        {/* Panel de pendientes */}
        {pendientes.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl overflow-hidden">
            <div className="px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">📋</span>
                <div>
                  <p className="text-sm font-semibold text-amber-800">
                    {pendientes.length} campo{pendientes.length !== 1 ? "s" : ""} pendiente{pendientes.length !== 1 ? "s" : ""} de completar
                  </p>
                  <p className="text-xs text-amber-600">
                    No encontrados en documentos — requieren completarse manualmente
                  </p>
                </div>
              </div>
              <button
                onClick={() => setMostrarTodosPendientes(!mostrarTodosPendientes)}
                className="text-xs text-amber-700 font-medium hover:underline"
              >
                {mostrarTodosPendientes ? "Ocultar" : "Ver todos"}
              </button>
            </div>

            {mostrarTodosPendientes && (
              <div className="border-t border-amber-200 px-4 py-3 bg-white">
                <div className="grid grid-cols-1 gap-3">
                  {Object.entries(pendientesPorSeccion).map(([seccion, items]) => (
                    <div key={seccion}>
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">{seccion}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {items.map((p) => (
                          <span
                            key={p.clave}
                            className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full"
                          >
                            {p.etiqueta}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {pendientes.length === 0 && camposLlenadosDesdeDoc > 0 && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 flex items-center gap-3">
            <span className="text-xl">✅</span>
            <p className="text-sm font-semibold text-emerald-800">
              ¡Brief completo! Todos los campos fueron cubiertos por los documentos.
            </p>
          </div>
        )}
      </div>

      <FormEngine
        secciones={seccionesForm}
        clienteId={clienteId}
        onComplete={(datos) => {
          console.log("Brief completado:", datos);
        }}
      />
    </div>
  );
}
