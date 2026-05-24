import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { createSupabaseServer } from "@/lib/supabase/server";

const createSchema = z.object({
  clienteId: z.string(),
  tareaId: z.string().optional(),
  nombre: z.string().min(1),
  tipo: z.enum(["DOCUMENTO", "PRESENTACION", "REPORTE", "CREATIVE", "ESTRATEGIA", "OTRO"]),
  url: z.string().url().optional(),
  requiereAprobacion: z.boolean().default(false),
  notas: z.string().optional(),
});

export async function GET(request: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const clienteId = searchParams.get("clienteId");

  const entregables = await prisma.entregable.findMany({
    where: clienteId ? { clienteId } : undefined,
    include: {
      tarea: { select: { id: true, nombre: true, fase: { select: { codigo: true, color: true } } } },
      aprobaciones: { orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(entregables);
}

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const body = await request.json();
    const data = createSchema.parse(body);

    const entregable = await prisma.entregable.create({
      data: {
        clienteId: data.clienteId,
        tareaId: data.tareaId,
        nombre: data.nombre,
        tipo: data.tipo as any,
        url: data.url,
        requiereAprobacion: data.requiereAprobacion,
        notas: data.notas,
        estadoAprobacion: "PENDIENTE",
      },
    });

    return NextResponse.json(entregable, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Datos inválidos", detalles: err.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
