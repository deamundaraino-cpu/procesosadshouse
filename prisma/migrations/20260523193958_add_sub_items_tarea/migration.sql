-- CreateEnum
CREATE TYPE "EstadoSubItem" AS ENUM ('PENDIENTE', 'OK', 'NO_APLICA');

-- CreateTable
CREATE TABLE "SubItemTarea" (
    "id" TEXT NOT NULL,
    "tareaId" TEXT NOT NULL,
    "seccion" TEXT,
    "texto" TEXT NOT NULL,
    "estado" "EstadoSubItem" NOT NULL DEFAULT 'PENDIENTE',
    "observacion" TEXT,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubItemTarea_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SubItemTarea_tareaId_idx" ON "SubItemTarea"("tareaId");

-- AddForeignKey
ALTER TABLE "SubItemTarea" ADD CONSTRAINT "SubItemTarea_tareaId_fkey" FOREIGN KEY ("tareaId") REFERENCES "Tarea"("id") ON DELETE CASCADE ON UPDATE CASCADE;
