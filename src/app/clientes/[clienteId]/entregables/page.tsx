import { createSupabaseServer } from "@/lib/supabase/server";
import { prisma } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import EntregablesContent from "./EntregablesContent";

export default async function EntregablesPage({
  params,
}: {
  params: { clienteId: string };
}) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const cliente = await prisma.cliente.findUnique({
    where: { id: params.clienteId },
    select: { id: true, empresa: true },
  });
  if (!cliente) notFound();

  const entregables = await prisma.entregable.findMany({
    where: { clienteId: params.clienteId },
    include: {
      tarea: { select: { id: true, nombre: true, fase: { select: { codigo: true, color: true } } } },
      aprobaciones: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { estado: true, motivoRechazo: true, deadline: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <EntregablesContent
      clienteId={params.clienteId}
      empresa={cliente.empresa}
      entregables={entregables as any}
    />
  );
}
