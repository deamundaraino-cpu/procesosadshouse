"use client";

import { useEffect, useState } from "react";

interface Props {
  tokenPortal: string;
  empresa: string;
}

export default function CompartirBrief({ tokenPortal, empresa }: Props) {
  const [url, setUrl] = useState("");
  const [copiado, setCopiado] = useState(false);

  // Se arma en el cliente para usar el dominio real desde el que se navega,
  // sin depender de NEXT_PUBLIC_APP_URL.
  useEffect(() => {
    setUrl(`${window.location.origin}/portal/${tokenPortal}/brief`);
  }, [tokenPortal]);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(url);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // navegadores sin permiso de portapapeles: el input queda seleccionable
    }
  }

  const mensaje = `Hola, para arrancar con ${empresa} necesitamos que completes este formulario. No hace falta usuario ni contraseña, y se guarda solo: ${url}`;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <div className="flex items-start gap-3 mb-3">
        <span className="text-xl mt-0.5">🔗</span>
        <div>
          <p className="text-sm font-semibold text-slate-900">
            Enlace para que lo complete el cliente
          </p>
          <p className="text-xs text-slate-500 mt-0.5">
            Entra sin login y sus respuestas llegan aquí automáticamente.
          </p>
        </div>
      </div>

      <div className="flex gap-2">
        <input
          readOnly
          value={url}
          onFocus={(e) => e.currentTarget.select()}
          className="flex-1 min-w-0 px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-600 bg-slate-50"
        />
        <button
          onClick={copiar}
          className="px-3 py-2 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700 whitespace-nowrap"
        >
          {copiado ? "¡Copiado!" : "Copiar"}
        </button>
      </div>

      <div className="flex gap-3 mt-3">
        <a
          href={`https://wa.me/?text=${encodeURIComponent(mensaje)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-emerald-700 font-medium hover:underline"
        >
          Enviar por WhatsApp
        </a>
        <a
          href={`mailto:?subject=${encodeURIComponent(
            `Brief de onboarding — ${empresa}`
          )}&body=${encodeURIComponent(mensaje)}`}
          className="text-xs text-indigo-700 font-medium hover:underline"
        >
          Enviar por email
        </a>
      </div>
    </div>
  );
}
