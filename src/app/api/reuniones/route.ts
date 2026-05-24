import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { createSupabaseServer } from "@/lib/supabase/server";

const crearReunionSchema = z.object({
  clienteId: z.string(),
  titulo: z.string().min(2),
  fecha: z.string().datetime(),
  duracionMin: z.number().int().min(15).default(60),
  tipo: z.string().default("VIRTUAL"),
  notas: z.string().optional(),
  link: z.string().url().optional(),
  asistentesIds: z.array(z.string()).optional(),
});

export async function GET(request: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const clienteId = searchParams.get("clienteId");

  const reuniones = await prisma.reunion.findMany({
    where: clienteId ? { clienteId } : undefined,
    include: {
      asistentes: { include: { usuario: { select: { id: true, nombre: true, rol: true } } } },
      documentos: { select: { reunionId: true, nombre: true, url: true } },
    },
    orderBy: { fecha: "desc" },
  });

  return NextResponse.json(reuniones);
}

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const body = await request.json();
    const data = crearReunionSchema.parse(body);

    const reunion = await prisma.reunion.create({
      data: {
        clienteId: data.clienteId,
        titulo: data.titulo,
        fecha: new Date(data.fecha),
        duracionMin: data.duracionMin,
        tipo: data.tipo,
        notas: data.notas,
        link: data.link,
        asistentes: data.asistentesIds?.length
          ? { create: data.asistentesIds.map((id) => ({ usuarioId: id })) }
          : undefined,
      },
      include: {
        asistentes: { include: { usuario: { select: { id: true, nombre: true } } } },
      },
    });

    return NextResponse.json(reunion, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Datos inválidos", detalles: err.issues }, { status: 400 });
    }
    console.error("[POST /api/reuniones]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
