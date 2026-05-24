"use client";

import { useState, useEffect } from "react";

interface CampoBrief {
  seccionCodigo: string;
  seccionNombre: string;
  clave: string;
  etiqueta: string;
  valor: string;
}

interface DocFuente {
  id: string;
  nombre: string;
  texto: string | null;
  extractos: { campo: string; valor: any }[];
  createdAt: string;
}

interface Fuentes {
  camposBrief: CampoBrief[];
  documentos: DocFuente[];
}

interface Props {
  clienteId: string;
  nombreActual: string;
  descripcionActual: string;
  onImportar: (nombre: string, descripcion: string) => void;
  onClose: () => void;
}

const CLAVES_NOMBRE = ["nombre", "producto", "servicio", "empresa", "marca", "titulo"];
const CLAVES_DESCRIPCION = [
  "descripcion", "descripción", "producto", "servicio", "propuesta",
  "oferta", "beneficios", "caracteristicas", "características", "que_hace",
  "objetivo", "problema", "solucion", "solución",
];

function esCampoNombre(campo: CampoBrief): boolean {
  const key = (campo.clave + " " + campo.etiqueta).toLowerCase();
  return CLAVES_NOMBRE.some((k) => key.includes(k));
}

function esCampoDescripcion(campo: CampoBrief): boolean {
  const key = (campo.clave + " " + campo.etiqueta).toLowerCase();
  return CLAVES_DESCRIPCION.some((k) => key.includes(k));
}

export default function ModalImportar({
  clienteId,
  nombreActual,
  descripcionActual,
  onImportar,
  onClose,
}: Props) {
  const [fuentes, setFuentes] = useState<Fuentes | null>(null);
  const [cargando, setCargando] = useState(true);
  const [tab, setTab] = useState<"brief" | "documentos">("brief");

  // Nombre seleccionado
  const [nombreFuente, setNombreFuente] = useState<"manual" | string>("manual");
  const [nombreManual, setNombreManual] = useState(nombreActual);

  // Selección de campos para descripción (brief)
  const [selectedCampos, setSelectedCampos] = useState<Set<string>>(new Set());
  // Selección de documentos
  const [selectedDocs, setSelectedDocs] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch(`/api/investigaciones/fuentes?clienteId=${clienteId}`)
      .then((r) => r.json())
      .then((data: Fuentes) => {
        setFuentes(data);
        // Pre-select campos que probablemente sean descripción
        const defaultCampos = new Set<string>(
          data.camposBrief
            .filter(esCampoDescripcion)
            .map((c) => `${c.seccionCodigo}::${c.clave}`)
        );
        setSelectedCampos(defaultCampos);
      })
      .finally(() => setCargando(false));
  }, [clienteId]);

  function toggleCampo(key: string) {
    setSelectedCampos((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  function toggleDoc(id: string) {
    setSelectedDocs((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function construirDescripcion(): string {
    const partes: string[] = [descripcionActual].filter(Boolean);

    if (fuentes) {
      // Campos del brief seleccionados
      const camposSel = fuentes.camposBrief.filter((c) =>
        selectedCampos.has(`${c.seccionCodigo}::${c.clave}`)
      );
      if (camposSel.length > 0) {
        const seccionesGroup = camposSel.reduce((acc, c) => {
          if (!acc[c.seccionNombre]) acc[c.seccionNombre] = [];
          acc[c.seccionNombre].push(`${c.etiqueta}: ${c.valor}`);
          return acc;
        }, {} as Record<string, string[]>);

        for (const [seccion, lineas] of Object.entries(seccionesGroup)) {
          partes.push(`\n[Brief — ${seccion}]\n${lineas.join("\n")}`);
        }
      }

      // Texto de documentos seleccionados
      for (const doc of fuentes.documentos.filter((d) => selectedDocs.has(d.id))) {
        if (doc.texto) {
          const preview = doc.texto.slice(0, 3000);
          partes.push(`\n[Documento: ${doc.nombre}]\n${preview}${doc.texto.length > 3000 ? "\n..." : ""}`);
        } else if (doc.extractos.length > 0) {
          const lineas = doc.extractos.map((e) => `${e.campo}: ${e.valor}`).join("\n");
          partes.push(`\n[Extracto de ${doc.nombre}]\n${lineas}`);
        }
      }
    }

    return partes.join("\n").trim();
  }

  function getNombreFinal(): string {
    if (nombreFuente === "manual") return nombreManual;
    const campo = fuentes?.camposBrief.find(
      (c) => `${c.seccionCodigo}::${c.clave}` === nombreFuente
    );
    return campo?.valor ?? nombreManual;
  }

  function aplicar() {
    onImportar(getNombreFinal(), construirDescripcion());
  }

  const camposNombre = fuentes?.camposBrief.filter(esCampoNombre) ?? [];
  const seccionesUnicas = fuentes
    ? [...new Set(fuentes.camposBrief.map((c) => c.seccionNombre))]
    : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-slate-900">Importar datos al producto</h2>
            <p className="text-xs text-slate-500 mt-0.5">Trae información del Brief y los archivos del cliente</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl font-bold">×</button>
        </div>

        {cargando ? (
          <div className="flex-1 flex items-center justify-center p-12">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm text-slate-500">Cargando fuentes de datos...</p>
            </div>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto p-6 space-y-6">

              {/* Nombre del producto */}
              <div>
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
                  Nombre del Producto
                </div>
                <div className="space-y-2">
                  <label className="flex items-start gap-3 p-3 rounded-xl border cursor-pointer hover:bg-slate-50 transition-colors border-slate-200">
                    <input
                      type="radio"
                      name="nombreFuente"
                      value="manual"
                      checked={nombreFuente === "manual"}
                      onChange={() => setNombreFuente("manual")}
                      className="mt-0.5 accent-indigo-600"
                    />
                    <div className="flex-1">
                      <span className="text-sm font-medium text-slate-700">Escribir manualmente</span>
                      {nombreFuente === "manual" && (
                        <input
                          value={nombreManual}
                          onChange={(e) => setNombreManual(e.target.value)}
                          className="mt-2 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                          placeholder="Nombre del producto..."
                        />
                      )}
                    </div>
                  </label>

                  {camposNombre.map((c) => {
                    const key = `${c.seccionCodigo}::${c.clave}`;
                    return (
                      <label key={key} className="flex items-start gap-3 p-3 rounded-xl border cursor-pointer hover:bg-slate-50 transition-colors border-slate-200">
                        <input
                          type="radio"
                          name="nombreFuente"
                          value={key}
                          checked={nombreFuente === key}
                          onChange={() => setNombreFuente(key)}
                          className="mt-0.5 accent-indigo-600"
                        />
                        <div>
                          <span className="text-xs text-slate-400">{c.seccionNombre} → {c.etiqueta}</span>
                          <p className="text-sm font-medium text-slate-800 mt-0.5">{c.valor}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Tabs Brief / Documentos */}
              <div>
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
                  Descripción del Producto — selecciona qué incluir
                </div>

                <div className="flex gap-2 mb-4">
                  <button
                    onClick={() => setTab("brief")}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      tab === "brief" ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    📝 Brief
                    {fuentes && fuentes.camposBrief.length > 0 && (
                      <span className="ml-1.5 text-xs opacity-75">({fuentes.camposBrief.length} campos)</span>
                    )}
                  </button>
                  <button
                    onClick={() => setTab("documentos")}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      tab === "documentos" ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    📄 Documentos
                    {fuentes && fuentes.documentos.length > 0 && (
                      <span className="ml-1.5 text-xs opacity-75">({fuentes.documentos.length})</span>
                    )}
                  </button>
                </div>

                {/* Tab Brief */}
                {tab === "brief" && (
                  <>
                    {(!fuentes || fuentes.camposBrief.length === 0) ? (
                      <div className="bg-slate-50 rounded-xl p-6 text-center text-slate-400 text-sm">
                        El Brief no tiene datos aún. Complétalo primero.
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-slate-500">{selectedCampos.size} campos seleccionados</span>
                          <div className="flex gap-2">
                            <button
                              onClick={() => setSelectedCampos(new Set(fuentes!.camposBrief.map((c) => `${c.seccionCodigo}::${c.clave}`)))}
                              className="text-xs text-indigo-600 hover:text-indigo-800"
                            >Seleccionar todo</button>
                            <span className="text-slate-300">·</span>
                            <button
                              onClick={() => setSelectedCampos(new Set())}
                              className="text-xs text-slate-500 hover:text-slate-700"
                            >Limpiar</button>
                          </div>
                        </div>

                        {seccionesUnicas.map((secNombre) => {
                          const campos = fuentes!.camposBrief.filter((c) => c.seccionNombre === secNombre);
                          return (
                            <div key={secNombre}>
                              <div className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">{secNombre}</div>
                              <div className="space-y-1">
                                {campos.map((c) => {
                                  const key = `${c.seccionCodigo}::${c.clave}`;
                                  const selected = selectedCampos.has(key);
                                  return (
                                    <label
                                      key={key}
                                      className={`flex items-start gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                                        selected ? "bg-indigo-50 border border-indigo-200" : "bg-slate-50 border border-transparent hover:border-slate-200"
                                      }`}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={selected}
                                        onChange={() => toggleCampo(key)}
                                        className="mt-0.5 accent-indigo-600"
                                      />
                                      <div className="flex-1 min-w-0">
                                        <span className="text-xs text-slate-500">{c.etiqueta}</span>
                                        <p className="text-sm text-slate-800 truncate">{c.valor}</p>
                                      </div>
                                    </label>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </>
                )}

                {/* Tab Documentos */}
                {tab === "documentos" && (
                  <>
                    {(!fuentes || fuentes.documentos.length === 0) ? (
                      <div className="bg-slate-50 rounded-xl p-6 text-center text-slate-400 text-sm">
                        No hay documentos procesados. Súbelos en la sección Documentos.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {fuentes.documentos.map((doc) => {
                          const selected = selectedDocs.has(doc.id);
                          const preview = doc.texto
                            ? doc.texto.slice(0, 200) + (doc.texto.length > 200 ? "..." : "")
                            : doc.extractos.slice(0, 3).map((e) => `${e.campo}: ${e.valor}`).join(" · ");
                          return (
                            <label
                              key={doc.id}
                              className={`flex items-start gap-3 p-4 rounded-xl cursor-pointer transition-colors border ${
                                selected ? "bg-indigo-50 border-indigo-200" : "bg-slate-50 border-transparent hover:border-slate-200"
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={selected}
                                onChange={() => toggleDoc(doc.id)}
                                className="mt-1 accent-indigo-600"
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-sm font-medium text-slate-800">{doc.nombre}</span>
                                  {doc.texto && (
                                    <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">Texto procesado</span>
                                  )}
                                  {doc.extractos.length > 0 && (
                                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{doc.extractos.length} extractos IA</span>
                                  )}
                                </div>
                                {preview && (
                                  <p className="text-xs text-slate-500 leading-relaxed">{preview}</p>
                                )}
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Preview */}
              {(selectedCampos.size > 0 || selectedDocs.size > 0) && (
                <div>
                  <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
                    Vista previa de lo que se importará
                  </div>
                  <div className="bg-slate-50 rounded-xl px-4 py-3 text-xs text-slate-600 whitespace-pre-wrap max-h-40 overflow-y-auto font-mono">
                    {construirDescripcion().slice(0, 600)}{construirDescripcion().length > 600 ? "\n..." : ""}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-100 flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={aplicar}
                className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors"
              >
                Importar datos
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
