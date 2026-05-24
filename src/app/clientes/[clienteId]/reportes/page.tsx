import { createSupabaseServer } from "@/lib/supabase/server";
import { prisma } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import ReportesContent from "./ReportesContent";
import { calcularAvanceGlobal } from "@/lib/alcanza/blockers";

export default async function ReportesPage({
  params,
}: {
  params: { clienteId: string };
}) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const cliente = await prisma.cliente.findUnique({
    where: { id: params.clienteId },
    select: { id: true, empresa: true, fechaIngreso: true },
  });
  if (!cliente) notFound();

  const [reportes, tareas] = await Promise.all([
    prisma.reporte.findMany({
      where: { clienteId: params.clienteId },
      orderBy: { createdAt: "desc" },
    }),
    prisma.tarea.findMany({
      where: { clienteId: params.clienteId },
      select: { estado: true, porcentajeCompletado: true },
    }),
  ]);

  const avance = calcularAvanceGlobal(tareas as any);

  return (
    <ReportesContent
      clienteId={params.clienteId}
      empresa={cliente.empresa}
      reportes={reportes as any}
      avanceGlobal={avance}
    />
  );
}
