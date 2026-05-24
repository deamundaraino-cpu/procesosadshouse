import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { recalcularCascada } from "@/lib/alcanza/blockers";
import { createSupabaseServer } from "@/lib/supabase/server";

const updateSchema = z.object({
  estado: z.enum(["PENDIENTE", "EN_PROGRESO", "BLOQUEADA", "COMPLETADA", "CANCELADA"]).optional(),
  porcentajeCompletado: z.number().min(0).max(100).optional(),
  notas: z.string().optional(),
  fechaVencimiento: z.string().datetime().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: { tareaId: string } }
) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const body = await request.json();
    const data = updateSchema.parse(body);

    const tarea = await prisma.tarea.update({
      where: { id: params.tareaId },
      data: {
        ...(data.estado ? { estado: data.estado } : {}),
        ...(data.porcentajeCompletado !== undefined ? { porcentajeCompletado: data.porcentajeCompletado } : {}),
        ...(data.notas !== undefined ? { notas: data.notas } : {}),
        ...(data.fechaVencimiento ? { fechaVencimiento: new Date(data.fechaVencimiento) } : {}),
      },
    });

    // Si la tarea fue completada, recalcular cascada de bloqueos en todo el cliente
    if (data.estado === "COMPLETADA") {
      const todasTareas = await prisma.tarea.findMany({
        where: { clienteId: tarea.clienteId },
        include: {
          dependencias: { include: { prereq: true } },
        },
      });

      const cambios = recalcularCascada(todasTareas as any);

      if (cambios.length > 0) {
        await prisma.$transaction(
          cambios.map((c) =>
            prisma.tarea.update({
              where: { id: c.id },
              data: { estado: c.nuevoEstado },
            })
          )
        );
      }
    }

    return NextResponse.json(tarea);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Datos inválidos", detalles: err.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// Agregar comentario a tarea
export async function POST(
  request: NextRequest,
  { params }: { params: { tareaId: string } }
) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");

  if (action === "comentario") {
    const body = await request.json();
    const comentario = await prisma.tareaComentario.create({
      data: {
        tareaId: params.tareaId,
        autorNombre: body.autorNombre,
        autorRol: body.autorRol,
        contenido: body.contenido,
      },
    });
    return NextResponse.json(comentario, { status: 201 });
  }

  return NextResponse.json({ error: "Acción no reconocida" }, { status: 400 });
}
