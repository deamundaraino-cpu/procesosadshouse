import { createSupabaseServer } from "@/lib/supabase/server";
import { prisma } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import TareasContent from "./TareasContent";

export default async function TareasPage({
  params,
}: {
  params: { clienteId: string };
}) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const cliente = await prisma.cliente.findUnique({
    where: { id: params.clienteId },
    select: { id: true, empresa: true, nombre: true, fechaIngreso: true },
  });
  if (!cliente) notFound();

  const tareas = await prisma.tarea.findMany({
    where: { clienteId: params.clienteId },
    include: {
      fase: true,
      entregables: { select: { id: true, nombre: true, estadoAprobacion: true } },
      comentarios: { orderBy: { createdAt: "desc" } },
      dependencias: {
        include: { prereq: { select: { id: true, nombre: true, estado: true } } },
      },
      subItems: { orderBy: [{ orden: "asc" }, { createdAt: "asc" }] },
    },
    orderBy: [{ fase: { orden: "asc" } }, { diaInicio: "asc" }],
  });

  const fases = await prisma.fase.findMany({ orderBy: { orden: "asc" } });

  return (
    <TareasContent
      clienteId={params.clienteId}
      empresa={cliente.empresa}
      tareas={tareas as any}
      fases={fases}
    />
  );
}
