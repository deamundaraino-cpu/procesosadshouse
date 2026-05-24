import { createSupabaseServer } from "@/lib/supabase/server";
import { prisma } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { calcularAvanceGlobal } from "@/lib/alcanza/blockers";
import { differenceInDays } from "date-fns";

const ESTADO_CONFIG = {
  COMPLETADA: { label: "Completada", bg: "bg-emerald-100", text: "text-emerald-700", dot: "bg-emerald-500" },
  EN_PROGRESO: { label: "En Progreso", bg: "bg-blue-100", text: "text-blue-700", dot: "bg-blue-500" },
  PENDIENTE: { label: "Pendiente", bg: "bg-slate-100", text: "text-slate-600", dot: "bg-slate-400" },
  BLOQUEADA: { label: "Bloqueada", bg: "bg-red-100", text: "text-red-700", dot: "bg-red-500" },
  CANCELADA: { label: "Cancelada", bg: "bg-slate-100", text: "text-slate-400", dot: "bg-slate-300" },
};

export default async function TimelinePage({
  params,
}: {
  params: { clienteId: string };
}) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const cliente = await prisma.cliente.findUnique({
    where: { id: params.clienteId },
    include: {
      accountManager: { select: { nombre: true } },
      tareas: {
        include: {
          fase: true,
          entregables: { select: { id: true, nombre: true, estadoAprobacion: true } },
          dependencias: { include: { prereq: { select: { id: true, nombre: true, estado: true } } } },
        },
        orderBy: { diaInicio: "asc" },
      },
      alertas: { where: { estado: "ACTIVA" }, orderBy: { createdAt: "desc" }, take: 5 },
    },
  });

  if (!cliente) notFound();

  const avanceGlobal = calcularAvanceGlobal(cliente.tareas as any);
  const diaActual = differenceInDays(new Date(), new Date(cliente.fechaIngreso)) + 1;

  // Agrupar tareas por fase
  const tareasPorFase = cliente.tareas.reduce(
    (acc, t) => {
      const key = t.fase.codigo;
      if (!acc[key]) acc[key] = { fase: t.fase, tareas: [] };
      acc[key].tareas.push(t);
      return acc;
    },
    {} as Record<string, { fase: any; tareas: typeof cliente.tareas }>
  );

  const fases = await prisma.fase.findMany({ orderBy: { orden: "asc" } });

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Navbar cliente */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-slate-400 hover:text-slate-600 text-sm">
              ← Dashboard
            </Link>
            <span className="text-slate-300">|</span>
            <div>
              <span className="font-semibold text-slate-900">{cliente.empresa}</span>
              <span className="text-slate-500 text-sm ml-2">({cliente.nombre})</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-500">Día {diaActual} de 45</span>
            <div className="flex items-center gap-2">
              <div className="w-32 h-2 bg-slate-200 rounded-full">
                <div
                  className="h-full bg-indigo-500 rounded-full transition-all"
                  style={{ width: `${avanceGlobal}%` }}
                />
              </div>
              <span className="text-sm font-bold text-indigo-600">{avanceGlobal}%</span>
            </div>
          </div>
        </div>
      </header>

      {/* Tabs navegación */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-6">
          <nav className="flex gap-1">
            {[
              { label: "Timeline", href: "timeline", active: true },
              { label: "Tareas", href: "tareas", active: false },
              { label: "Brief", href: "brief", active: false },
              { label: "Documentos", href: "documentos", active: false },
              { label: "Entregables", href: "entregables", active: false },
              { label: "Reportes", href: "reportes", active: false },
            ].map((tab) => (
              <Link
                key={tab.label}
                href={`/clientes/${params.clienteId}/${tab.href}`}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  tab.active
                    ? "border-indigo-600 text-indigo-600"
                    : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
              >
                {tab.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Alertas activas */}
        {cliente.alertas.length > 0 && (
          <div className="mb-6 space-y-2">
            {cliente.alertas.map((alerta) => (
              <div
                key={alerta.id}
                className={`flex items-start gap-3 px-4 py-3 rounded-xl border text-sm ${
                  alerta.severidad === "CRITICO"
                    ? "bg-red-50 border-red-200 text-red-800"
                    : alerta.severidad === "IMPORTANTE"
                    ? "bg-amber-50 border-amber-200 text-amber-800"
                    : "bg-indigo-50 border-indigo-200 text-indigo-800"
                }`}
              >
                <span className="font-semibold">{alerta.titulo}</span>
                <span className="text-opacity-80">{alerta.descripcion}</span>
              </div>
            ))}
          </div>
        )}

        {/* Progreso por fases */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-8">
          <h2 className="font-semibold text-slate-900 mb-6">Progreso por Fase</h2>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {fases.map((fase) => {
              const datos = tareasPorFase[fase.codigo];
              const tareasFase = datos?.tareas ?? [];
              const completadas = tareasFase.filter((t) => t.estado === "COMPLETADA").length;
              const pct =
                tareasFase.length > 0
                  ? Math.round((completadas / tareasFase.length) * 100)
                  : 0;
              const activa = diaActual >= fase.diaInicio && diaActual <= fase.diaFin;

              return (
                <div
                  key={fase.id}
                  className={`flex-1 min-w-[110px] rounded-xl p-4 text-center transition-all ${
                    pct === 100
                      ? "bg-emerald-50 border-2 border-emerald-200"
                      : activa
                      ? "border-2 border-indigo-400 bg-indigo-50"
                      : "bg-slate-50 border border-slate-200"
                  }`}
                >
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-2 text-white text-xs font-bold"
                    style={{ backgroundColor: fase.color }}
                  >
                    {fase.codigo}
                  </div>
                  <div className="text-xs font-semibold text-slate-700 truncate">{fase.nombre}</div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    Días {fase.diaInicio}–{fase.diaFin}
                  </div>
                  <div
                    className="text-lg font-bold mt-2"
                    style={{ color: pct === 100 ? "#16a34a" : fase.color }}
                  >
                    {pct}%
                  </div>
                  <div className="text-xs text-slate-500">
                    {completadas}/{tareasFase.length} tareas
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Tareas por fase */}
        {fases.map((fase) => {
          const datos = tareasPorFase[fase.codigo];
          if (!datos?.tareas.length) return null;

          return (
            <div key={fase.id} className="mb-6">
              <div
                className="flex items-center gap-3 mb-3"
              >
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: fase.color }}
                />
                <h3 className="font-semibold text-slate-800">
                  {fase.codigo} — {fase.nombre}
                  <span className="text-slate-400 font-normal text-sm ml-2">
                    Días {fase.diaInicio}–{fase.diaFin}
                  </span>
                </h3>
              </div>

              <div className="space-y-2 ml-6">
                {datos.tareas.map((tarea) => {
                  const cfg = ESTADO_CONFIG[tarea.estado];
                  const bloqueantes = tarea.dependencias
                    .filter((d) => d.prereq.estado !== "COMPLETADA")
                    .map((d) => d.prereq.nombre);

                  return (
                    <Link
                      key={tarea.id}
                      href={`/clientes/${params.clienteId}/tareas?tarea=${tarea.id}`}
                      className="block bg-white rounded-xl border border-slate-200 px-4 py-3 hover:border-indigo-300 hover:shadow-sm transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${cfg.dot}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-slate-800 text-sm truncate">
                              {tarea.nombre}
                            </span>
                            {tarea.esParalela && (
                              <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">
                                Paralela
                              </span>
                            )}
                            {tarea.puntoIA && (
                              <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium">
                                IA {tarea.nivelAutomatizacionIA}%
                              </span>
                            )}
                            {tarea.requiereAprobacion && (
                              <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                                Aprobación
                              </span>
                            )}
                          </div>
                          {tarea.estado === "BLOQUEADA" && bloqueantes.length > 0 && (
                            <div className="text-xs text-red-500 mt-0.5">
                              Esperando: {bloqueantes.join(", ")}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <div className="text-right">
                            <div className="text-xs text-slate-400">
                              Días {tarea.diaInicio}–{tarea.diaFin}
                            </div>
                          </div>
                          <span
                            className={`text-xs font-semibold px-2.5 py-1 rounded-full ${cfg.bg} ${cfg.text}`}
                          >
                            {cfg.label}
                          </span>
                          <div className="w-12 text-right">
                            <span className="text-sm font-bold text-indigo-600">
                              {tarea.porcentajeCompletado}%
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Progress bar */}
                      {tarea.porcentajeCompletado > 0 && (
                        <div className="mt-2 ml-5">
                          <div className="h-1 bg-slate-100 rounded-full">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${tarea.porcentajeCompletado}%`,
                                backgroundColor: fase.color,
                              }}
                            />
                          </div>
                        </div>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </main>
    </div>
  );
}
