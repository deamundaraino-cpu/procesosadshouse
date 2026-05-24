import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { createSupabaseServer } from "@/lib/supabase/server";

const updateSchema = z.object({
  nombreProducto: z.string().optional(),
  descripcionProducto: z.string().optional(),
  checklistInicio: z.array(z.object({
    id: z.string(),
    texto: z.string(),
    completado: z.boolean(),
  })).optional(),
  buyerPersona: z.string().optional(),
  nombresProducto: z.string().optional(),
  dolores: z.string().optional(),
  objeciones: z.string().optional(),
  angulosVenta: z.string().optional(),
  propuestaUnicaValor: z.string().optional(),
  beneficiosProducto: z.string().optional(),
  antesYDespues: z.string().optional(),
  pruebaSocial: z.string().optional(),
  leadMagnet: z.string().optional(),
  estructuraLanding: z.string().optional(),
  estado: z.enum(["BORRADOR", "EN_PROCESO", "COMPLETADO"]).optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: { investigacionId: string } }
) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const inv = await prisma.investigacionMercado.findUnique({
    where: { id: params.investigacionId },
  });

  if (!inv) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  return NextResponse.json(inv);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { investigacionId: string } }
) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const body = await request.json();
    const data = updateSchema.parse(body);

    const inv = await prisma.investigacionMercado.update({
      where: { id: params.investigacionId },
      data: data as any,
    });

    return NextResponse.json(inv);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
    }
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { investigacionId: string } }
) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  await prisma.investigacionMercado.delete({ where: { id: params.investigacionId } });
  return NextResponse.json({ ok: true });
}
