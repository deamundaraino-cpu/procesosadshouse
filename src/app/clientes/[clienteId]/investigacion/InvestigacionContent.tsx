"use client";

import { useState, useRef } from "react";
import { SECCIONES_INVESTIGACION, CHECKLIST_INICIAL, type SeccionId } from "@/lib/ia/investigacion";
import ModalImportar from "./ModalImportar";

interface ChecklistItem { id: string; texto: string; completado: boolean }

interface Investigacion {
  id: string;
  nombreProducto: string;
  descripcionProducto: string;
  checklistInicio: ChecklistItem[];
  estado: "BORRADOR" | "EN_PROCESO" | "COMPLETADO";
  createdAt: string;
  buyerPersona?: string | null;
  nombresProducto?: string | null;
  dolores?: string | null;
  objeciones?: string | null;
  angulosVenta?: string | null;
  propuestaUnicaValor?: string | null;
  beneficiosProducto?: string | null;
  antesYDespues?: string | null;
  pruebaSocial?: string | null;
  leadMagnet?: string | null;
  estructuraLanding?: string | null;
}

const ESTADO_CONFIG = {
  BORRADOR:    { label: "Borrador",    bg: "bg-slate-100",   text: "text-slate-600"   },
  EN_PROCESO:  { label: "En Proceso",  bg: "bg-blue-100",    text: "text-blue-700"    },
  COMPLETADO:  { label: "Completado",  bg: "bg-emerald-100", text: "text-emerald-700" },
};

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

function exportarTodoComoTexto(inv: Investigacion): string {
  const linea = "─".repeat(60);
  const partes: string[] = [
    `INVESTIGACIÓN DE MERCADO — ${inv.nombreProducto.toUpperCase()}`,
    `Generado el ${new Date().toLocaleDateString("es-MX", { dateStyle: "long" })}`,
    "",
  ];

  for (const sec of SECCIONES_INVESTIGACION) {
    const contenido = inv[sec.id as keyof Investigacion] as string | null;
    if (contenido) {
      partes.push(linea);
      partes.push(`${sec.icon} ${sec.label.toUpperCase()}`);
      partes.push(linea);
      partes.push(contenido.trim());
      partes.push("");
    }
  }

  return partes.join("\n");
}

export default function InvestigacionContent({
  clienteId,
  empresa,
  investigaciones: inicial,
}: {
  clienteId: string;
  empresa: string;
  investigaciones: Investigacion[];
}) {
  const [investigaciones, setInvestigaciones] = useState<Investigacion[]>(inicial);
  const [activa, setActiva] = useState<Investigacion | null>(
    inicial.length === 1 ? inicial[0] : null
  );
  const [showCreate, setShowCreate] = useState(false);
  const [creando, setCreando] = useState(false);
  const [newNombre, setNewNombre] = useState("");
  const [newDesc, setNewDesc] = useState("");

  const [expandedSec, setExpandedSec] = useState<string>("descripcion");
  const [generando, setGenerando] = useState<Record<string, boolean>>({});
  const [generandoTodo, setGenerandoTodo] = useState(false);
  const [generandoProgreso, setGenerandoProgreso] = useState<string>("");
  const [editMode, setEditMode] = useState<Record<string, boolean>>({});
  const [editSec, setEditSec] = useState<Record<string, string>>({});
  const [savingSec, setSavingSec] = useState<Record<string, boolean>>({});
  const [savedSec, setSavedSec] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState<Record<string, boolean>>({});

  const [savingDesc, setSavingDesc] = useState(false);
  const [editNombre, setEditNombre] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editingHeader, setEditingHeader] = useState(false);
  const [showImportar, setShowImportar] = useState(false);

  const activaRef = useRef<Investigacion | null>(activa);
  activaRef.current = activa;

  function abrirInvestigacion(inv: Investigacion) {
    setActiva(inv);
    setExpandedSec("descripcion");
    setEditSec({});
    setEditMode({});
    setEditNombre(inv.nombreProducto);
    setEditDesc(inv.descripcionProducto);
    setEditingHeader(false);
  }

  async function crearInvestigacion() {
    if (!newNombre.trim() || !newDesc.trim()) return;
    setCreando(true);
    try {
      const res = await fetch("/api/investigaciones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clienteId, nombreProducto: newNombre.trim(), descripcionProducto: newDesc.trim() }),
      });
      if (res.ok) {
        const inv: Investigacion = await res.json();
        setInvestigaciones((prev) => [inv, ...prev]);
        setNewNombre("");
        setNewDesc("");
        setShowCreate(false);
        abrirInvestigacion(inv);
      }
    } finally {
      setCreando(false);
    }
  }

  async function eliminarInvestigacion(id: string) {
    if (!confirm("¿Eliminar esta investigación?")) return;
    await fetch(`/api/investigaciones/${id}`, { method: "DELETE" });
    setInvestigaciones((prev) => prev.filter((i) => i.id !== id));
    if (activa?.id === id) setActiva(null);
  }

  async function toggleChecklist(itemId: string) {
    if (!activa) return;
    const checklist = (activa.checklistInicio ?? CHECKLIST_INICIAL).map((i: ChecklistItem) =>
      i.id === itemId ? { ...i, completado: !i.completado } : i
    );
    const updated = { ...activa, checklistInicio: checklist };
    setActiva(updated);
    setInvestigaciones((prev) => prev.map((i) => (i.id === activa.id ? updated : i)));
    await fetch(`/api/investigaciones/${activa.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ checklistInicio: checklist }),
    });
  }

  async function guardarHeader() {
    if (!activa) return;
    setSavingDesc(true);
    const res = await fetch(`/api/investigaciones/${activa.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombreProducto: editNombre, descripcionProducto: editDesc }),
    });
    if (res.ok) {
      const updated = await res.json();
      const merged = { ...activa, ...updated };
      setActiva(merged);
      setInvestigaciones((prev) => prev.map((i) => (i.id === activa.id ? merged : i)));
      setEditingHeader(false);
    }
    setSavingDesc(false);
  }

  // Uses ref to always read latest activa inside async loop
  async function generarSeccion(seccion: SeccionId): Promise<void> {
    const cur = activaRef.current;
    if (!cur) return;
    setGenerando((prev) => ({ ...prev, [seccion]: true }));
    try {
      const res = await fetch(`/api/investigaciones/${cur.id}/generar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seccion }),
      });
      if (res.ok) {
        const { contenido } = await res.json();
        setActiva((prev) => {
          if (!prev) return prev;
          const updated = { ...prev, [seccion]: contenido };
          activaRef.current = updated;
          return updated;
        });
        setInvestigaciones((prev) =>
          prev.map((i) => (i.id === cur.id ? { ...i, [seccion]: contenido } : i))
        );
        setEditSec((prev) => ({ ...prev, [seccion]: contenido }));
        setExpandedSec(seccion);
      }
    } finally {
      setGenerando((prev) => ({ ...prev, [seccion]: false }));
    }
  }

  async function generarTodo() {
    if (!activa) return;
    // Capture which sections are empty NOW, before any generation
    const pendientes = SECCIONES_INVESTIGACION.filter(
      (sec) => !activaRef.current?.[sec.id as keyof Investigacion]
    );
    if (pendientes.length === 0) return;
    setGenerandoTodo(true);
    for (const sec of pendientes) {
      setGenerandoProgreso(sec.label);
      setExpandedSec(sec.id);
      await generarSeccion(sec.id);
    }
    setGenerandoProgreso("");
    setGenerandoTodo(false);
  }

  async function guardarSeccion(seccion: SeccionId) {
    if (!activa) return;
    const texto = editSec[seccion] ?? (activa[seccion as keyof Investigacion] as string ?? "");
    setSavingSec((prev) => ({ ...prev, [seccion]: true }));
    const res = await fetch(`/api/investigaciones/${activa.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [seccion]: texto }),
    });
    if (res.ok) {
      setActiva((prev) => prev ? { ...prev, [seccion]: texto } : prev);
      setInvestigaciones((prev) =>
        prev.map((i) => (i.id === activa.id ? { ...i, [seccion]: texto } : i))
      );
      setSavedSec((prev) => ({ ...prev, [seccion]: true }));
      setTimeout(() => setSavedSec((prev) => ({ ...prev, [seccion]: false })), 2000);
    }
    setSavingSec((prev) => ({ ...prev, [seccion]: false }));
  }

  async function copiarSeccion(seccion: string, contenido: string) {
    const ok = await copyText(contenido);
    if (ok) {
      setCopied((prev) => ({ ...prev, [seccion]: true }));
      setTimeout(() => setCopied((prev) => ({ ...prev, [seccion]: false })), 2000);
    }
  }

  async function exportarTodo() {
    if (!activa) return;
    const texto = exportarTodoComoTexto(activa);
    const blob = new Blob([texto], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `investigacion-${activa.nombreProducto.toLowerCase().replace(/\s+/g, "-")}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function contarSecciones(inv: Investigacion) {
    return SECCIONES_INVESTIGACION.filter((s) => !!inv[s.id as keyof Investigacion]).length;
  }

  // ── VISTA LISTA ──────────────────────────────────────────────────────────────

  if (!activa) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Investigación de Mercado</h1>
            <p className="text-slate-500 text-sm mt-1">{empresa}</p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors"
          >
            + Nueva Investigación
          </button>
        </div>

        {showCreate && (
          <div className="bg-white rounded-2xl border border-indigo-200 p-6 mb-6 shadow-sm">
            <h2 className="font-semibold text-slate-800 mb-4">Nueva investigación de mercado</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nombre del Producto *</label>
                <input
                  value={newNombre}
                  onChange={(e) => setNewNombre(e.target.value)}
                  placeholder="Ej: Mochila escolar resistente"
                  className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Descripciones del Producto *
                  <span className="font-normal text-slate-400 ml-1">— pega aquí lo que encontraste en Amazon, MercadoLibre, Alibaba, etc.</span>
                </label>
                <textarea
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  rows={6}
                  placeholder="Pega aquí todas las descripciones del producto de las distintas plataformas..."
                  className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>
              <div className="flex gap-3 flex-wrap">
                <button
                  onClick={() => { setShowCreate(false); setNewNombre(""); setNewDesc(""); }}
                  className="px-5 py-2.5 border border-slate-300 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => setShowImportar(true)}
                  className="px-5 py-2.5 border border-indigo-300 text-indigo-600 rounded-xl text-sm font-medium hover:bg-indigo-50 transition-colors"
                >
                  📥 Importar del Brief/Docs
                </button>
                <button
                  onClick={crearInvestigacion}
                  disabled={creando || !newNombre.trim() || !newDesc.trim()}
                  className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                >
                  {creando ? "Creando..." : "Crear y comenzar investigación"}
                </button>
              </div>
            </div>
          </div>
        )}

        {investigaciones.length === 0 && !showCreate ? (
          <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center">
            <div className="text-4xl mb-3">🔍</div>
            <p className="text-slate-600 font-medium mb-1">Sin investigaciones aún</p>
            <p className="text-slate-400 text-sm">Crea la primera investigación de mercado para este cliente</p>
          </div>
        ) : (
          <div className="space-y-3">
            {investigaciones.map((inv) => {
              const cfg = ESTADO_CONFIG[inv.estado];
              const completadas = contarSecciones(inv);
              return (
                <div
                  key={inv.id}
                  className="bg-white rounded-2xl border border-slate-200 p-5 flex items-center gap-4 hover:border-indigo-300 hover:shadow-sm transition-all cursor-pointer"
                  onClick={() => abrirInvestigacion(inv)}
                >
                  <div className="text-2xl">🔍</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-slate-900">{inv.nombreProducto}</div>
                    <div className="text-sm text-slate-400 mt-0.5">
                      {completadas}/{SECCIONES_INVESTIGACION.length} secciones · {new Date(inv.createdAt).toLocaleDateString("es-MX")}
                    </div>
                    {completadas > 0 && (
                      <div className="mt-2 h-1.5 bg-slate-100 rounded-full w-48">
                        <div
                          className="h-full bg-indigo-500 rounded-full"
                          style={{ width: `${(completadas / SECCIONES_INVESTIGACION.length) * 100}%` }}
                        />
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-semibold px-3 py-1 rounded-full ${cfg.bg} ${cfg.text}`}>{cfg.label}</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); eliminarInvestigacion(inv.id); }}
                      className="text-slate-300 hover:text-red-400 text-lg transition-colors"
                    >×</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {showImportar && (
          <ModalImportar
            clienteId={clienteId}
            nombreActual={newNombre}
            descripcionActual={newDesc}
            onImportar={(nombre, desc) => {
              setNewNombre(nombre);
              setNewDesc(desc);
              setShowImportar(false);
            }}
            onClose={() => setShowImportar(false)}
          />
        )}
      </div>
    );
  }

  // ── VISTA DETALLE ────────────────────────────────────────────────────────────

  const checklist: ChecklistItem[] = (activa.checklistInicio as ChecklistItem[]) ?? CHECKLIST_INICIAL;
  const completadasCheck = checklist.filter((i) => i.completado).length;
  const seccionesGeneradas = contarSecciones(activa);

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      {/* Breadcrumb + acciones */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => setActiva(null)} className="text-slate-400 hover:text-slate-700 text-sm font-medium">
          ← Volver
        </button>
        <span className="text-slate-300">/</span>
        <span className="text-slate-600 text-sm font-medium truncate max-w-xs">{activa.nombreProducto}</span>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-slate-400 hidden sm:block">{seccionesGeneradas}/{SECCIONES_INVESTIGACION.length} secciones</span>
          {seccionesGeneradas > 0 && (
            <button
              onClick={exportarTodo}
              className="px-3 py-2 border border-slate-200 text-slate-600 text-xs font-medium rounded-xl hover:bg-slate-50 transition-colors"
            >
              ↓ Exportar
            </button>
          )}
          <button
            onClick={generarTodo}
            disabled={generandoTodo || seccionesGeneradas === SECCIONES_INVESTIGACION.length}
            className="px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {generandoTodo ? `Generando ${generandoProgreso}...` : "✨ Generar todo"}
          </button>
        </div>
      </div>

      {/* Header producto */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-4 shadow-sm">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1 pr-4">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Producto</div>
            {editingHeader ? (
              <input
                value={editNombre}
                onChange={(e) => setEditNombre(e.target.value)}
                className="text-xl font-bold text-slate-900 border-b border-indigo-400 outline-none w-full bg-transparent"
              />
            ) : (
              <h2 className="text-xl font-bold text-slate-900">{activa.nombreProducto}</h2>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setShowImportar(true)}
              className="text-xs text-slate-500 hover:text-indigo-600 font-medium border border-slate-200 hover:border-indigo-300 px-2 py-1 rounded-lg transition-colors"
            >
              📥 Importar
            </button>
            <button
              onClick={() => editingHeader ? guardarHeader() : (() => { setEditNombre(activa.nombreProducto); setEditDesc(activa.descripcionProducto); setEditingHeader(true); })()}
              disabled={savingDesc}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
            >
              {editingHeader ? (savingDesc ? "Guardando..." : "✓ Guardar") : "✎ Editar"}
            </button>
          </div>
        </div>

        {/* Checklist */}
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
              Checklist de investigación
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              completadasCheck === checklist.length ? "bg-emerald-100 text-emerald-700" : "bg-amber-50 text-amber-700"
            }`}>
              {completadasCheck}/{checklist.length}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {checklist.map((item) => (
              <button
                key={item.id}
                onClick={() => toggleChecklist(item.id)}
                className={`flex items-center gap-2 text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                  item.completado ? "bg-emerald-50 text-emerald-700" : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                }`}
              >
                <span className={`w-4 h-4 rounded flex-shrink-0 flex items-center justify-center text-xs font-bold border ${
                  item.completado ? "bg-emerald-500 border-emerald-500 text-white" : "border-slate-300"
                }`}>{item.completado ? "✓" : ""}</span>
                {item.texto}
              </button>
            ))}
          </div>
        </div>

        {/* Descripciones */}
        <div>
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
            Descripciones (Amazon, MercadoLibre, Alibaba…)
          </div>
          {editingHeader ? (
            <textarea
              value={editDesc}
              onChange={(e) => setEditDesc(e.target.value)}
              rows={6}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
            />
          ) : (
            <div className="bg-slate-50 rounded-xl px-4 py-3 text-sm text-slate-700 whitespace-pre-wrap max-h-40 overflow-y-auto leading-relaxed">
              {activa.descripcionProducto || <span className="text-slate-400">Sin descripción</span>}
            </div>
          )}
        </div>
      </div>

      {/* Secciones IA */}
      <div className="space-y-3">
        {SECCIONES_INVESTIGACION.map((sec) => {
          const contenido = editSec[sec.id] ?? (activa[sec.id as keyof Investigacion] as string | null | undefined) ?? null;
          const rawContenido = activa[sec.id as keyof Investigacion] as string | null | undefined;
          const isExpanded = expandedSec === sec.id;
          const isGenerando = generando[sec.id] ?? false;
          const isSaving = savingSec[sec.id] ?? false;
          const isSaved = savedSec[sec.id] ?? false;
          const isCopied = copied[sec.id] ?? false;
          const isEditMode = editMode[sec.id] ?? false;

          return (
            <div
              key={sec.id}
              className={`bg-white rounded-2xl border transition-all ${
                isExpanded ? "border-indigo-200 shadow-sm" : "border-slate-200"
              }`}
            >
              {/* Cabecera sección */}
              <button
                onClick={() => setExpandedSec(isExpanded ? "" : sec.id)}
                className="w-full flex items-center gap-3 px-5 py-4 text-left"
              >
                <span className="text-lg">{sec.icon}</span>
                <div className="flex-1">
                  <span className="font-semibold text-slate-800">{sec.label}</span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {rawContenido ? (
                    <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">Generado</span>
                  ) : (
                    <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">Pendiente</span>
                  )}
                  <span className={`text-slate-400 transition-transform text-xs ${isExpanded ? "rotate-180" : ""}`}>▾</span>
                </div>
              </button>

              {/* Cuerpo sección */}
              {isExpanded && (
                <div className="px-5 pb-5 border-t border-slate-100">
                  {/* Barra de acciones */}
                  <div className="flex items-center gap-2 mt-4 mb-3 flex-wrap">
                    <button
                      onClick={() => generarSeccion(sec.id)}
                      disabled={isGenerando}
                      className="px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                    >
                      {isGenerando ? "Generando..." : rawContenido ? "↻ Regenerar" : "✨ Generar con IA"}
                    </button>
                    {rawContenido && (
                      <>
                        <button
                          onClick={() => copiarSeccion(sec.id, rawContenido)}
                          className={`px-4 py-2 text-xs font-medium rounded-lg border transition-colors ${
                            isCopied
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "border-slate-200 text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          {isCopied ? "✓ Copiado" : "📋 Copiar"}
                        </button>
                        <button
                          onClick={() => setEditMode((prev) => ({ ...prev, [sec.id]: !isEditMode }))}
                          className={`px-4 py-2 text-xs font-medium rounded-lg border transition-colors ${
                            isEditMode
                              ? "bg-amber-50 text-amber-700 border-amber-200"
                              : "border-slate-200 text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          {isEditMode ? "👁 Ver" : "✎ Editar"}
                        </button>
                        {isEditMode && (
                          <button
                            onClick={() => guardarSeccion(sec.id)}
                            disabled={isSaving}
                            className="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-medium rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-colors"
                          >
                            {isSaving ? "Guardando..." : isSaved ? "✓ Guardado" : "Guardar"}
                          </button>
                        )}
                      </>
                    )}
                  </div>

                  {/* Estado generando */}
                  {isGenerando && (
                    <div className="bg-indigo-50 rounded-xl p-6 flex items-center gap-3">
                      <div className="w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-indigo-700">Claude está generando {sec.label}...</p>
                        <p className="text-xs text-indigo-500 mt-0.5">Esto puede tomar 15–30 segundos</p>
                      </div>
                    </div>
                  )}

                  {/* Contenido */}
                  {!isGenerando && rawContenido ? (
                    isEditMode ? (
                      <textarea
                        value={editSec[sec.id] ?? rawContenido}
                        onChange={(e) => setEditSec((prev) => ({ ...prev, [sec.id]: e.target.value }))}
                        rows={sec.id === "estructuraLanding" ? 40 : 20}
                        className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-y font-mono leading-relaxed"
                      />
                    ) : (
                      <div className="bg-slate-50 rounded-xl px-5 py-4 text-sm text-slate-700 whitespace-pre-wrap leading-relaxed max-h-[600px] overflow-y-auto">
                        {rawContenido}
                      </div>
                    )
                  ) : !isGenerando && (
                    <div className="bg-slate-50 rounded-xl p-8 text-center text-slate-400 text-sm">
                      <div className="text-2xl mb-2">{sec.icon}</div>
                      Haz clic en <strong>"✨ Generar con IA"</strong> para crear esta sección
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer exportar */}
      {seccionesGeneradas > 0 && (
        <div className="mt-6 bg-white rounded-2xl border border-slate-200 p-5 flex items-center justify-between">
          <div>
            <p className="font-medium text-slate-700 text-sm">Investigación completa al {Math.round((seccionesGeneradas / SECCIONES_INVESTIGACION.length) * 100)}%</p>
            <p className="text-xs text-slate-400 mt-0.5">{seccionesGeneradas} de {SECCIONES_INVESTIGACION.length} secciones generadas</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => copyText(exportarTodoComoTexto(activa)).then(() => alert("Copiado al portapapeles"))}
              className="px-4 py-2 border border-slate-200 text-slate-600 text-sm font-medium rounded-xl hover:bg-slate-50 transition-colors"
            >
              📋 Copiar todo
            </button>
            <button
              onClick={exportarTodo}
              className="px-4 py-2 bg-slate-800 text-white text-sm font-medium rounded-xl hover:bg-slate-900 transition-colors"
            >
              ↓ Descargar .txt
            </button>
          </div>
        </div>
      )}

      {showImportar && (
        <ModalImportar
          clienteId={clienteId}
          nombreActual={editingHeader ? editNombre : activa.nombreProducto}
          descripcionActual={editingHeader ? editDesc : activa.descripcionProducto}
          onImportar={(nombre, desc) => {
            setEditNombre(nombre);
            setEditDesc(desc);
            setEditingHeader(true);
            setShowImportar(false);
          }}
          onClose={() => setShowImportar(false)}
        />
      )}
    </div>
  );
}
