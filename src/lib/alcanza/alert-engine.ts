import { prisma } from "@/lib/db";

interface AlertaGenerada {
  clienteId: string;
  tipo: string;
  severidad: "CRITICO" | "IMPORTANTE" | "COMPLEMENTARIO";
  titulo: string;
  descripcion: string;
  referenciaId?: string;
  referenciaTipo?: string;
}

async function crearAlertaSiNoExiste(alerta: AlertaGenerada): Promise<boolean> {
  // Evitar duplicados: si ya hay una alerta activa igual para ese ref, no crear otra
  const existente = await prisma.alerta.findFirst({
    where: {
      clienteId: alerta.clienteId,
      tipo: alerta.tipo as any,
      referenciaId: alerta.referenciaId,
      estado: "ACTIVA",
    },
  });
  if (existente) return false;

  await prisma.alerta.create({ data: { ...alerta, tipo: alerta.tipo as any, severidad: alerta.severidad as any } });
  return true;
}

// ─── Escanear tareas vencidas ─────────────────────────────────────────────────

async function escanearTareasVencidas(clienteId: string): Promise<AlertaGenerada[]> {
  const hoy = new Date();
  const tareas = await prisma.tarea.findMany({
    where: {
      clienteId,
      estado: { notIn: ["COMPLETADA", "CANCELADA"] },
      fechaVencimiento: { lt: hoy },
    },
    select: { id: true, nombre: true, fechaVencimiento: true },
  });

  return tareas.map((t) => ({
    clienteId,
    tipo: "TAREA_VENCIDA",
    severidad: "CRITICO" as const,
    titulo: `Tarea vencida: ${t.nombre}`,
    descripcion: `Venció el ${t.fechaVencimiento!.toLocaleDateString("es-MX")} y aún no está completada.`,
    referenciaId: t.id,
    referenciaTipo: "TAREA",
  }));
}

// ─── Escanear tareas bloqueadas sin actividad ─────────────────────────────────

async function escanearTareasBloqueadas(clienteId: string): Promise<AlertaGenerada[]> {
  const hace3Dias = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
  const tareas = await prisma.tarea.findMany({
    where: {
      clienteId,
      estado: "BLOQUEADA",
      updatedAt: { lt: hace3Dias },
    },
    select: { id: true, nombre: true, updatedAt: true },
  });

  return tareas.map((t) => ({
    clienteId,
    tipo: "BLOQUEADOR_DETECTADO",
    severidad: "IMPORTANTE" as const,
    titulo: `Tarea bloqueada sin acción: ${t.nombre}`,
    descripcion: `Lleva ${Math.floor((Date.now() - t.updatedAt.getTime()) / 86400000)} días bloqueada sin movimiento.`,
    referenciaId: t.id,
    referenciaTipo: "TAREA",
  }));
}

// ─── Escanear aprobaciones con deadline vencido ───────────────────────────────

async function escanearAprobacionesVencidas(clienteId: string): Promise<AlertaGenerada[]> {
  const hoy = new Date();
  const aprobaciones = await prisma.aprobacion.findMany({
    where: {
      clienteId,
      estado: "PENDIENTE",
      deadline: { lt: hoy },
    },
    include: {
      entregable: { select: { nombre: true } },
      tarea: { select: { nombre: true } },
    },
  });

  return aprobaciones.map((a) => ({
    clienteId,
    tipo: "APROBACION_PENDIENTE",
    severidad: "CRITICO" as const,
    titulo: `Aprobación vencida: ${a.entregable?.nombre ?? a.tarea?.nombre ?? "Elemento"}`,
    descripcion: `El deadline de aprobación venció el ${a.deadline!.toLocaleDateString("es-MX")}.`,
    referenciaId: a.id,
    referenciaTipo: "APROBACION",
  }));
}

// ─── Escanear conflictos IA no resueltos ──────────────────────────────────────

async function escanearConflictosIA(clienteId: string): Promise<AlertaGenerada[]> {
  const documentos = await prisma.documentoCargado.findMany({
    where: { clienteId },
    select: { id: true, nombre: true, extraccionIA: true },
  });

  const alertas: AlertaGenerada[] = [];
  for (const doc of documentos) {
    const campos = (doc.extraccionIA as any[]) ?? [];
    const conflictos = campos.filter((c: any) => c.conflicto === true);
    if (conflictos.length > 0) {
      alertas.push({
        clienteId,
        tipo: "CONFLICTO_IA",
        severidad: "IMPORTANTE",
        titulo: `Conflicto de datos en: ${doc.nombre}`,
        descripcion: `${conflictos.length} campo(s) con información contradictoria detectados por IA. Requiere revisión.`,
        referenciaId: doc.id,
        referenciaTipo: "DOCUMENTO",
      });
    }
  }
  return alertas;
}

// ─── Motor principal ──────────────────────────────────────────────────────────

export async function ejecutarMotorAlertas(soloClienteId?: string): Promise<{
  procesados: number;
  alertasCreadas: number;
}> {
  const clientes = await prisma.cliente.findMany({
    where: {
      estado: { notIn: ["COMPLETADO", "CANCELADO"] },
      ...(soloClienteId ? { id: soloClienteId } : {}),
    },
    select: {
      id: true,
    },
  });

  let alertasCreadas = 0;

  for (const cliente of clientes) {
    const [vencidas, bloqueadas, aprobacionesVencidas, conflictos] = await Promise.all([
      escanearTareasVencidas(cliente.id),
      escanearTareasBloqueadas(cliente.id),
      escanearAprobacionesVencidas(cliente.id),
      escanearConflictosIA(cliente.id),
    ]);

    const todas = [...vencidas, ...bloqueadas, ...aprobacionesVencidas, ...conflictos];

    for (const alerta of todas) {
      const creada = await crearAlertaSiNoExiste(alerta);
      if (creada) alertasCreadas++;
    }
  }

  return { procesados: clientes.length, alertasCreadas };
}
