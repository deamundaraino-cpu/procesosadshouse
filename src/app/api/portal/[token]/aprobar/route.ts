import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { enviarResultadoAprobacion } from "@/lib/email";

const schema = z.object({
  aprobacionId: z.string(),
  estado: z.enum(["APROBADO", "RECHAZADO"]),
  motivoRechazo: z.string().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  // Verificar token → obtener cliente
  const cliente = await prisma.cliente.findUnique({
    where: { tokenPortal: params.token },
    select: {
      id: true,
      empresa: true,
      accountManager: { select: { email: true, nombre: true } },
    },
  });
  if (!cliente) return NextResponse.json({ error: "Token inválido" }, { status: 403 });

  try {
    const body = await request.json();
    const data = schema.parse(body);

    // Verificar que la aprobación pertenece a este cliente
    const aprobacion = await prisma.aprobacion.findFirst({
      where: { id: data.aprobacionId, clienteId: cliente.id, estado: "PENDIENTE" },
      include: { tarea: true, entregable: true },
    });
    if (!aprobacion) return NextResponse.json({ error: "Aprobación no encontrada" }, { status: 404 });

    await prisma.aprobacion.update({
      where: { id: data.aprobacionId },
      data: {
        estado: data.estado,
        motivoRechazo: data.motivoRechazo,
        resueltaAt: new Date(),
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
          clienteId: cliente.id,
          tipo: "APROBACION_PENDIENTE",
          severidad: "CRITICO",
          titulo: `Cliente rechazó: ${aprobacion.tarea?.nombre ?? "Tarea"}`,
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

    // Email al account manager
    if (cliente.accountManager) {
      await enviarResultadoAprobacion({
        amEmail: cliente.accountManager.email,
        amNombre: cliente.accountManager.nombre,
        clienteEmpresa: cliente.empresa,
        clienteId: cliente.id,
        itemNombre: aprobacion.entregable?.nombre ?? aprobacion.tarea?.nombre ?? "Elemento",
        estado: data.estado,
        motivoRechazo: data.motivoRechazo,
      });
    }

    return NextResponse.json({ ok: true, estado: data.estado });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
    }
    console.error("[POST /api/portal/[token]/aprobar]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
