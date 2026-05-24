"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface Reunion {
  id: string;
  titulo: string;
  fecha: string;
  duracionMin: number;
  tipo: string;
  link: string | null;
  notas: string | null;
  grabacionUrl: string | null;
  asistentes: { reunionId: string; usuarioId: string; usuario: { id: string; nombre: string; rol: string } }[];
}

const TIPO_LABELS: Record<string, string> = {
  VIRTUAL: "Virtual",
  PRESENCIAL: "Presencial",
  KICKOFF: "Kickoff",
  SEGUIMIENTO: "Seguimiento",
  REVISION: "Revisión",
  ENTREGA: "Entrega",
  OTRO: "Otro",
};

export default function ReunionesPage() {
  const params = useParams();
  const clienteId = params.clienteId as string;

  const [reuniones, setReuniones] = useState<Reunion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editando, setEditando] = useState<Reunion | null>(null);
  const [guardando, setGuardando] = useState(false);

  const cargarReuniones = useCallback(async () => {
    setCargando(true);
    try {
      const res = await fetch(`/api/reuniones?clienteId=${clienteId}`);
      const data = await res.json();
      setReuniones(Array.isArray(data) ? data : []);
    } finally {
      setCargando(false);
    }
  }, [clienteId]);

  useEffect(() => {
    cargarReuniones();
  }, [cargarReuniones]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setGuardando(true);
    const fd = new FormData(e.currentTarget);
    const body = {
      clienteId,
      titulo: fd.get("titulo") as string,
      fecha: new Date(fd.get("fecha") as string).toISOString(),
      duracionMin: Number(fd.get("duracionMin")),
      tipo: fd.get("tipo") as string,
      notas: (fd.get("notas") as string) || undefined,
      link: (fd.get("link") as string) || undefined,
    };
    try {
      if (editando) {
        await fetch(`/api/reuniones/${editando.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        setEditando(null);
      } else {
        await fetch("/api/reuniones", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        setShowForm(false);
      }
      await cargarReuniones();
    } finally {
      setGuardando(false);
    }
  }

  async function eliminar(id: string) {
    await fetch(`/api/reuniones/${id}`, { method: "DELETE" });
    await cargarReuniones();
  }

  const proximas = reuniones.filter((r) => new Date(r.fecha) >= new Date());
  const pasadas = reuniones.filter((r) => new Date(r.fecha) < new Date());

  return (
    <div className="min-h-screen bg-slate-50">
      <main className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Reuniones</h1>
            <p className="text-slate-500 text-sm mt-1">{reuniones.length} reuniones totales</p>
          </div>
          <button
            onClick={() => { setShowForm(true); setEditando(null); }}
            className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors"
          >
            + Agendar reunión
          </button>
        </div>

        {/* Formulario nueva / editar */}
        {(showForm || editando) && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <h2 className="font-semibold text-slate-900 mb-5">
              {editando ? "Editar reunión" : "Nueva reunión"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Título</label>
                  <input
                    name="titulo"
                    defaultValue={editando?.titulo}
                    required
                    className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Ej. Kickoff INSPIRA"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Fecha y hora</label>
                  <input
                    name="fecha"
                    type="datetime-local"
                    defaultValue={editando?.fecha?.slice(0, 16)}
                    required
                    className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Duración (min)</label>
                  <input
                    name="duracionMin"
                    type="number"
                    min={15}
                    step={15}
                    defaultValue={editando?.duracionMin ?? 60}
                    required
                    className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Tipo</label>
                  <select
                    name="tipo"
                    defaultValue={editando?.tipo ?? "VIRTUAL"}
                    className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {Object.entries(TIPO_LABELS).map(([v, l]) => (
                      <option key={v} value={v}>{l}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Link (Meet, Zoom…)</label>
                  <input
                    name="link"
                    type="url"
                    defaultValue={editando?.link ?? ""}
                    className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="https://meet.google.com/..."
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Notas</label>
                  <textarea
                    name="notas"
                    defaultValue={editando?.notas ?? ""}
                    rows={3}
                    className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                    placeholder="Agenda, puntos a tratar, resultados…"
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={guardando}
                  className="bg-indigo-600 text-white px-5 py-2 rounded-xl text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                >
                  {guardando ? "Guardando..." : editando ? "Guardar cambios" : "Agendar"}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowForm(false); setEditando(null); }}
                  className="text-slate-600 px-5 py-2 rounded-xl text-sm font-medium hover:bg-slate-100 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        )}

        {cargando && (
          <div className="text-center text-slate-400 py-12">Cargando reuniones…</div>
        )}

        {!cargando && reuniones.length === 0 && !showForm && (
          <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-300">
            <div className="text-5xl mb-3">📅</div>
            <p className="text-lg font-medium text-slate-600">Sin reuniones agendadas</p>
            <p className="text-sm text-slate-400 mt-1">Programa la primera reunión con el cliente.</p>
          </div>
        )}

        {/* Próximas */}
        {proximas.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Próximas</h2>
            <div className="space-y-3">
              {proximas.map((r) => (
                <ReunionCard
                  key={r.id}
                  reunion={r}
                  onEdit={() => { setEditando(r); setShowForm(false); }}
                  onDelete={() => eliminar(r.id)}
                />
              ))}
            </div>
          </section>
        )}

        {/* Historial */}
        {pasadas.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Historial</h2>
            <div className="space-y-3">
              {pasadas.map((r) => (
                <ReunionCard
                  key={r.id}
                  reunion={r}
                  pasada
                  onEdit={() => { setEditando(r); setShowForm(false); }}
                  onDelete={() => eliminar(r.id)}
                />
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

function ReunionCard({
  reunion,
  pasada = false,
  onEdit,
  onDelete,
}: {
  reunion: Reunion;
  pasada?: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const fecha = new Date(reunion.fecha);
  return (
    <div className={`bg-white rounded-2xl border p-5 ${pasada ? "border-slate-100 opacity-75" : "border-slate-200"}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex gap-4">
          <div className="shrink-0 text-center bg-indigo-50 rounded-xl px-3 py-2 min-w-[52px]">
            <p className="text-xs text-indigo-500 font-medium uppercase leading-none">
              {format(fecha, "MMM", { locale: es })}
            </p>
            <p className="text-2xl font-bold text-indigo-700 leading-none mt-0.5">
              {format(fecha, "d")}
            </p>
          </div>
          <div>
            <p className="font-semibold text-slate-900">{reunion.titulo}</p>
            <p className="text-sm text-slate-500 mt-0.5">
              {format(fecha, "EEEE d MMMM, HH:mm", { locale: es })} · {reunion.duracionMin} min ·{" "}
              {TIPO_LABELS[reunion.tipo] ?? reunion.tipo}
            </p>
            {reunion.asistentes?.length > 0 && (
              <p className="text-xs text-slate-400 mt-1">
                Asistentes: {reunion.asistentes.map((a) => a.usuario.nombre).join(", ")}
              </p>
            )}
            {reunion.notas && (
              <p className="text-xs text-slate-500 mt-2 line-clamp-2">{reunion.notas}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {reunion.link && (
            <a
              href={reunion.link}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-indigo-600 font-medium border border-indigo-200 px-3 py-1.5 rounded-lg hover:bg-indigo-50 transition-colors"
            >
              Unirse
            </a>
          )}
          <button
            onClick={onEdit}
            className="text-xs text-slate-500 border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Editar
          </button>
          <button
            onClick={onDelete}
            className="text-xs text-red-500 border border-red-100 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
          >
            Eliminar
          </button>
        </div>
      </div>
    </div>
  );
}
