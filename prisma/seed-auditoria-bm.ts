import { config } from "dotenv";
import { fileURLToPath } from "node:url";
config({ path: fileURLToPath(new URL("../.env", import.meta.url)) });

import { PrismaClient } from "../src/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL?.replace("sslmode=require", "sslmode=no-verify"),
  ssl: { rejectUnauthorized: false },
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter } as any);

const ITEMS: { seccion: string; texto: string; orden: number }[] = [
  // 1. Estructura del Business Manager
  { seccion: "1. Estructura del Business Manager", texto: "El BM está a nombre del cliente y verificado", orden: 0 },
  { seccion: "1. Estructura del Business Manager", texto: "El cliente es administrador y propietario de los activos", orden: 1 },
  { seccion: "1. Estructura del Business Manager", texto: "No hay accesos de personas externas o ex-empleados", orden: 2 },
  { seccion: "1. Estructura del Business Manager", texto: "No hay duplicidad de Business Managers", orden: 3 },
  { seccion: "1. Estructura del Business Manager", texto: "Se identificó la cuenta publicitaria principal", orden: 4 },
  { seccion: "1. Estructura del Business Manager", texto: "El BM tiene verificación de identidad y dominio", orden: 5 },

  // 2. Activos principales vinculados
  { seccion: "2. Activos principales vinculados", texto: "Página de Facebook conectada correctamente", orden: 6 },
  { seccion: "2. Activos principales vinculados", texto: "Cuenta de Instagram conectada al BM", orden: 7 },
  { seccion: "2. Activos principales vinculados", texto: "Cuenta publicitaria activa y asignada", orden: 8 },
  { seccion: "2. Activos principales vinculados", texto: "Catálogo de productos vinculado (si aplica)", orden: 9 },
  { seccion: "2. Activos principales vinculados", texto: "Pixel de Facebook creado y conectado", orden: 10 },
  { seccion: "2. Activos principales vinculados", texto: "API de conversiones instalada", orden: 11 },
  { seccion: "2. Activos principales vinculados", texto: "Dominio verificado", orden: 12 },
  { seccion: "2. Activos principales vinculados", texto: "Eventos agregados y configurados", orden: 13 },

  // 3. Seguimiento y eventos
  { seccion: "3. Seguimiento y eventos", texto: "Pixel instalado correctamente en el sitio web", orden: 14 },
  { seccion: "3. Seguimiento y eventos", texto: "Se rastrean eventos clave (ViewContent, AddToCart, Purchase)", orden: 15 },
  { seccion: "3. Seguimiento y eventos", texto: "API de conversiones activo", orden: 16 },
  { seccion: "3. Seguimiento y eventos", texto: "Dominio verificado y con prioridad de eventos", orden: 17 },
  { seccion: "3. Seguimiento y eventos", texto: "No hay duplicación de eventos", orden: 18 },

  // 4. Análisis de la cuenta publicitaria
  { seccion: "4. Análisis de la cuenta publicitaria", texto: "La cuenta tiene historial de campañas", orden: 19 },
  { seccion: "4. Análisis de la cuenta publicitaria", texto: "No hay bloqueos ni penalizaciones", orden: 20 },
  { seccion: "4. Análisis de la cuenta publicitaria", texto: "Se han usado campañas de conversión y pruebas A/B", orden: 21 },
  { seccion: "4. Análisis de la cuenta publicitaria", texto: "Públicos estructurados y pruebas hechas", orden: 22 },
  { seccion: "4. Análisis de la cuenta publicitaria", texto: "Creativos con variedad de formatos", orden: 23 },
  { seccion: "4. Análisis de la cuenta publicitaria", texto: "Datos de rendimiento disponibles", orden: 24 },

  // 5. Públicos y segmentaciones
  { seccion: "5. Públicos y segmentaciones", texto: "Públicos guardados correctamente", orden: 25 },
  { seccion: "5. Públicos y segmentaciones", texto: "Públicos personalizados creados (pixel, lista, engagement)", orden: 26 },
  { seccion: "5. Públicos y segmentaciones", texto: "Públicos similares (lookalikes) creados", orden: 27 },
  { seccion: "5. Públicos y segmentaciones", texto: "Hay públicos con buen rendimiento histórico", orden: 28 },

  // 6. Creatividades y biblioteca de anuncios
  { seccion: "6. Creatividades y biblioteca de anuncios", texto: "Creativos variados (imagen, video, carrusel)", orden: 29 },
  { seccion: "6. Creatividades y biblioteca de anuncios", texto: "Biblioteca de anuncios con campañas activas", orden: 30 },
  { seccion: "6. Creatividades y biblioteca de anuncios", texto: "Copy y visual coherentes con la propuesta", orden: 31 },
  { seccion: "6. Creatividades y biblioteca de anuncios", texto: "Se han hecho pruebas de creatividad", orden: 32 },

  // 7. Configuración de pagos
  { seccion: "7. Configuración de pagos", texto: "Método de pago válido y activo", orden: 33 },
  { seccion: "7. Configuración de pagos", texto: "No hay errores ni rechazos recientes", orden: 34 },
  { seccion: "7. Configuración de pagos", texto: "Facturación correcta", orden: 35 },
  { seccion: "7. Configuración de pagos", texto: "Límites de gasto controlados", orden: 36 },

  // 8. Seguridad y control de activos
  { seccion: "8. Seguridad y control de activos", texto: "Activada la doble autenticación (2FA)", orden: 37 },
  { seccion: "8. Seguridad y control de activos", texto: "Historial de accesos limpio", orden: 38 },
  { seccion: "8. Seguridad y control de activos", texto: "El cliente es propietario de página, pixel, catálogo", orden: 39 },
  { seccion: "8. Seguridad y control de activos", texto: "No hay conexiones sospechosas ni activos perdidos", orden: 40 },
];

async function main() {
  // Buscar cliente cris.tributario
  const clientes = await prisma.cliente.findMany({
    select: { id: true, empresa: true, nombre: true },
  });

  console.log("Clientes disponibles:");
  clientes.forEach((c) => console.log(`  [${c.id}] ${c.empresa} — ${c.nombre}`));

  // Buscar tarea de auditoría (primera coincidencia que contenga "Audit")
  const tareas = await prisma.tarea.findMany({
    where: { nombre: { contains: "Audit", mode: "insensitive" } },
    include: { cliente: { select: { empresa: true } } },
  });

  if (tareas.length === 0) {
    // Intentar con "Técnica" o revisar todas las tareas
    const todas = await prisma.tarea.findMany({
      select: { id: true, nombre: true, clienteId: true },
      take: 20,
    });
    console.log("\nNo se encontró tarea con 'Audit'. Primeras 20 tareas:");
    todas.forEach((t) => console.log(`  [${t.id}] ${t.nombre} (cliente: ${t.clienteId})`));
    return;
  }

  console.log("\nTareas de auditoría encontradas:");
  tareas.forEach((t) => console.log(`  [${t.id}] ${t.nombre} — ${(t as any).cliente?.empresa}`));

  // Usar la primera tarea de auditoría encontrada
  const tarea = tareas[0];
  console.log(`\nCargando ${ITEMS.length} ítems en tarea: "${tarea.nombre}" [${tarea.id}]`);

  // Eliminar sub-items existentes para no duplicar
  const deleted = await prisma.subItemTarea.deleteMany({ where: { tareaId: tarea.id } });
  console.log(`  → ${deleted.count} ítems previos eliminados`);

  // Insertar todos los ítems
  await prisma.subItemTarea.createMany({
    data: ITEMS.map((item) => ({ tareaId: tarea.id, ...item })),
  });

  console.log(`  ✓ ${ITEMS.length} ítems cargados correctamente`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
