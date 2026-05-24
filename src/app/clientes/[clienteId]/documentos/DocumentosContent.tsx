"use client";

import { useState, useRef, useEffect } from "react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

interface Documento {
  id: string;
  nombre: string;
  mimeType: string;
  tamanoBytes: number;
  procesadoAt: string | null;
  validadoAt: string | null;
  tieneConflictos: boolean;
  extraccionIA: any;
  createdAt: string;
}

interface Props {
  clienteId: string;
  empresa: string;
  documentos: Documento[];
}

export default function DocumentosContent({ clienteId, empresa, documentos: docInicial }: Props) {
  const [documentos, setDocumentos] = useState(docInicial);
  const [subiendo, setSubiendo] = useState(false);
  const [reprocesando, setReprocesando] = useState<string | null>(null);
  const [docSeleccionado, setDocSeleccionado] = useState<Documento | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Polling automático mientras haya documentos procesando
  useEffect(() => {
    const hayProcesando = documentos.some((d) => !d.procesadoAt);
    if (!hayProcesando) return;

    const intervalo = setInterval(async () => {
      const res = await fetch(`/api/documentos?clienteId=${clienteId}`);
      if (!res.ok) return;
      const lista: Documento[] = await res.json();
      setDocumentos(lista);
      // Actualizar panel si el doc seleccionado cambió
      if (docSeleccionado) {
        const actualizado = lista.find((d) => d.id === docSeleccionado.id);
        if (actualizado) setDocSeleccionado(actualizado);
      }
      // Detener polling si ya no hay ninguno procesando
      if (lista.every((d) => d.procesadoAt)) clearInterval(intervalo);
    }, 5000);

    return () => clearInterval(intervalo);
  }, [documentos, clienteId, docSeleccionado]);

  async function subirDocumento(e: React.ChangeEvent<HTMLInputElement>) {
    const archivos = e.target.files;
    if (!archivos?.length) return;

    setSubiendo(true);
    setError(null);
    let alguno = false;

    for (const archivo of Array.from(archivos)) {
      const formData = new FormData();
      formData.append("archivo", archivo);

      try {
        const res = await fetch(`/api/documentos?clienteId=${clienteId}`, {
          method: "POST",
          body: formData,
        });

        if (res.ok) {
          const nuevo = await res.json();
          setDocumentos((prev) => [nuevo, ...prev]);
          alguno = true;
        } else {
          const data = await res.json().catch(() => ({}));
          setError(`Error subiendo "${archivo.name}": ${data.error ?? res.statusText}`);
        }
      } catch (err: any) {
        setError(`Error de red subiendo "${archivo.name}": ${err.message}`);
      }
    }

    setSubiendo(false);
    if (fileRef.current) fileRef.current.value = "";
    // Si subió al menos uno, recargar la lista desde el servidor para asegurar sync
    if (alguno) {
      const res = await fetch(`/api/documentos?clienteId=${clienteId}`);
      if (res.ok) {
        const lista = await res.json();
        setDocumentos(lista);
      }
    }
  }

  async function reprocesarDocumento(docId: string) {
    setReprocesando(docId);
    setError(null);
    try {
      const res = await fetch(`/api/documentos/reprocesar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentoId: docId }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        const listaRes = await fetch(`/api/documentos?clienteId=${clienteId}`);
        if (listaRes.ok) {
          const lista = await listaRes.json();
          setDocumentos(lista);
          const actualizado = lista.find((d: Documento) => d.id === docId);
          if (actualizado) setDocSeleccionado(actualizado);
        }
      } else {
        setError(`Error reprocesando: ${data.error ?? "desconocido"}`);
      }
    } catch (err: any) {
      setError(`Error de red: ${err.message}`);
    } finally {
      setReprocesando(null);
    }
  }

  async function validarDocumento(docId: string) {
    const res = await fetch(`/api/documentos/${docId}/validar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ validadoPor: "Equipo AdsHouse" }),
    });
    if (res.ok) {
      const actualizado = await res.json();
      setDocumentos((prev) =>
        prev.map((d) => (d.id === actualizado.id ? actualizado : d))
      );
      if (docSeleccionado?.id === docId) {
        setDocSeleccionado(actualizado);
      }
    }
  }

  const confianzaColor = (c: number) =>
    c >= 0.75 ? "text-emerald-600 bg-emerald-50" :
    c >= 0.5 ? "text-amber-600 bg-amber-50" :
    "text-red-600 bg-red-50";

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Documentos del Cliente</h1>
            <p className="text-slate-500 text-sm">{empresa}</p>
          </div>
          <div>
            <input
              ref={fileRef}
              type="file"
              multiple
              accept=".pdf,.docx,.doc,.txt"
              onChange={subirDocumento}
              className="hidden"
            />
            <button
              onClick={() => fileRef.current?.click()}
              disabled={subiendo}
              className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              {subiendo ? "Subiendo..." : "+ Cargar Documentos"}
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 flex items-start justify-between gap-2">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="shrink-0 text-red-400 hover:text-red-600">✕</button>
          </div>
        )}

        <div className="grid grid-cols-2 gap-6">
          {/* Lista documentos */}
          <div className="space-y-3">
            {documentos.map((doc) => (
              <button
                key={doc.id}
                onClick={() => setDocSeleccionado(doc)}
                className={`w-full text-left bg-white rounded-xl border p-4 hover:border-indigo-300 transition-all ${
                  docSeleccionado?.id === doc.id ? "border-indigo-400 shadow-sm" : "border-slate-200"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="text-2xl">
                    {doc.mimeType === "application/pdf" ? "📄" :
                     doc.mimeType.includes("word") ? "📝" : "📃"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-slate-800 text-sm truncate">{doc.nombre}</div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      {(doc.tamanoBytes / 1024).toFixed(0)} KB ·{" "}
                      {formatDistanceToNow(new Date(doc.createdAt), { addSuffix: true, locale: es })}
                    </div>
                    <div className="flex gap-2 mt-2">
                      {!doc.procesadoAt && (
                        <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
                          Procesando...
                        </span>
                      )}
                      {doc.procesadoAt && !doc.validadoAt && (
                        <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                          Pendiente validación
                        </span>
                      )}
                      {doc.validadoAt && (
                        <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">
                          ✓ Validado
                        </span>
                      )}
                      {doc.tieneConflictos && (
                        <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">
                          ⚠ Conflictos
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            ))}

            {documentos.length === 0 && (
              <div
                onClick={() => fileRef.current?.click()}
                className="border-2 border-dashed border-slate-300 rounded-xl p-12 text-center cursor-pointer hover:border-indigo-400 transition-colors"
              >
                <div className="text-4xl mb-3">📁</div>
                <p className="text-slate-600 font-medium">Cargar documentos del cliente</p>
                <p className="text-xs text-slate-400 mt-1">PDF, DOCX, TXT</p>
              </div>
            )}
          </div>

          {/* Panel de extracción IA */}
          {docSeleccionado ? (
            <div className="bg-white rounded-xl border border-slate-200 p-5 h-fit sticky top-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-slate-800 text-sm">Extracción IA</h3>
                {docSeleccionado.procesadoAt && !docSeleccionado.validadoAt && (
                  <button
                    onClick={() => validarDocumento(docSeleccionado.id)}
                    className="bg-emerald-600 text-white text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-emerald-700 transition-colors"
                  >
                    ✓ Validar Extracción
                  </button>
                )}
              </div>

              {!docSeleccionado.procesadoAt ? (
                <div className="text-center py-8">
                  <div className="text-3xl mb-2">⚙️</div>
                  <p className="text-sm text-slate-500 mb-3">Procesando con IA...</p>
                  <button
                    onClick={() => reprocesarDocumento(docSeleccionado.id)}
                    disabled={reprocesando === docSeleccionado.id}
                    className="text-xs bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white px-4 py-2 rounded-lg transition-colors font-medium"
                  >
                    {reprocesando === docSeleccionado.id ? "Procesando con IA... (30-60s)" : "↺ Reprocesar ahora"}
                  </button>
                </div>
              ) : (
                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                  {(docSeleccionado.extraccionIA as any)?.campos
                    ?.filter((c: any) => c.valor)
                    .map((campo: any) => (
                      <div
                        key={campo.campo}
                        className={`px-3 py-2 rounded-lg text-xs ${
                          campo.conflicto
                            ? "bg-red-50 border border-red-200"
                            : "bg-slate-50"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="font-semibold text-slate-600 capitalize">
                            {campo.campo.replace(/_/g, " ")}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${confianzaColor(campo.confianza)}`}>
                            {Math.round(campo.confianza * 100)}%
                          </span>
                        </div>
                        <div className="text-slate-800">{campo.valor}</div>
                        {campo.citaTextual && (
                          <div className="text-slate-400 mt-0.5 italic">
                            "{campo.citaTextual.slice(0, 80)}..."
                          </div>
                        )}
                        {campo.conflicto && (
                          <div className="text-red-600 font-medium mt-1">
                            ⚠ Conflicto con otro documento
                          </div>
                        )}
                      </div>
                    ))}
                  {!(docSeleccionado.extraccionIA as any)?.campos?.some((c: any) => c.valor) && (
                    <p className="text-xs text-slate-400 text-center py-4">
                      No se encontró información relevante en este documento.
                    </p>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-400">
              <div className="text-3xl mb-2">🔍</div>
              <p className="text-sm">Selecciona un documento para ver su extracción IA</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
