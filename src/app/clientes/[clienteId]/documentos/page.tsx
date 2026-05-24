import { createSupabaseServer } from "@/lib/supabase/server";
import { prisma } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import DocumentosContent from "./DocumentosContent";

export const dynamic = "force-dynamic";

export default async function DocumentosPage({
  params,
}: {
  params: { clienteId: string };
}) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const cliente = await prisma.cliente.findUnique({ where: { id: params.clienteId } });
  if (!cliente) notFound();

  const documentos = await prisma.documentoCargado.findMany({
    where: { clienteId: params.clienteId },
    orderBy: { createdAt: "desc" },
  });

  return (
    <DocumentosContent
      clienteId={params.clienteId}
      empresa={cliente.empresa}
      documentos={documentos as any}
    />
  );
}
