"use client";

import Link from "next/link";
import { FormEngine } from "@/components/forms/dynamic/FormEngine";
import type { SeccionForm } from "@/components/forms/dynamic/FormEngine";

interface Props {
  token: string;
  clienteId: string;
  clienteNombre: string;
  empresa: string;
  secciones: SeccionForm[];
  avanceInicial: number;
}

export default function BriefPublico({
  token,
  clienteId,
  clienteNombre,
  empresa,
  secciones,
  avanceInicial,
}: Props) {
  if (secciones.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="text-center max-w-md">
          <div className="text-5xl mb-4">📋</div>
          <h1 className="text-xl font-bold text-slate-900 mb-2">
            El formulario aún no está listo
          </h1>
          <p className="text-slate-600 text-sm">
            Tu equipo de AdsHouse todavía no ha habilitado el brief. Vuelve a intentarlo
            en un momento o escríbenos.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="font-bold text-slate-900">Brief de Onboarding</h1>
              <p className="text-sm text-slate-500">
                {empresa} — {clienteNombre}
              </p>
            </div>
            <Link
              href={`/portal/${token}`}
              className="text-sm text-indigo-600 hover:underline whitespace-nowrap"
            >
              ← Volver al portal
            </Link>
          </div>

          {avanceInicial > 0 && avanceInicial < 100 && (
            <div className="mt-3">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs text-slate-500">Ya tienes avance guardado</p>
                <span className="text-xs font-semibold text-indigo-600">
                  {avanceInicial}%
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-1.5">
                <div
                  className="bg-indigo-600 h-1.5 rounded-full transition-all"
                  style={{ width: `${avanceInicial}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-6">
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3 flex items-start gap-3">
          <span className="text-xl mt-0.5">💾</span>
          <div>
            <p className="text-sm font-semibold text-indigo-800">
              Tus respuestas se guardan solas
            </p>
            <p className="text-xs text-indigo-600 mt-0.5">
              Puedes cerrar esta página y continuar más tarde con el mismo enlace. No
              necesitas cuenta ni contraseña.
            </p>
          </div>
        </div>
      </div>

      <FormEngine
        secciones={secciones}
        clienteId={clienteId}
        endpoint={`/api/portal/${token}/brief`}
        onComplete={() => {
          // Avisar al equipo de que el cliente terminó
          fetch(`/api/portal/${token}/brief`, { method: "POST" }).catch(() => {});
        }}
      />
    </div>
  );
}
