import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { instanciarTareasCliente } from "@/lib/alcanza/instanciar-tareas";
import { createSupabaseServer } from "@/lib/supabase/server";
import { crearEstructuraDriveCliente } from "@/lib/drive";

const crearClienteSchema = z.object({
  nombre: z.string().min(2),
  empresa: z.string().min(2),
  email: z.string().email(),
  telefono: z.string().optional(),
  pais: z.string().optional(),
  sector: z.string().optional(),
  accountManagerId: z.string().optional(),
  notas: z.string().optional(),
});

export async function GET(request: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const estado = searchParams.get("estado");

  const clientes = await prisma.cliente.findMany({
    where: estado ? { estado: estado as any } : undefined,
    include: {
      accountManager: { select: { id: true, nombre: true, email: true } },
      tareas: {
        select: { id: true, estado: true, porcentajeCompletado: true, faseId: true },
      },
      alertas: {
        where: { estado: "ACTIVA" },
        select: { id: true, severidad: true, tipo: true },
      },
      _count: { select: { tareas: true, documentos: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(clientes);
}

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const body = await request.json();
    const data = crearClienteSchema.parse(body);

    const cliente = await prisma.cliente.create({
      data: {
        nombre: data.nombre,
        empresa: data.empresa,
        email: data.email,
        telefono: data.telefono,
        pais: data.pais,
        sector: data.sector,
        accountManagerId: data.accountManagerId,
        notas: data.notas,
        fechaIngreso: new Date(),
      },
    });

    // Instanciar tareas automáticamente
    await instanciarTareasCliente(cliente.id, cliente.fechaIngreso);

    // Crear estructura Google Drive (no bloquea si falla — credentials pueden estar vacías en dev)
    if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_ID !== "[GOOGLE_CLIENT_ID]") {
      try {
        const accountManager = data.accountManagerId
          ? await prisma.usuario.findUnique({ where: { id: data.accountManagerId }, select: { email: true } })
          : null;
        const { rootId } = await crearEstructuraDriveCliente(
          data.empresa,
          data.email,
          accountManager?.email
        );
        await prisma.cliente.update({ where: { id: cliente.id }, data: { driveRootId: rootId } });
      } catch (driveErr) {
        console.warn("[Drive] No se pudo crear estructura:", driveErr);
      }
    }

    return NextResponse.json(cliente, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Datos inválidos", detalles: err.issues }, { status: 400 });
    }
    console.error("[POST /api/clientes]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
