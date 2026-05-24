export const FASES_ALCANZA = [
  {
    codigo: "A1",
    nombre: "Análisis",
    descripcion:
      "Recopilación de información, kick-off, investigación de mercado y auditoría técnica",
    orden: 1,
    diaInicio: 1,
    diaFin: 7,
    color: "#6366f1",
  },
  {
    codigo: "L",
    nombre: "Lanzamiento",
    descripcion:
      "Diseño de estrategia, estructura de campañas, configuración técnica y activación",
    orden: 2,
    diaInicio: 8,
    diaFin: 14,
    color: "#8b5cf6",
  },
  {
    codigo: "C",
    nombre: "Creativos",
    descripcion:
      "Producción de copys, diseños, videos y materiales creativos para campañas",
    orden: 3,
    diaInicio: 8,
    diaFin: 18,
    color: "#ec4899",
  },
  {
    codigo: "A2",
    nombre: "Ajuste",
    descripcion:
      "Monitoreo inicial, optimizaciones técnicas y ajustes de performance",
    orden: 4,
    diaInicio: 15,
    diaFin: 25,
    color: "#f59e0b",
  },
  {
    codigo: "N",
    nombre: "Nutrir",
    descripcion:
      "Implementación de audiencias, retargeting, email flows y contenido orgánico",
    orden: 5,
    diaInicio: 22,
    diaFin: 32,
    color: "#10b981",
  },
  {
    codigo: "Z",
    nombre: "Zonas de Mejora",
    descripcion:
      "Análisis profundo de resultados, identificación de oportunidades y reporte de performance",
    orden: 6,
    diaInicio: 30,
    diaFin: 38,
    color: "#3b82f6",
  },
  {
    codigo: "A3",
    nombre: "Acciones de Escalado",
    descripcion:
      "Estrategia de escala, nuevos verticales, propuesta de continuidad y cierre del período",
    orden: 7,
    diaInicio: 38,
    diaFin: 45,
    color: "#14b8a6",
  },
] as const;

export type FaseCodigo = (typeof FASES_ALCANZA)[number]["codigo"];
