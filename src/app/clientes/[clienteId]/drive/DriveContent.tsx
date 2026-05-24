"use client";

import { useState } from "react";

const CARPETAS = [
  { nombre: "01-Brief", descripcion: "Brief de cliente y documentos de onboarding", color: "bg-blue-50 text-blue-500" },
  { nombre: "02-Investigacion", descripcion: "Research de mercado y competencia", color: "bg-purple-50 text-purple-500" },
  { nombre: "03-Personas", descripcion: "Buyer personas y segmentación", color: "bg-green-50 text-green-500" },
  { nombre: "04-Estrategia", descripcion: "Estrategia de contenidos y campañas", color: "bg-orange-50 text-orange-500" },
  { nombre: "05-Creativos", descripcion: "Piezas creativas, imágenes, videos", color: "bg-pink-50 text-pink-500" },
  { nombre: "06-Lanzamiento", descripcion: "Assets para el lanzamiento de campañas", color: "bg-red-50 text-red-500" },
  { nombre: "07-Reportes", descripcion: "Reportes semanales y de resultados", color: "bg-indigo-50 text-indigo-500" },
];

interface Props {
  clienteId: string;
  empresa: string;
  driveRootId: string | null;
}

export default function DriveContent({ clienteId, empresa, driveRootId: initialRootId }: Props) {
  const [driveRootId, setDriveRootId] = useState(initialRootId);
  const [driveLink, setDriveLink] = useState<string | null>(null);
  const [creando, setCreando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function crearEstructura() {
    setCreando(true);
    setError(null);
    try {
      const res = await fetch("/api/drive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clienteId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al crear estructura");
      setDriveRootId(data.driveRootId);
      setDriveLink(data.link);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setCreando(false);
    }
  }

  const rootLink = driveLink ?? (driveRootId ? `https://drive.google.com/drive/folders/${driveRootId}` : null);

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Google Drive</h1>
          <p className="text-slate-500 text-sm mt-1">
            Estructura de carpetas — {empresa}
          </p>
        </div>
        {rootLink && (
          <a
            href={rootLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            <DriveIcon />
            Abrir en Drive
          </a>
        )}
      </div>

      {/* Sin Drive configurado */}
      {!driveRootId && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
          <p className="font-semibold text-amber-900 text-lg">Carpeta Drive no creada</p>
          <p className="text-sm text-amber-700 mt-1 mb-4">
            Crea la estructura de 7 carpetas automáticamente en Google Drive para este cliente.
            Se compartirá con el email del cliente y el Account Manager.
          </p>
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4 text-sm text-red-700">
              {error}
            </div>
          )}
          <button
            onClick={crearEstructura}
            disabled={creando}
            className="bg-amber-600 text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-amber-700 disabled:opacity-50 transition-colors"
          >
            {creando ? "Creando carpetas…" : "Crear estructura en Drive"}
          </button>
        </div>
      )}

      {/* Drive configurado — mostrar carpetas */}
      {driveRootId && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {CARPETAS.map((carpeta) => (
            <div
              key={carpeta.nombre}
              className="bg-white rounded-2xl border border-slate-200 p-5 flex items-start gap-3 hover:border-indigo-200 hover:shadow-sm transition-all"
            >
              <div className={`w-10 h-10 ${carpeta.color} rounded-xl flex items-center justify-center shrink-0`}>
                <FolderIcon />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-900">{carpeta.nombre}</p>
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{carpeta.descripcion}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Carpeta raíz info */}
      {driveRootId && (
        <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">ID carpeta raíz</p>
            <p className="text-sm font-mono text-slate-700 mt-0.5">{driveRootId}</p>
          </div>
          <a
            href={`https://drive.google.com/drive/folders/${driveRootId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-indigo-600 border border-indigo-200 px-3 py-1.5 rounded-lg hover:bg-indigo-50 transition-colors"
          >
            Ver raíz
          </a>
        </div>
      )}
    </div>
  );
}

function DriveIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M6.18 15L3.66 19.5H20.34L17.82 15H6.18ZM14.34 3L11 8.67 7.66 3H14.34ZM15.75 5.25L12 11.67 8.25 5.25H15.75Z" />
    </svg>
  );
}

function FolderIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z" />
    </svg>
  );
}
