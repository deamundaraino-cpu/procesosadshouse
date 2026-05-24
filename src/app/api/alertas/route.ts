import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { createSupabaseServer } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const clienteId = searchParams.get("clienteId");
  const estado = searchParams.get("estado") ?? "ACTIVA";
  const severidad = searchParams.get("severidad");

  const alertas = await prisma.alerta.findMany({
    where: {
      ...(clienteId ? { clienteId } : {}),
      estado: estado as any,
      ...(severidad ? { severidad: severidad as any } : {}),
    },
    include: {
      cliente: { select: { id: true, nombre: true, empresa: true } },
      destinatarios: { include: { usuario: { select: { id: true, nombre: true } } } },
    },
    orderBy: [{ severidad: "asc" }, { createdAt: "desc" }],
  });

  return NextResponse.json(alertas);
}

const resolverAlertaSchema = z.object({
  alertaId: z.string(),
  estado: z.enum(["RESUELTA", "DESCARTADA"]),
});

export async function PATCH(request: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const body = await request.json();
    const data = resolverAlertaSchema.parse(body);

    const alerta = await prisma.alerta.update({
      where: { id: data.alertaId },
      data: {
        estado: data.estado,
        resueltaAt: new Date(),
      },
    });

    return NextResponse.json(alerta);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
    }
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
