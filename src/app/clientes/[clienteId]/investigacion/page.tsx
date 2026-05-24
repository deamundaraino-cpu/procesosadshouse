import { createSupabaseServer } from "@/lib/supabase/server";
import { prisma } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import InvestigacionContent from "./InvestigacionContent";

export default async function InvestigacionPage({
  params,
}: {
  params: { clienteId: string };
}) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const cliente = await prisma.cliente.findUnique({
    where: { id: params.clienteId },
    select: { id: true, empresa: true, nombre: true },
  });
  if (!cliente) notFound();

  const investigaciones = await prisma.investigacionMercado.findMany({
    where: { clienteId: params.clienteId },
    orderBy: { createdAt: "desc" },
  });

  return (
    <InvestigacionContent
      clienteId={params.clienteId}
      empresa={cliente.empresa}
      investigaciones={investigaciones as any}
    />
  );
}
