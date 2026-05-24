import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { createSupabaseServer } from "@/lib/supabase/server";
import { generarSeccion, type SeccionId, SECCIONES_INVESTIGACION } from "@/lib/ia/investigacion";

const seccionIds = SECCIONES_INVESTIGACION.map((s) => s.id) as [SeccionId, ...SeccionId[]];

const schema = z.object({
  seccion: z.enum(seccionIds),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { investigacionId: string } }
) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const body = await request.json();
    const { seccion } = schema.parse(body);

    const inv = await prisma.investigacionMercado.findUnique({
      where: { id: params.investigacionId },
      select: { nombreProducto: true, descripcionProducto: true },
    });

    if (!inv) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

    const contenido = await generarSeccion(
      seccion,
      inv.nombreProducto,
      inv.descripcionProducto
    );

    const updated = await prisma.investigacionMercado.update({
      where: { id: params.investigacionId },
      data: { [seccion]: contenido, estado: "EN_PROCESO" },
    });

    return NextResponse.json({ seccion, contenido, updatedAt: updated.updatedAt });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
    }
    console.error("[generar investigacion]", err);
    return NextResponse.json({ error: "Error al generar con IA" }, { status: 500 });
  }
}
