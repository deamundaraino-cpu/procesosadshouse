import { createSupabaseServer } from "@/lib/supabase/server";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { calcularAvanceGlobal } from "@/lib/alcanza/blockers";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

export default async function DashboardPage() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const clientes = await prisma.cliente.findMany({
    where: { estado: { not: "CANCELADO" } },
    include: {
      accountManager: { select: { nombre: true } },
      tareas: { select: { id: true, estado: true, porcentajeCompletado: true } },
      alertas: { where: { estado: "ACTIVA" }, select: { severidad: true } },
      _count: { select: { documentos: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const alertasGlobales = await prisma.alerta.count({ where: { estado: "ACTIVA" } });
  const alertasCriticas = await prisma.alerta.count({
    where: { estado: "ACTIVA", severidad: "CRITICO" },
  });

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">A</span>
            </div>
            <span className="font-semibold text-slate-900">AdsHouse Platform</span>
          </div>
          <div className="flex items-center gap-4">
            {alertasCriticas > 0 && (
              <span className="bg-red-100 text-red-700 text-xs font-semibold px-3 py-1.5 rounded-full">
                {alertasCriticas} alerta{alertasCriticas > 1 ? "s" : ""} crítica{alertasCriticas > 1 ? "s" : ""}
              </span>
            )}
            <Link
              href="/clientes/nuevo"
              className="bg-indigo-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
            >
              + Nuevo Cliente
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          {[
            { label: "Clientes Activos", value: clientes.filter((c) => c.estado === "ACTIVO").length, color: "text-indigo-600" },
            { label: "En Onboarding", value: clientes.filter((c) => c.estado === "ACTIVO").length, color: "text-purple-600" },
            { label: "Alertas Activas", value: alertasGlobales, color: alertasCriticas > 0 ? "text-red-600" : "text-amber-600" },
            { label: "Completados", value: clientes.filter((c) => c.estado === "COMPLETADO").length, color: "text-emerald-600" },
          ].map((stat) => (
            <div key={stat.label} className="bg-white rounded-2xl p-6 border border-slate-200">
              <div className={`text-3xl font-bold ${stat.color}`}>{stat.value}</div>
              <div className="text-sm text-slate-500 mt-1">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Tabla clientes */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-900">Clientes en Proceso</h2>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                <th className="text-left px-6 py-3">Cliente / Empresa</th>
                <th className="text-left px-6 py-3">Account Manager</th>
                <th className="text-left px-6 py-3">Avance</th>
                <th className="text-left px-6 py-3">Tareas</th>
                <th className="text-left px-6 py-3">Alertas</th>
                <th className="text-left px-6 py-3">Ingreso</th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {clientes.map((cliente) => {
                const avance = calcularAvanceGlobal(cliente.tareas as any);
                const tareasCompletadas = cliente.tareas.filter((t) => t.estado === "COMPLETADA").length;
                const alertasCrit = cliente.alertas.filter((a) => a.severidad === "CRITICO").length;
                const alertasImp = cliente.alertas.filter((a) => a.severidad === "IMPORTANTE").length;

                return (
                  <tr key={cliente.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900">{cliente.nombre}</div>
                      <div className="text-sm text-slate-500">{cliente.empresa}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {cliente.accountManager?.nombre ?? "—"}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-24 h-2 bg-slate-100 rounded-full">
                          <div
                            className="h-full bg-indigo-500 rounded-full"
                            style={{ width: `${avance}%` }}
                          />
                        </div>
                        <span className="text-sm font-semibold text-indigo-600">{avance}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {tareasCompletadas} / {cliente.tareas.length}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-1.5">
                        {alertasCrit > 0 && (
                          <span className="bg-red-100 text-red-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                            {alertasCrit} crítica{alertasCrit > 1 ? "s" : ""}
                          </span>
                        )}
                        {alertasImp > 0 && (
                          <span className="bg-amber-100 text-amber-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                            {alertasImp}
                          </span>
                        )}
                        {alertasCrit === 0 && alertasImp === 0 && (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500">
                      {formatDistanceToNow(new Date(cliente.fechaIngreso), {
                        addSuffix: true,
                        locale: es,
                      })}
                    </td>
                    <td className="px-6 py-4">
                      <Link
                        href={`/clientes/${cliente.id}/timeline`}
                        className="text-indigo-600 text-sm font-medium hover:text-indigo-700"
                      >
                        Ver →
                      </Link>
                    </td>
                  </tr>
                );
              })}
              {clientes.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                    No hay clientes aún.{" "}
                    <Link href="/clientes/nuevo" className="text-indigo-600 hover:underline">
                      Crear el primero
                    </Link>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
