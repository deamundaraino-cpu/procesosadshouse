import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { createSupabaseServer } from "@/lib/supabase/server";
import DriveContent from "./DriveContent";

export const dynamic = "force-dynamic";

interface Props {
  params: { clienteId: string };
}

export default async function DrivePage({ params }: Props) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return notFound();

  const cliente = await prisma.cliente.findUnique({
    where: { id: params.clienteId },
    select: { id: true, nombre: true, empresa: true, email: true, driveRootId: true },
  });
  if (!cliente) notFound();

  return (
    <DriveContent
      clienteId={params.clienteId}
      empresa={cliente.empresa}
      driveRootId={cliente.driveRootId}
    />
  );
}
