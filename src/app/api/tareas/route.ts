import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createSupabaseServer } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const clienteId = searchParams.get("clienteId");
  const faseId = searchParams.get("faseId");
  const estado = searchParams.get("estado");

  if (!clienteId) {
    return NextResponse.json({ error: "clienteId requerido" }, { status: 400 });
  }

  const tareas = await prisma.tarea.findMany({
    where: {
      clienteId,
      ...(faseId ? { faseId } : {}),
      ...(estado ? { estado: estado as any } : {}),
    },
    include: {
      fase: true,
      asignados: { include: { usuario: { select: { id: true, nombre: true, rol: true } } } },
      dependencias: { include: { prereq: { select: { id: true, nombre: true, estado: true, templateCodigo: true } } } },
      requeridaPor: { include: { tarea: { select: { id: true, nombre: true, estado: true } } } },
      entregables: { select: { id: true, nombre: true, tipo: true, estadoAprobacion: true } },
      _count: { select: { comentarios: true } },
    },
    orderBy: [{ diaInicio: "asc" }, { nombre: "asc" }],
  });

  return NextResponse.json(tareas);
}
