import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { FASES_ALCANZA } from "@/lib/alcanza/fases";
import { format, differenceInDays } from "date-fns";
import { es } from "date-fns/locale";
import { AprobacionesSection } from "./AprobacionesSection";

export const dynamic = "force-dynamic";

interface Props {
  params: { token: string };
}

async function getClienteByToken(token: string) {
  return prisma.cliente.findUnique({
    where: { tokenPortal: token },
    include: {
      tareas: {
        include: {
          fase: true,
          entregables: {
            where: { requiereAprobacion: true },
            orderBy: { createdAt: "desc" },
          },
        },
        orderBy: [{ faseId: "asc" }, { diaInicio: "asc" }],
      },
      alertas: {
        where: { estado: "ACTIVA", tipo: "APROBACION_PENDIENTE" },
        orderBy: { createdAt: "desc" },
      },
      aprobaciones: {
        where: { estado: "PENDIENTE" },
        include: {
          entregable: { select: { id: true, nombre: true, tipo: true, url: true } },
          tarea: { select: { id: true, nombre: true } },
        },
        orderBy: { createdAt: "desc" },
      },
      brief: {
        orderBy: { orden: "asc" },
      },
    },
  });
}

function calcularDiaActual(fechaIngreso: Date): number {
  return differenceInDays(new Date(), fechaIngreso) + 1;
}

function calcularAvanceTotal(tareas: any[]): number {
  if (!tareas.length) return 0;
  const completadas = tareas.filter((t) => t.estado === "COMPLETADA").length;
  return Math.round((completadas / tareas.length) * 100);
}

const ESTADO_LABELS: Record<string, { label: string; color: string }> = {
  PENDIENTE: { label: "Pendiente", color: "bg-slate-100 text-slate-600" },
  EN_PROGRESO: { label: "En progreso", color: "bg-blue-100 text-blue-700" },
  COMPLETADA: { label: "Completada", color: "bg-green-100 text-green-700" },
  BLOQUEADA: { label: "En espera", color: "bg-amber-100 text-amber-700" },
  CANCELADA: { label: "Cancelada", color: "bg-red-100 text-red-600" },
};

export default async function PortalClientePage({ params }: Props) {
  const cliente = await getClienteByToken(params.token);
  if (!cliente) notFound();

  const diaActual = calcularDiaActual(cliente.fechaIngreso);
  const avanceTotal = calcularAvanceTotal(cliente.tareas);
  const diasRestantes = Math.max(0, 45 - diaActual);

  const tareasPorFase = FASES_ALCANZA.map((fase) => ({
    fase,
    tareas: cliente.tareas.filter((t) => t.fase.codigo === fase.codigo),
  })).filter((g) => g.tareas.length > 0);

  const aprobacionesPendientes = cliente.aprobaciones
    .filter((a) => a.estado === "PENDIENTE")
    .map((a) => ({
      ...a,
      deadline: a.deadline ? a.deadline.toISOString() : null,
    }));

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-sm">A</span>
            </div>
            <div>
              <p className="text-xs text-slate-500 leading-none">Portal de seguimiento</p>
              <p className="font-semibold text-slate-900 leading-tight">{cliente.empresa}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-500">Inicio del programa</p>
            <p className="text-sm font-medium text-slate-700">
              {format(cliente.fechaIngreso, "d MMM yyyy", { locale: es })}
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-8">

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 text-center">
            <p className="text-3xl font-bold text-indigo-600">{diaActual}</p>
            <p className="text-sm text-slate-500 mt-1">Día del programa</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-5 text-center">
            <p className="text-3xl font-bold text-emerald-600">{avanceTotal}%</p>
            <p className="text-sm text-slate-500 mt-1">Avance total</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-5 text-center">
            <p className="text-3xl font-bold text-slate-700">{diasRestantes}</p>
            <p className="text-sm text-slate-500 mt-1">Días restantes</p>
          </div>
        </div>

        {/* Barra de progreso */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-3">
            <p className="font-medium text-slate-900">Progreso general — 45 días</p>
            <span className="text-sm font-semibold text-indigo-600">{avanceTotal}%</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-3">
            <div
              className="bg-indigo-600 h-3 rounded-full transition-all"
              style={{ width: `${avanceTotal}%` }}
            />
          </div>
          <div className="flex justify-between mt-2 text-xs text-slate-400">
            <span>Día 1</span>
            <span>Día 45</span>
          </div>
        </div>

        {/* Aprobaciones pendientes */}
        {aprobacionesPendientes.length > 0 && (
          <AprobacionesSection
            aprobaciones={aprobacionesPendientes}
            token={params.token}
          />
        )}

        {/* Timeline por fases */}
        <div>
          <h2 className="font-semibold text-slate-900 mb-4">Tu progreso por fase</h2>
          <div className="space-y-4">
            {tareasPorFase.map(({ fase, tareas }) => {
              const completadas = tareas.filter((t) => t.estado === "COMPLETADA").length;
              const pct = tareas.length ? Math.round((completadas / tareas.length) * 100) : 0;
              const esFaseActual = diaActual >= fase.diaInicio && diaActual <= fase.diaFin;

              return (
                <div
                  key={fase.codigo}
                  className={`bg-white rounded-2xl border p-5 ${
                    esFaseActual ? "border-indigo-300 shadow-sm" : "border-slate-200"
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold"
                        style={{ backgroundColor: fase.color }}
                      >
                        {fase.codigo}
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">{fase.nombre}</p>
                        <p className="text-xs text-slate-500">
                          Días {fase.diaInicio}–{fase.diaFin} · {completadas}/{tareas.length} tareas
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {esFaseActual && (
                        <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium">
                          Fase actual
                        </span>
                      )}
                      <span className="text-sm font-semibold text-slate-700">{pct}%</span>
                    </div>
                  </div>

                  <div className="w-full bg-slate-100 rounded-full h-2 mb-4">
                    <div
                      className="h-2 rounded-full transition-all"
                      style={{ width: `${pct}%`, backgroundColor: fase.color }}
                    />
                  </div>

                  <div className="space-y-2">
                    {tareas.map((tarea) => {
                      const estadoInfo = ESTADO_LABELS[tarea.estado] ?? ESTADO_LABELS.PENDIENTE;
                      return (
                        <div
                          key={tarea.id}
                          className="flex items-center justify-between py-1.5 border-b border-slate-50 last:border-0"
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className={`w-4 h-4 rounded-full flex items-center justify-center ${
                                tarea.estado === "COMPLETADA"
                                  ? "bg-green-500"
                                  : tarea.estado === "EN_PROGRESO"
                                  ? "bg-blue-500"
                                  : "bg-slate-200"
                              }`}
                            >
                              {tarea.estado === "COMPLETADA" && (
                                <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 10 10" fill="currentColor">
                                  <path d="M8.5 2.5L4 7.5 1.5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none" />
                                </svg>
                              )}
                            </div>
                            <span className="text-sm text-slate-700">{tarea.nombre}</span>
                          </div>
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full font-medium ${estadoInfo.color}`}
                          >
                            {estadoInfo.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-slate-400 pb-8">
          <p>Portal privado de seguimiento · AdsHouse Agencia</p>
          <p className="mt-1">
            ¿Preguntas? Escríbenos a{" "}
            <a href="mailto:onboarding@adshouseagencia.com" className="text-indigo-500 hover:underline">
              onboarding@adshouseagencia.com
            </a>
          </p>
        </div>
      </main>
    </div>
  );
}
