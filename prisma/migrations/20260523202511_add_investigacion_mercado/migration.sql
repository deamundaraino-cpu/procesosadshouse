-- CreateEnum
CREATE TYPE "EstadoInvestigacion" AS ENUM ('BORRADOR', 'EN_PROCESO', 'COMPLETADO');

-- CreateTable
CREATE TABLE "InvestigacionMercado" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "nombreProducto" TEXT NOT NULL,
    "descripcionProducto" TEXT NOT NULL,
    "checklistInicio" JSONB NOT NULL DEFAULT '[]',
    "buyerPersona" TEXT,
    "nombresProducto" TEXT,
    "dolores" TEXT,
    "objeciones" TEXT,
    "angulosVenta" TEXT,
    "propuestaUnicaValor" TEXT,
    "beneficiosProducto" TEXT,
    "antesYDespues" TEXT,
    "pruebaSocial" TEXT,
    "leadMagnet" TEXT,
    "estructuraLanding" TEXT,
    "estado" "EstadoInvestigacion" NOT NULL DEFAULT 'BORRADOR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvestigacionMercado_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InvestigacionMercado_clienteId_idx" ON "InvestigacionMercado"("clienteId");

-- AddForeignKey
ALTER TABLE "InvestigacionMercado" ADD CONSTRAINT "InvestigacionMercado_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;
