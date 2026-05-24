import { config } from "dotenv";
config({ path: new URL("../.env", import.meta.url).pathname });

import { PrismaClient, Rol, TipoAprobador } from "../src/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { FASES_ALCANZA } from "../src/lib/alcanza/fases";
import { TAREAS_TEMPLATE } from "../src/lib/alcanza/tareas-template";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter } as any);

async function main() {
  console.log("🌱 Iniciando seed...");

  // ─── Fases ─────────────────────────────────────────────────────────────────
  console.log("📌 Creando fases A.L.C.A.N.Z.A...");
  const fasesCreadas: Record<string, string> = {};

  for (const fase of FASES_ALCANZA) {
    const f = await prisma.fase.upsert({
      where: { codigo: fase.codigo },
      update: { ...fase },
      create: { ...fase },
    });
    fasesCreadas[fase.codigo] = f.id;
    console.log(`  ✓ Fase ${fase.codigo}: ${fase.nombre}`);
  }

  // ─── Tareas template ───────────────────────────────────────────────────────
  console.log("📋 Creando plantillas de tareas...");

  for (const t of TAREAS_TEMPLATE) {
    const faseId = fasesCreadas[t.faseCodigo];
    if (!faseId) {
      console.warn(`  ⚠ Fase no encontrada para tarea ${t.codigo}`);
      continue;
    }

    await prisma.tareaTemplate.upsert({
      where: { codigo: t.codigo },
      update: {
        faseId,
        nombre: t.nombre,
        descripcion: t.descripcion,
        diaInicio: t.diaInicio,
        duracionDias: t.duracionDias,
        esParalela: t.esParalela,
        requiereAprobacion: t.requiereAprobacion,
        tipoAprobador: t.tipoAprobador as TipoAprobador | undefined,
        puntoIA: t.puntoIA,
        nivelAutomatizacionIA: t.nivelAutomatizacionIA,
        responsableRoles: t.responsableRoles as Rol[],
        subtareas: t.subtareas,
        entregablesTemplate: t.entregablesTemplate,
        bloqueadoresPor: t.bloqueadoresPor,
      },
      create: {
        codigo: t.codigo,
        faseId,
        nombre: t.nombre,
        descripcion: t.descripcion,
        diaInicio: t.diaInicio,
        duracionDias: t.duracionDias,
        esParalela: t.esParalela,
        requiereAprobacion: t.requiereAprobacion,
        tipoAprobador: t.tipoAprobador as TipoAprobador | undefined,
        puntoIA: t.puntoIA,
        nivelAutomatizacionIA: t.nivelAutomatizacionIA,
        responsableRoles: t.responsableRoles as Rol[],
        subtareas: t.subtareas,
        entregablesTemplate: t.entregablesTemplate,
        bloqueadoresPor: t.bloqueadoresPor,
      },
    });
    console.log(`  ✓ Tarea ${t.codigo}: ${t.nombre}`);
  }

  // ─── Usuario Director inicial ──────────────────────────────────────────────
  console.log("👤 Creando usuario director inicial...");
  await prisma.usuario.upsert({
    where: { email: "cuentas@adshouseagencia.com" },
    update: {},
    create: {
      email: "cuentas@adshouseagencia.com",
      nombre: "Bryan — Director AdsHouse",
      rol: "DIRECTOR",
    },
  });
  console.log("  ✓ Director creado");

  console.log("\n✅ Seed completado exitosamente!");
  console.log(`  - ${FASES_ALCANZA.length} fases creadas`);
  console.log(`  - ${TAREAS_TEMPLATE.length} tareas template creadas`);
  console.log("  - 1 usuario director creado");
}

main()
  .catch((e) => {
    console.error("❌ Error en seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
