import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { createSupabaseServer } from "@/lib/supabase/server";

const actualizarReunionSchema = z.object({
  titulo: z.string().min(2).optional(),
  fecha: z.string().datetime().optional(),
  duracionMin: z.number().int().min(15).optional(),
  tipo: z.string().optional(),
  notas: z.string().optional(),
  link: z.string().url().optional().nullable(),
  grabacionUrl: z.string().url().optional().nullable(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: { reunionId: string } }
) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const body = await request.json();
    const data = actualizarReunionSchema.parse(body);

    const reunion = await prisma.reunion.update({
      where: { id: params.reunionId },
      data: {
        ...(data.titulo && { titulo: data.titulo }),
        ...(data.fecha && { fecha: new Date(data.fecha) }),
        ...(data.duracionMin && { duracionMin: data.duracionMin }),
        ...(data.tipo && { tipo: data.tipo }),
        ...(data.notas !== undefined && { notas: data.notas }),
        ...(data.link !== undefined && { link: data.link }),
        ...(data.grabacionUrl !== undefined && { grabacionUrl: data.grabacionUrl }),
      },
      include: {
        asistentes: { include: { usuario: { select: { id: true, nombre: true } } } },
      },
    });

    return NextResponse.json(reunion);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Datos inválidos", detalles: err.issues }, { status: 400 });
    }
    console.error("[PATCH /api/reuniones/:id]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { reunionId: string } }
) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  await prisma.reunion.delete({ where: { id: params.reunionId } });
  return NextResponse.json({ ok: true });
}
