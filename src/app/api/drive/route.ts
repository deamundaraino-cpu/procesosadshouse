import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createSupabaseServer } from "@/lib/supabase/server";
import { crearEstructuraDriveCliente, obtenerLinkCarpeta } from "@/lib/drive";

export async function GET(request: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const clienteId = searchParams.get("clienteId");
  if (!clienteId) return NextResponse.json({ error: "clienteId requerido" }, { status: 400 });

  const cliente = await prisma.cliente.findUnique({
    where: { id: clienteId },
    select: { driveRootId: true, empresa: true },
  });
  if (!cliente) return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 });

  if (!cliente.driveRootId) {
    return NextResponse.json({ driveRootId: null, link: null });
  }

  try {
    const link = await obtenerLinkCarpeta(cliente.driveRootId);
    return NextResponse.json({ driveRootId: cliente.driveRootId, link });
  } catch {
    return NextResponse.json({ driveRootId: cliente.driveRootId, link: null });
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { clienteId } = await request.json();
  if (!clienteId) return NextResponse.json({ error: "clienteId requerido" }, { status: 400 });

  const cliente = await prisma.cliente.findUnique({
    where: { id: clienteId },
    select: { id: true, nombre: true, empresa: true, email: true, accountManagerId: true, driveRootId: true },
  });
  if (!cliente) return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 });

  if (cliente.driveRootId) {
    const link = await obtenerLinkCarpeta(cliente.driveRootId).catch(() => null);
    return NextResponse.json({ driveRootId: cliente.driveRootId, link, yaExistia: true });
  }

  const accountManager = cliente.accountManagerId
    ? await prisma.usuario.findUnique({
        where: { id: cliente.accountManagerId },
        select: { email: true },
      })
    : null;

  let rootId: string;
  try {
    const resultado = await crearEstructuraDriveCliente(
      cliente.empresa,
      cliente.email,
      accountManager?.email
    );
    rootId = resultado.rootId;
  } catch (err: any) {
    console.error("[drive] Error creando estructura:", err?.message ?? err);
    return NextResponse.json(
      { error: `Error con Google Drive: ${err?.message ?? "error desconocido"}` },
      { status: 500 }
    );
  }

  await prisma.cliente.update({ where: { id: clienteId }, data: { driveRootId: rootId } });

  const link = await obtenerLinkCarpeta(rootId).catch(() => null);

  return NextResponse.json({ driveRootId: rootId, link, yaExistia: false });
}
