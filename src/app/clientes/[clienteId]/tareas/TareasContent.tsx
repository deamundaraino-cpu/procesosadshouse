"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const ESTADO_CONFIG = {
  COMPLETADA: { label: "Completada", bg: "bg-emerald-100", text: "text-emerald-700", dot: "bg-emerald-500" },
  EN_PROGRESO: { label: "En Progreso", bg: "bg-blue-100", text: "text-blue-700", dot: "bg-blue-500" },
  PENDIENTE: { label: "Pendiente", bg: "bg-slate-100", text: "text-slate-600", dot: "bg-slate-400" },
  BLOQUEADA: { label: "Bloqueada", bg: "bg-red-100", text: "text-red-700", dot: "bg-red-500" },
  CANCELADA: { label: "Cancelada", bg: "bg-slate-100", text: "text-slate-400", dot: "bg-slate-300" },
} as const;

type Estado = keyof typeof ESTADO_CONFIG;
type EstadoSubItem = "PENDIENTE" | "OK" | "NO_APLICA";

interface SubItem {
  id: string;
  seccion: string | null;
  texto: string;
  estado: EstadoSubItem;
  observacion: string | null;
  orden: number;
}

interface Tarea {
  id: string;
  nombre: string;
  descripcion: string | null;
  estado: Estado;
  porcentajeCompletado: number;
  diaInicio: number;
  diaFin: number;
  esParalela: boolean;
  puntoIA: boolean;
  nivelAutomatizacionIA: number;
  requiereAprobacion: boolean;
  notas: string | null;
  fase: { id: string; codigo: string; nombre: string; color: string };
  entregables: { id: string; nombre: string; estadoAprobacion: string }[];
  comentarios: { id: string; autorNombre: string; autorRol: string; contenido: string; createdAt: string }[];
  dependencias: { prereq: { id: string; nombre: string; estado: string } }[];
  subItems: SubItem[];
}

interface Fase {
  id: string;
  codigo: string;
  nombre: string;
  color: string;
}

const SUB_ESTADO_CYCLE: Record<EstadoSubItem, EstadoSubItem> = {
  PENDIENTE: "OK",
  OK: "NO_APLICA",
  NO_APLICA: "PENDIENTE",
};

const SUB_ESTADO_UI: Record<EstadoSubItem, { icon: string; bg: string; text: string; border: string }> = {
  OK:        { icon: "✓", bg: "bg-emerald-100", text: "text-emerald-700", border: "border-emerald-300" },
  PENDIENTE: { icon: "○", bg: "bg-amber-50",    text: "text-amber-600",   border: "border-amber-300"  },
  NO_APLICA: { icon: "—", bg: "bg-slate-100",   text: "text-slate-400",   border: "border-slate-200"  },
};

export default function TareasContent({
  clienteId,
  empresa,
  tareas: tareasIniciales,
  fases,
}: {
  clienteId: string;
  empresa: string;
  tareas: Tarea[];
  fases: Fase[];
}) {
  const router = useRouter();
  const [tareas, setTareas] = useState<Tarea[]>(tareasIniciales);
  const [tareaActiva, setTareaActiva] = useState<Tarea | null>(null);
  const [faseActiva, setFaseActiva] = useState<string>("todas");
  const [guardando, setGuardando] = useState(false);
  const [nuevoComentario, setNuevoComentario] = useState("");
  const [editNotas, setEditNotas] = useState("");
  const [editEstado, setEditEstado] = useState<Estado>("PENDIENTE");
  const [editPct, setEditPct] = useState(0);

  // Sub-items state
  const [expandObs, setExpandObs] = useState<string | null>(null);
  const [obsEdit, setObsEdit] = useState<Record<string, string>>({});
  const [showAddItem, setShowAddItem] = useState(false);
  const [newItemSeccion, setNewItemSeccion] = useState("");
  const [newItemTexto, setNewItemTexto] = useState("");
  const [addingItem, setAddingItem] = useState(false);

  const tareasFiltradas = faseActiva === "todas"
    ? tareas
    : tareas.filter((t) => t.fase.codigo === faseActiva);

  const tareasPorFase = fases.reduce((acc, fase) => {
    acc[fase.codigo] = tareasFiltradas.filter((t) => t.fase.codigo === fase.codigo);
    return acc;
  }, {} as Record<string, Tarea[]>);

  function abrirTarea(t: Tarea) {
    setTareaActiva(t);
    setEditEstado(t.estado);
    setEditPct(t.porcentajeCompletado);
    setEditNotas(t.notas ?? "");
    setNuevoComentario("");
    setExpandObs(null);
    setShowAddItem(false);
    setNewItemSeccion("");
    setNewItemTexto("");
  }

  async function guardarCambios() {
    if (!tareaActiva) return;
    setGuardando(true);
    try {
      await fetch(`/api/tareas/${tareaActiva.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado: editEstado, porcentajeCompletado: editPct, notas: editNotas }),
      });
      router.refresh();
      setTareaActiva(null);
    } finally {
      setGuardando(false);
    }
  }

  async function agregarComentario() {
    if (!tareaActiva || !nuevoComentario.trim()) return;
    await fetch(`/api/tareas/${tareaActiva.id}?action=comentario`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ autorNombre: "Director AdsHouse", autorRol: "DIRECTOR", contenido: nuevoComentario }),
    });
    setNuevoComentario("");
    router.refresh();
  }

  // ── Sub-items ───────────────────────────────────────────────────────────────

  function updateSubItemLocal(tareaId: string, itemId: string, patch: Partial<SubItem>) {
    setTareas((prev) =>
      prev.map((t) =>
        t.id !== tareaId
          ? t
          : { ...t, subItems: t.subItems.map((s) => (s.id === itemId ? { ...s, ...patch } : s)) }
      )
    );
    if (tareaActiva?.id === tareaId) {
      setTareaActiva((prev) =>
        prev ? { ...prev, subItems: prev.subItems.map((s) => (s.id === itemId ? { ...s, ...patch } : s)) } : prev
      );
    }
  }

  async function toggleSubItemEstado(item: SubItem) {
    if (!tareaActiva) return;
    const nuevoEstado = SUB_ESTADO_CYCLE[item.estado];
    updateSubItemLocal(tareaActiva.id, item.id, { estado: nuevoEstado });
    await fetch(`/api/tareas/${tareaActiva.id}/subitems`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId: item.id, estado: nuevoEstado }),
    });
  }

  async function guardarObservacion(item: SubItem) {
    if (!tareaActiva) return;
    const obs = obsEdit[item.id] ?? item.observacion ?? "";
    updateSubItemLocal(tareaActiva.id, item.id, { observacion: obs });
    await fetch(`/api/tareas/${tareaActiva.id}/subitems`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId: item.id, observacion: obs }),
    });
    setExpandObs(null);
  }

  async function eliminarSubItem(item: SubItem) {
    if (!tareaActiva) return;
    setTareas((prev) =>
      prev.map((t) =>
        t.id !== tareaActiva.id ? t : { ...t, subItems: t.subItems.filter((s) => s.id !== item.id) }
      )
    );
    setTareaActiva((prev) =>
      prev ? { ...prev, subItems: prev.subItems.filter((s) => s.id !== item.id) } : prev
    );
    await fetch(`/api/tareas/${tareaActiva.id}/subitems?itemId=${item.id}`, { method: "DELETE" });
  }

  async function agregarSubItem() {
    if (!tareaActiva || !newItemTexto.trim()) return;
    setAddingItem(true);
    try {
      const res = await fetch(`/api/tareas/${tareaActiva.id}/subitems`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          seccion: newItemSeccion.trim() || null,
          texto: newItemTexto.trim(),
          orden: tareaActiva.subItems.length,
        }),
      });
      if (res.ok) {
        const nuevoItem: SubItem = await res.json();
        const updated = [...tareaActiva.subItems, nuevoItem];
        setTareas((prev) =>
          prev.map((t) => (t.id === tareaActiva.id ? { ...t, subItems: updated } : t))
        );
        setTareaActiva((prev) => (prev ? { ...prev, subItems: updated } : prev));
        setNewItemTexto("");
        setNewItemSeccion("");
        setShowAddItem(false);
      }
    } finally {
      setAddingItem(false);
    }
  }

  // ── Agrupación de sub-items por sección ────────────────────────────────────

  function agruparPorSeccion(items: SubItem[]) {
    const grupos: { seccion: string | null; items: SubItem[] }[] = [];
    for (const item of items) {
      const last = grupos[grupos.length - 1];
      if (!last || last.seccion !== item.seccion) {
        grupos.push({ seccion: item.seccion, items: [item] });
      } else {
        last.items.push(item);
      }
    }
    return grupos;
  }

  const totalCompletadas = tareas.filter((t) => t.estado === "COMPLETADA").length;
  const totalEnProgreso = tareas.filter((t) => t.estado === "EN_PROGRESO").length;

  return (
    <div className="min-h-screen bg-slate-50">
      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Gestión de Tareas</h1>
            <p className="text-slate-500 text-sm mt-1">{empresa}</p>
          </div>
          <div className="flex gap-4 text-center">
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2">
              <div className="text-2xl font-bold text-emerald-700">{totalCompletadas}</div>
              <div className="text-xs text-emerald-600">Completadas</div>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-2">
              <div className="text-2xl font-bold text-blue-700">{totalEnProgreso}</div>
              <div className="text-xs text-blue-600">En Progreso</div>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2">
              <div className="text-2xl font-bold text-slate-700">{tareas.length}</div>
              <div className="text-xs text-slate-600">Total</div>
            </div>
          </div>
        </div>

        {/* Filtro fases */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
          <button
            onClick={() => setFaseActiva("todas")}
            className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              faseActiva === "todas"
                ? "bg-indigo-600 text-white"
                : "bg-white border border-slate-200 text-slate-600 hover:border-indigo-300"
            }`}
          >
            Todas las fases
          </button>
          {fases.map((fase) => (
            <button
              key={fase.codigo}
              onClick={() => setFaseActiva(fase.codigo)}
              className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                faseActiva === fase.codigo
                  ? "text-white"
                  : "bg-white border border-slate-200 text-slate-600 hover:border-slate-300"
              }`}
              style={faseActiva === fase.codigo ? { backgroundColor: fase.color } : {}}
            >
              {fase.codigo} — {fase.nombre}
            </button>
          ))}
        </div>

        {/* Lista de tareas */}
        {fases.map((fase) => {
          const lista = tareasPorFase[fase.codigo];
          if (!lista?.length) return null;
          return (
            <div key={fase.codigo} className="mb-8">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: fase.color }} />
                <h2 className="font-semibold text-slate-800">
                  {fase.codigo} — {fase.nombre}
                </h2>
                <span className="text-xs text-slate-400 ml-1">
                  {lista.filter((t) => t.estado === "COMPLETADA").length}/{lista.length} completadas
                </span>
              </div>
              <div className="space-y-2">
                {lista.map((tarea) => {
                  const cfg = ESTADO_CONFIG[tarea.estado];
                  const bloqueantes = tarea.dependencias
                    .filter((d) => d.prereq.estado !== "COMPLETADA")
                    .map((d) => d.prereq.nombre);
                  const subOk = tarea.subItems.filter((s) => s.estado === "OK").length;
                  const subTotal = tarea.subItems.filter((s) => s.estado !== "NO_APLICA").length;
                  return (
                    <button
                      key={tarea.id}
                      onClick={() => abrirTarea(tarea)}
                      className="w-full text-left bg-white rounded-xl border border-slate-200 px-4 py-3 hover:border-indigo-300 hover:shadow-sm transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-slate-800 text-sm">{tarea.nombre}</span>
                            {tarea.esParalela && (
                              <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">Paralela</span>
                            )}
                            {tarea.puntoIA && (
                              <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">IA {tarea.nivelAutomatizacionIA}%</span>
                            )}
                            {tarea.requiereAprobacion && (
                              <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Aprobación</span>
                            )}
                            {tarea.comentarios.length > 0 && (
                              <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
                                {tarea.comentarios.length} comentario{tarea.comentarios.length !== 1 ? "s" : ""}
                              </span>
                            )}
                            {tarea.subItems.length > 0 && (
                              <span className={`text-xs px-2 py-0.5 rounded-full ${subOk === subTotal && subTotal > 0 ? "bg-emerald-100 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                                ✓ {subOk}/{subTotal}
                              </span>
                            )}
                          </div>
                          {tarea.estado === "BLOQUEADA" && bloqueantes.length > 0 && (
                            <div className="text-xs text-red-500 mt-0.5">
                              Esperando: {bloqueantes.slice(0, 2).join(", ")}
                              {bloqueantes.length > 2 && ` +${bloqueantes.length - 2} más`}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <span className="text-xs text-slate-400">Días {tarea.diaInicio}–{tarea.diaFin}</span>
                          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${cfg.bg} ${cfg.text}`}>
                            {cfg.label}
                          </span>
                          <span className="text-sm font-bold text-indigo-600 w-10 text-right">
                            {tarea.porcentajeCompletado}%
                          </span>
                        </div>
                      </div>
                      {tarea.porcentajeCompletado > 0 && (
                        <div className="mt-2 ml-5 h-1 bg-slate-100 rounded-full">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{ width: `${tarea.porcentajeCompletado}%`, backgroundColor: fase.color }}
                          />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </main>

      {/* Panel lateral — detalle tarea */}
      {tareaActiva && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/40" onClick={() => setTareaActiva(null)} />
          <div className="w-full max-w-lg bg-white shadow-2xl flex flex-col overflow-hidden">
            {/* Header panel */}
            <div className="px-6 py-5 border-b border-slate-200 flex items-start justify-between">
              <div className="flex-1 min-w-0 pr-4">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: tareaActiva.fase.color }} />
                  <span className="text-xs text-slate-500">{tareaActiva.fase.codigo} — {tareaActiva.fase.nombre}</span>
                </div>
                <h2 className="font-semibold text-slate-900 text-lg leading-tight">{tareaActiva.nombre}</h2>
                {tareaActiva.descripcion && (
                  <p className="text-sm text-slate-500 mt-1">{tareaActiva.descripcion}</p>
                )}
              </div>
              <button
                onClick={() => setTareaActiva(null)}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold flex-shrink-0"
              >
                ×
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
              {/* Estado y progreso */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1.5">Estado</label>
                  <select
                    value={editEstado}
                    onChange={(e) => setEditEstado(e.target.value as Estado)}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {Object.entries(ESTADO_CONFIG).map(([v, cfg]) => (
                      <option key={v} value={v}>{cfg.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1.5">
                    Progreso: <span className="text-indigo-600 font-bold">{editPct}%</span>
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={editPct}
                    onChange={(e) => setEditPct(Number(e.target.value))}
                    className="w-full accent-indigo-600"
                  />
                </div>
              </div>

              {/* Info */}
              <div className="bg-slate-50 rounded-xl p-4 grid grid-cols-3 gap-3 text-center text-sm">
                <div>
                  <div className="font-semibold text-slate-700">Días {tareaActiva.diaInicio}–{tareaActiva.diaFin}</div>
                  <div className="text-xs text-slate-400">Rango</div>
                </div>
                <div>
                  <div className="font-semibold text-slate-700">{tareaActiva.entregables.length}</div>
                  <div className="text-xs text-slate-400">Entregables</div>
                </div>
                <div>
                  <div className="font-semibold text-slate-700">{tareaActiva.comentarios.length}</div>
                  <div className="text-xs text-slate-400">Comentarios</div>
                </div>
              </div>

              {/* Dependencias */}
              {tareaActiva.dependencias.length > 0 && (
                <div>
                  <div className="text-xs font-medium text-slate-500 mb-2">Dependencias</div>
                  <div className="space-y-1.5">
                    {tareaActiva.dependencias.map((d) => {
                      const ok = d.prereq.estado === "COMPLETADA";
                      return (
                        <div key={d.prereq.id} className={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg ${ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
                          <span>{ok ? "✓" : "○"}</span>
                          <span>{d.prereq.nombre}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ── Checklist interno ── */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Checklist interno
                    {tareaActiva.subItems.length > 0 && (
                      <span className="ml-2 font-normal normal-case">
                        {tareaActiva.subItems.filter((s) => s.estado === "OK").length}/
                        {tareaActiva.subItems.filter((s) => s.estado !== "NO_APLICA").length} completados
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => { setShowAddItem((v) => !v); setNewItemTexto(""); setNewItemSeccion(""); }}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                  >
                    {showAddItem ? "Cancelar" : "+ Agregar ítem"}
                  </button>
                </div>

                {/* Formulario nuevo ítem */}
                {showAddItem && (
                  <div className="bg-indigo-50 rounded-xl p-3 mb-3 space-y-2">
                    <input
                      value={newItemSeccion}
                      onChange={(e) => setNewItemSeccion(e.target.value)}
                      placeholder="Sección (opcional, ej: Estructura del BM)"
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                    <input
                      value={newItemTexto}
                      onChange={(e) => setNewItemTexto(e.target.value)}
                      placeholder="Texto del ítem *"
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                      onKeyDown={(e) => e.key === "Enter" && agregarSubItem()}
                    />
                    <button
                      onClick={agregarSubItem}
                      disabled={addingItem || !newItemTexto.trim()}
                      className="w-full py-2 bg-indigo-600 text-white text-sm rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                    >
                      {addingItem ? "Agregando..." : "Agregar"}
                    </button>
                  </div>
                )}

                {tareaActiva.subItems.length === 0 && !showAddItem && (
                  <div className="text-sm text-slate-400 py-2">
                    Sin ítems aún. Agrega el proceso interno de esta tarea.
                  </div>
                )}

                {/* Grupos de ítems */}
                {agruparPorSeccion(tareaActiva.subItems).map((grupo, gi) => (
                  <div key={gi} className="mb-3">
                    {grupo.seccion && (
                      <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5 pl-1">
                        {grupo.seccion}
                      </div>
                    )}
                    <div className="space-y-1">
                      {grupo.items.map((item) => {
                        const ui = SUB_ESTADO_UI[item.estado];
                        const isExpanded = expandObs === item.id;
                        return (
                          <div key={item.id} className={`rounded-lg border ${ui.border} transition-all`}>
                            <div className="flex items-start gap-2 px-3 py-2">
                              {/* Estado toggle */}
                              <button
                                onClick={() => toggleSubItemEstado(item)}
                                className={`w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold mt-0.5 transition-colors ${ui.bg} ${ui.text} border ${ui.border}`}
                                title="Clic para cambiar estado"
                              >
                                {ui.icon}
                              </button>
                              {/* Texto */}
                              <div className="flex-1 min-w-0">
                                <span className={`text-sm ${item.estado === "NO_APLICA" ? "line-through text-slate-400" : "text-slate-700"}`}>
                                  {item.texto}
                                </span>
                                {item.observacion && !isExpanded && (
                                  <p className="text-xs text-slate-400 mt-0.5 truncate">{item.observacion}</p>
                                )}
                              </div>
                              {/* Acciones */}
                              <div className="flex items-center gap-1 flex-shrink-0">
                                <button
                                  onClick={() => {
                                    if (isExpanded) {
                                      setExpandObs(null);
                                    } else {
                                      setExpandObs(item.id);
                                      setObsEdit((prev) => ({ ...prev, [item.id]: item.observacion ?? "" }));
                                    }
                                  }}
                                  className="text-xs text-slate-400 hover:text-indigo-600 px-1"
                                  title="Observación"
                                >
                                  ✎
                                </button>
                                <button
                                  onClick={() => eliminarSubItem(item)}
                                  className="text-xs text-slate-300 hover:text-red-400 px-1"
                                  title="Eliminar"
                                >
                                  ×
                                </button>
                              </div>
                            </div>
                            {/* Campo observación expandido */}
                            {isExpanded && (
                              <div className="px-3 pb-3 space-y-2">
                                <textarea
                                  value={obsEdit[item.id] ?? ""}
                                  onChange={(e) => setObsEdit((prev) => ({ ...prev, [item.id]: e.target.value }))}
                                  rows={3}
                                  placeholder="Agregar observación sobre este ítem..."
                                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
                                />
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => setExpandObs(null)}
                                    className="flex-1 py-1.5 border border-slate-200 text-slate-600 rounded-lg text-xs font-medium hover:bg-slate-50"
                                  >
                                    Cancelar
                                  </button>
                                  <button
                                    onClick={() => guardarObservacion(item)}
                                    className="flex-1 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700"
                                  >
                                    Guardar
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {/* Notas */}
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">Notas internas</label>
                <textarea
                  value={editNotas}
                  onChange={(e) => setEditNotas(e.target.value)}
                  rows={3}
                  placeholder="Agregar notas sobre esta tarea..."
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>

              {/* Comentarios */}
              <div>
                <div className="text-xs font-medium text-slate-500 mb-2">Comentarios</div>
                {tareaActiva.comentarios.length === 0 && (
                  <div className="text-sm text-slate-400 py-2">Sin comentarios aún</div>
                )}
                {tareaActiva.comentarios.map((c) => (
                  <div key={c.id} className="bg-slate-50 rounded-lg p-3 mb-2">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold text-slate-700">{c.autorNombre}</span>
                      <span className="text-xs text-slate-400">{new Date(c.createdAt).toLocaleDateString("es-MX")}</span>
                    </div>
                    <p className="text-sm text-slate-600">{c.contenido}</p>
                  </div>
                ))}
                <div className="flex gap-2 mt-2">
                  <input
                    value={nuevoComentario}
                    onChange={(e) => setNuevoComentario(e.target.value)}
                    placeholder="Agregar comentario..."
                    className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    onKeyDown={(e) => e.key === "Enter" && agregarComentario()}
                  />
                  <button
                    onClick={agregarComentario}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors"
                  >
                    ↩
                  </button>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-100 flex gap-3">
              <button
                onClick={() => setTareaActiva(null)}
                className="flex-1 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={guardarCambios}
                disabled={guardando}
                className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-60"
              >
                {guardando ? "Guardando..." : "Guardar cambios"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
