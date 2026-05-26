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
  const estado = searchParams.get("estado");

  const aprobaciones = await prisma.aprobacion.findMany({
    where: {
      ...(clienteId ? { clienteId } : {}),
      ...(estado ? { estado: estado as any } : {}),
    },
    include: {
      cliente: { select: { id: true, nombre: true, empresa: true } },
      tarea: { select: { id: true, nombre: true } },
      entregable: { select: { id: true, nombre: true, tipo: true } },
      aprobador: { select: { id: true, nombre: true, rol: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(aprobaciones);
}

const crearSchema = z.object({
  clienteId: z.string(),
  entregableId: z.string().optional(),
  tareaId: z.string().optional(),
  tipoAprobador: z.enum(["CLIENTE", "DIRECTOR"]).default("CLIENTE"),
  deadline: z.string().optional(),
  notas: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const body = await request.json();
    const data = crearSchema.parse(body);

    const aprobacion = await prisma.aprobacion.create({
      data: {
        clienteId: data.clienteId,
        entregableId: data.entregableId,
        tareaId: data.tareaId,
        tipo: data.tipoAprobador,
        deadline: data.deadline ? new Date(data.deadline) : undefined,
        estado: "PENDIENTE",
      },
      include: {
        cliente: { select: { nombre: true, empresa: true, email: true, tokenPortal: true } },
        entregable: { select: { nombre: true, tipo: true } },
        tarea: { select: { nombre: true } },
      },
    });

    // Alerta interna
    await prisma.alerta.create({
      data: {
        clienteId: data.clienteId,
        tipo: "APROBACION_PENDIENTE",
        severidad: "IMPORTANTE",
        titulo: `Aprobación pendiente: ${aprobacion.entregable?.nombre ?? aprobacion.tarea?.nombre ?? "Elemento"}`,
        descripcion: `Requiere revisión del ${data.tipoAprobador === "CLIENTE" ? "cliente" : "director"}`,
        referenciaId: data.entregableId ?? data.tareaId,
        referenciaTipo: data.entregableId ? "ENTREGABLE" : "TAREA",
      },
    });

    return NextResponse.json(aprobacion, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Datos inválidos", detalles: err.issues }, { status: 400 });
    }
    console.error("[POST /api/aprobaciones]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

const resolverSchema = z.object({
  aprobacionId: z.string(),
  estado: z.enum(["APROBADO", "RECHAZADO"]),
  aprobadorId: z.string().optional(),
  motivoRechazo: z.string().optional(),
});

export async function PATCH(request: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const body = await request.json();
    const data = resolverSchema.parse(body);

    const aprobacion = await prisma.aprobacion.update({
      where: { id: data.aprobacionId },
      data: {
        estado: data.estado,
        aprobadorId: data.aprobadorId,
        motivoRechazo: data.motivoRechazo,
        resueltaAt: new Date(),
      },
      include: {
        tarea: true,
        entregable: true,
      },
    });

    // Tarea rechazada → volver a EN_PROGRESO + alerta
    if (data.estado === "RECHAZADO" && aprobacion.tareaId) {
      await prisma.tarea.update({
        where: { id: aprobacion.tareaId },
        data: { estado: "EN_PROGRESO", porcentajeCompletado: 75 },
      });
      await prisma.alerta.create({
        data: {
          clienteId: aprobacion.clienteId,
          tipo: "APROBACION_PENDIENTE",
          severidad: "IMPORTANTE",
          titulo: `Aprobación rechazada: ${aprobacion.tarea?.nombre ?? "Tarea"}`,
          descripcion: `Motivo: ${data.motivoRechazo ?? "Sin motivo especificado"}`,
          referenciaId: aprobacion.tareaId,
          referenciaTipo: "TAREA",
        },
      });
    }

    // Entregable aprobado → actualizar estado
    if (data.estado === "APROBADO" && aprobacion.entregableId) {
      await prisma.entregable.update({
        where: { id: aprobacion.entregableId },
        data: { estadoAprobacion: "APROBADO" },
      });
    }

    return NextResponse.json(aprobacion);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
    }
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
