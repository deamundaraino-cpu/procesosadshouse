import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { createSupabaseServer } from "@/lib/supabase/server";
import { CHECKLIST_INICIAL } from "@/lib/ia/investigacion";

export async function GET(request: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const clienteId = searchParams.get("clienteId");
  if (!clienteId) return NextResponse.json({ error: "clienteId requerido" }, { status: 400 });

  const investigaciones = await prisma.investigacionMercado.findMany({
    where: { clienteId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      nombreProducto: true,
      estado: true,
      createdAt: true,
      updatedAt: true,
      buyerPersona: true,
      nombresProducto: true,
      dolores: true,
      objeciones: true,
      angulosVenta: true,
      propuestaUnicaValor: true,
      beneficiosProducto: true,
      antesYDespues: true,
      pruebaSocial: true,
      leadMagnet: true,
      estructuraLanding: true,
    },
  });

  return NextResponse.json(investigaciones);
}

const createSchema = z.object({
  clienteId: z.string(),
  nombreProducto: z.string().min(1),
  descripcionProducto: z.string().min(1),
});

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const body = await request.json();
    const data = createSchema.parse(body);

    const investigacion = await prisma.investigacionMercado.create({
      data: {
        clienteId: data.clienteId,
        nombreProducto: data.nombreProducto,
        descripcionProducto: data.descripcionProducto,
        checklistInicio: CHECKLIST_INICIAL,
      },
    });

    return NextResponse.json(investigacion, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
    }
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
