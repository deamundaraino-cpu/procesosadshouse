import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { createSupabaseServer } from "@/lib/supabase/server";

const updateSchema = z.object({
  nombre: z.string().min(2).optional(),
  empresa: z.string().min(2).optional(),
  email: z.string().email().optional(),
  telefono: z.string().optional(),
  pais: z.string().optional(),
  sector: z.string().optional(),
  estado: z.enum(["ACTIVO", "PAUSADO", "COMPLETADO", "CANCELADO"]).optional(),
  accountManagerId: z.string().optional(),
  notas: z.string().optional(),
  driveRootId: z.string().optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: { clienteId: string } }
) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const cliente = await prisma.cliente.findUnique({
    where: { id: params.clienteId },
    include: {
      accountManager: { select: { id: true, nombre: true, email: true } },
      tareas: {
        include: {
          fase: true,
          asignados: { include: { usuario: { select: { id: true, nombre: true, rol: true } } } },
          dependencias: { include: { prereq: { select: { id: true, nombre: true, estado: true } } } },
          _count: { select: { entregables: true, comentarios: true } },
        },
        orderBy: { diaInicio: "asc" },
      },
      brief: { orderBy: { orden: "asc" } },
      buyerPersonas: { orderBy: { numero: "asc" } },
      accesos: true,
      alertas: { where: { estado: "ACTIVA" }, orderBy: { createdAt: "desc" } },
      reuniones: { orderBy: { fecha: "desc" }, take: 10 },
      _count: { select: { documentos: true, entregables: true, reportes: true } },
    },
  });

  if (!cliente) {
    return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 });
  }

  return NextResponse.json(cliente);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { clienteId: string } }
) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const body = await request.json();
    const data = updateSchema.parse(body);

    const cliente = await prisma.cliente.update({
      where: { id: params.clienteId },
      data,
    });

    return NextResponse.json(cliente);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Datos inválidos", detalles: err.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
