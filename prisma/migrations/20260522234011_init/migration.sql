-- CreateEnum
CREATE TYPE "Rol" AS ENUM ('DIRECTOR', 'ACCOUNT_MANAGER', 'ESPECIALISTA', 'CLIENTE');

-- CreateEnum
CREATE TYPE "EstadoCliente" AS ENUM ('ACTIVO', 'PAUSADO', 'COMPLETADO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "EstadoTarea" AS ENUM ('PENDIENTE', 'EN_PROGRESO', 'BLOQUEADA', 'COMPLETADA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "TipoAprobador" AS ENUM ('CLIENTE', 'DIRECTOR', 'ACCOUNT_MANAGER');

-- CreateEnum
CREATE TYPE "OrigenDato" AS ENUM ('IA', 'CLIENTE', 'EQUIPO', 'IMPORTADO');

-- CreateEnum
CREATE TYPE "TipoAlerta" AS ENUM ('VENCIDA', 'CONFLICTO_IA', 'APROBACION_PENDIENTE', 'BLOQUEADA', 'IA_GENERO', 'DISCREPANCIA');

-- CreateEnum
CREATE TYPE "SeveridadAlerta" AS ENUM ('CRITICO', 'IMPORTANTE', 'COMPLEMENTARIO');

-- CreateEnum
CREATE TYPE "EstadoAlerta" AS ENUM ('ACTIVA', 'RESUELTA', 'DESCARTADA');

-- CreateEnum
CREATE TYPE "TipoEntregable" AS ENUM ('DOCUMENTO', 'PDF', 'DATOS', 'CREATIVOS', 'ACCESOS', 'REPORTE');

-- CreateEnum
CREATE TYPE "FormatoReporte" AS ENUM ('HTML', 'TEXTO', 'PDF');

-- CreateEnum
CREATE TYPE "EstadoAprobacion" AS ENUM ('PENDIENTE', 'APROBADO', 'RECHAZADO');

-- CreateTable
CREATE TABLE "Usuario" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "rol" "Rol" NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cliente" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "empresa" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "telefono" TEXT,
    "pais" TEXT,
    "sector" TEXT,
    "estado" "EstadoCliente" NOT NULL DEFAULT 'ACTIVO',
    "fechaIngreso" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "accountManagerId" TEXT,
    "tokenPortal" TEXT NOT NULL,
    "driveRootId" TEXT,
    "notas" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cliente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Fase" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "orden" INTEGER NOT NULL,
    "diaInicio" INTEGER NOT NULL,
    "diaFin" INTEGER NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#6366f1',

    CONSTRAINT "Fase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TareaTemplate" (
    "id" TEXT NOT NULL,
    "faseId" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "diaInicio" INTEGER NOT NULL,
    "duracionDias" INTEGER NOT NULL DEFAULT 1,
    "esParalela" BOOLEAN NOT NULL DEFAULT false,
    "requiereAprobacion" BOOLEAN NOT NULL DEFAULT false,
    "tipoAprobador" "TipoAprobador",
    "puntoIA" BOOLEAN NOT NULL DEFAULT false,
    "nivelAutomatizacionIA" INTEGER NOT NULL DEFAULT 0,
    "responsableRoles" "Rol"[],
    "subtareas" JSONB,
    "entregablesTemplate" JSONB,
    "bloqueadoresPor" TEXT[],

    CONSTRAINT "TareaTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tarea" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "faseId" TEXT NOT NULL,
    "templateCodigo" TEXT,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "diaInicio" INTEGER NOT NULL,
    "diaFin" INTEGER NOT NULL,
    "fechaInicio" TIMESTAMP(3),
    "fechaVencimiento" TIMESTAMP(3),
    "estado" "EstadoTarea" NOT NULL DEFAULT 'PENDIENTE',
    "porcentajeCompletado" INTEGER NOT NULL DEFAULT 0,
    "esParalela" BOOLEAN NOT NULL DEFAULT false,
    "requiereAprobacion" BOOLEAN NOT NULL DEFAULT false,
    "tipoAprobador" "TipoAprobador",
    "puntoIA" BOOLEAN NOT NULL DEFAULT false,
    "nivelAutomatizacionIA" INTEGER NOT NULL DEFAULT 0,
    "notas" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tarea_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TareaDependencia" (
    "tareaId" TEXT NOT NULL,
    "prereqId" TEXT NOT NULL,

    CONSTRAINT "TareaDependencia_pkey" PRIMARY KEY ("tareaId","prereqId")
);

-- CreateTable
CREATE TABLE "TareaAsignado" (
    "tareaId" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,

    CONSTRAINT "TareaAsignado_pkey" PRIMARY KEY ("tareaId","usuarioId")
);

-- CreateTable
CREATE TABLE "TareaComentario" (
    "id" TEXT NOT NULL,
    "tareaId" TEXT NOT NULL,
    "autorNombre" TEXT NOT NULL,
    "autorRol" "Rol" NOT NULL,
    "contenido" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TareaComentario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Entregable" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "tareaId" TEXT,
    "nombre" TEXT NOT NULL,
    "tipo" "TipoEntregable" NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "url" TEXT,
    "driveId" TEXT,
    "requiereAprobacion" BOOLEAN NOT NULL DEFAULT false,
    "estadoAprobacion" "EstadoAprobacion" NOT NULL DEFAULT 'PENDIENTE',
    "aprobadoPor" "TipoAprobador",
    "notas" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Entregable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Aprobacion" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "tareaId" TEXT,
    "entregableId" TEXT,
    "tipo" "TipoAprobador" NOT NULL,
    "estado" "EstadoAprobacion" NOT NULL DEFAULT 'PENDIENTE',
    "aprobadorId" TEXT,
    "motivoRechazo" TEXT,
    "deadline" TIMESTAMP(3),
    "resueltaAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Aprobacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentoCargado" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "nombreOriginal" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "tamanoBytes" INTEGER NOT NULL,
    "storageUrl" TEXT NOT NULL,
    "textoProcesado" TEXT,
    "extraccionIA" JSONB,
    "procesadoAt" TIMESTAMP(3),
    "validadoAt" TIMESTAMP(3),
    "validadoPor" TEXT,
    "tieneConflictos" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentoCargado_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BriefSeccion" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "seccionCodigo" TEXT NOT NULL,
    "seccionNombre" TEXT NOT NULL,
    "orden" INTEGER NOT NULL,
    "campos" JSONB NOT NULL,
    "completado" INTEGER NOT NULL DEFAULT 0,
    "clienteReviso" BOOLEAN NOT NULL DEFAULT false,
    "equipoReviso" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BriefSeccion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BuyerPersona" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "nombre" TEXT,
    "edad" TEXT,
    "genero" TEXT,
    "ubicacion" TEXT,
    "ocupacion" TEXT,
    "ingresos" TEXT,
    "educacion" TEXT,
    "motivaciones" JSONB,
    "frustraciones" JSONB,
    "objetivos" JSONB,
    "comportamiento" JSONB,
    "buyerJourney" JSONB,
    "citas" JSONB,
    "origen" "OrigenDato" NOT NULL DEFAULT 'IA',
    "confianza" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "validado" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BuyerPersona_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Acceso" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "plataforma" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "identificador" TEXT,
    "credenciales" JSONB,
    "estado" TEXT NOT NULL DEFAULT 'PENDIENTE',
    "notas" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Acceso_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reunion" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "duracionMin" INTEGER NOT NULL DEFAULT 60,
    "tipo" TEXT NOT NULL DEFAULT 'VIRTUAL',
    "link" TEXT,
    "notas" TEXT,
    "grabacionUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Reunion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReunionAsistente" (
    "reunionId" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "confirmado" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ReunionAsistente_pkey" PRIMARY KEY ("reunionId","usuarioId")
);

-- CreateTable
CREATE TABLE "ReunionDocumento" (
    "reunionId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "url" TEXT NOT NULL,

    CONSTRAINT "ReunionDocumento_pkey" PRIMARY KEY ("reunionId","nombre")
);

-- CreateTable
CREATE TABLE "Alerta" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "tipo" "TipoAlerta" NOT NULL,
    "severidad" "SeveridadAlerta" NOT NULL,
    "estado" "EstadoAlerta" NOT NULL DEFAULT 'ACTIVA',
    "titulo" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "referenciaId" TEXT,
    "referenciaTipo" TEXT,
    "resueltaAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Alerta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AlertaDestinatario" (
    "alertaId" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "leida" BOOLEAN NOT NULL DEFAULT false,
    "leidaAt" TIMESTAMP(3),

    CONSTRAINT "AlertaDestinatario_pkey" PRIMARY KEY ("alertaId","usuarioId")
);

-- CreateTable
CREATE TABLE "Reporte" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL DEFAULT 'SEMANAL',
    "formato" "FormatoReporte" NOT NULL,
    "titulo" TEXT NOT NULL,
    "contenido" TEXT NOT NULL,
    "periodo" TEXT,
    "storageUrl" TEXT,
    "autoGenerado" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Reporte_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Cliente_tokenPortal_key" ON "Cliente"("tokenPortal");

-- CreateIndex
CREATE INDEX "Cliente_estado_idx" ON "Cliente"("estado");

-- CreateIndex
CREATE INDEX "Cliente_accountManagerId_idx" ON "Cliente"("accountManagerId");

-- CreateIndex
CREATE UNIQUE INDEX "Fase_codigo_key" ON "Fase"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "TareaTemplate_codigo_key" ON "TareaTemplate"("codigo");

-- CreateIndex
CREATE INDEX "Tarea_clienteId_idx" ON "Tarea"("clienteId");

-- CreateIndex
CREATE INDEX "Tarea_faseId_idx" ON "Tarea"("faseId");

-- CreateIndex
CREATE INDEX "Tarea_estado_idx" ON "Tarea"("estado");

-- CreateIndex
CREATE INDEX "Tarea_fechaVencimiento_idx" ON "Tarea"("fechaVencimiento");

-- CreateIndex
CREATE INDEX "Entregable_clienteId_idx" ON "Entregable"("clienteId");

-- CreateIndex
CREATE INDEX "Entregable_estadoAprobacion_idx" ON "Entregable"("estadoAprobacion");

-- CreateIndex
CREATE INDEX "Aprobacion_clienteId_idx" ON "Aprobacion"("clienteId");

-- CreateIndex
CREATE INDEX "Aprobacion_estado_idx" ON "Aprobacion"("estado");

-- CreateIndex
CREATE INDEX "DocumentoCargado_clienteId_idx" ON "DocumentoCargado"("clienteId");

-- CreateIndex
CREATE INDEX "BriefSeccion_clienteId_idx" ON "BriefSeccion"("clienteId");

-- CreateIndex
CREATE UNIQUE INDEX "BriefSeccion_clienteId_seccionCodigo_key" ON "BriefSeccion"("clienteId", "seccionCodigo");

-- CreateIndex
CREATE UNIQUE INDEX "BuyerPersona_clienteId_numero_key" ON "BuyerPersona"("clienteId", "numero");

-- CreateIndex
CREATE INDEX "Acceso_clienteId_idx" ON "Acceso"("clienteId");

-- CreateIndex
CREATE INDEX "Alerta_clienteId_idx" ON "Alerta"("clienteId");

-- CreateIndex
CREATE INDEX "Alerta_estado_idx" ON "Alerta"("estado");

-- CreateIndex
CREATE INDEX "Alerta_severidad_idx" ON "Alerta"("severidad");

-- CreateIndex
CREATE INDEX "Alerta_createdAt_idx" ON "Alerta"("createdAt");

-- CreateIndex
CREATE INDEX "Reporte_clienteId_idx" ON "Reporte"("clienteId");

-- CreateIndex
CREATE INDEX "Reporte_createdAt_idx" ON "Reporte"("createdAt");

-- AddForeignKey
ALTER TABLE "Cliente" ADD CONSTRAINT "Cliente_accountManagerId_fkey" FOREIGN KEY ("accountManagerId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TareaTemplate" ADD CONSTRAINT "TareaTemplate_faseId_fkey" FOREIGN KEY ("faseId") REFERENCES "Fase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tarea" ADD CONSTRAINT "Tarea_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tarea" ADD CONSTRAINT "Tarea_faseId_fkey" FOREIGN KEY ("faseId") REFERENCES "Fase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TareaDependencia" ADD CONSTRAINT "TareaDependencia_tareaId_fkey" FOREIGN KEY ("tareaId") REFERENCES "Tarea"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TareaDependencia" ADD CONSTRAINT "TareaDependencia_prereqId_fkey" FOREIGN KEY ("prereqId") REFERENCES "Tarea"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TareaAsignado" ADD CONSTRAINT "TareaAsignado_tareaId_fkey" FOREIGN KEY ("tareaId") REFERENCES "Tarea"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TareaAsignado" ADD CONSTRAINT "TareaAsignado_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TareaComentario" ADD CONSTRAINT "TareaComentario_tareaId_fkey" FOREIGN KEY ("tareaId") REFERENCES "Tarea"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Entregable" ADD CONSTRAINT "Entregable_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Entregable" ADD CONSTRAINT "Entregable_tareaId_fkey" FOREIGN KEY ("tareaId") REFERENCES "Tarea"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Aprobacion" ADD CONSTRAINT "Aprobacion_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Aprobacion" ADD CONSTRAINT "Aprobacion_tareaId_fkey" FOREIGN KEY ("tareaId") REFERENCES "Tarea"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Aprobacion" ADD CONSTRAINT "Aprobacion_entregableId_fkey" FOREIGN KEY ("entregableId") REFERENCES "Entregable"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Aprobacion" ADD CONSTRAINT "Aprobacion_aprobadorId_fkey" FOREIGN KEY ("aprobadorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentoCargado" ADD CONSTRAINT "DocumentoCargado_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BriefSeccion" ADD CONSTRAINT "BriefSeccion_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuyerPersona" ADD CONSTRAINT "BuyerPersona_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Acceso" ADD CONSTRAINT "Acceso_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reunion" ADD CONSTRAINT "Reunion_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReunionAsistente" ADD CONSTRAINT "ReunionAsistente_reunionId_fkey" FOREIGN KEY ("reunionId") REFERENCES "Reunion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReunionAsistente" ADD CONSTRAINT "ReunionAsistente_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReunionDocumento" ADD CONSTRAINT "ReunionDocumento_reunionId_fkey" FOREIGN KEY ("reunionId") REFERENCES "Reunion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alerta" ADD CONSTRAINT "Alerta_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlertaDestinatario" ADD CONSTRAINT "AlertaDestinatario_alertaId_fkey" FOREIGN KEY ("alertaId") REFERENCES "Alerta"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlertaDestinatario" ADD CONSTRAINT "AlertaDestinatario_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reporte" ADD CONSTRAINT "Reporte_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;
