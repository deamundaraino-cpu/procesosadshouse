import { chatCompletion } from "./openrouter";

export const SECCIONES_INVESTIGACION = [
  { id: "buyerPersona",         label: "Buyer Persona",              icon: "👤", maxTokens: 1200 },
  { id: "nombresProducto",      label: "Nombres del Producto",       icon: "🏷️", maxTokens: 400  },
  { id: "dolores",              label: "Dolores",                    icon: "😣", maxTokens: 600  },
  { id: "objeciones",           label: "Objeciones",                 icon: "🚧", maxTokens: 600  },
  { id: "angulosVenta",         label: "Ángulos de Venta",           icon: "🎯", maxTokens: 800  },
  { id: "propuestaUnicaValor",  label: "Propuesta Única de Valor",   icon: "💎", maxTokens: 800  },
  { id: "beneficiosProducto",   label: "Beneficios del Producto",    icon: "✨", maxTokens: 900  },
  { id: "antesYDespues",        label: "Antes y Después",            icon: "🔄", maxTokens: 800  },
  { id: "pruebaSocial",         label: "Prueba Social",              icon: "⭐", maxTokens: 800  },
  { id: "leadMagnet",           label: "Lead Magnet",                icon: "🎁", maxTokens: 600  },
  { id: "estructuraLanding",    label: "Estructura de Landing",      icon: "📄", maxTokens: 3000 },
] as const;

export type SeccionId = typeof SECCIONES_INVESTIGACION[number]["id"];

export const CHECKLIST_INICIAL = [
  { id: "amazon",       texto: "Encontrar el producto en Amazon",           completado: false },
  { id: "fraseClave",   texto: "Definir la frase clave del producto",       completado: false },
  { id: "helium10",     texto: "Analizar con Helium 10",                    completado: false },
  { id: "alibaba",      texto: "Buscar en Alibaba / AliExpress",            completado: false },
  { id: "google",       texto: "Buscar en Google",                          completado: false },
  { id: "preciosOtras", texto: "Revisar precios en otras plataformas",      completado: false },
  { id: "similares",    texto: "Productos similares y posibles Upsells",    completado: false },
  { id: "adspy",        texto: "Buscar en Adspy, Minea, FB Ads",            completado: false },
];

function contexto(nombre: string, descripcion: string) {
  return `Producto: ${nombre}

Descripción del producto (tomada de plataformas como Amazon, MercadoLibre, Alibaba, etc.):
${descripcion}

---
`;
}

function buildPrompt(seccion: SeccionId, nombre: string, descripcion: string): string {
  const ctx = contexto(nombre, descripcion);

  const prompts: Record<SeccionId, string> = {

    buyerPersona: `${ctx}
Con base a la descripción dada del producto, elabora una descripción detallada y consistente del Buyer Persona. Sigue esta estructura:

1. Descripción general del perfil
2. Datos Demográficos: edad, género, ubicación, nivel de ingresos (promedio latinoamericano), nivel educativo, estado civil, hijos.
3. Datos Psicográficos: personalidad, valores, intereses, estilo de vida, influencias.
4. Necesidades y Deseos: problemas que resuelve el producto, beneficios buscados, expectativas.
5. Comportamiento de Compra: dónde compra, canales online, tipo de contenido preferido, proceso de compra, objeciones principales.
6. Frases y Citas representativas del buyer persona.
7. Motivaciones de compra y palabras clave para motivar la decisión.
8. 3 ejemplos de modelos (hombre o mujer) para videos del producto con escenario ideal.`,

    nombresProducto: `${ctx}
Tomando en cuenta la descripción del producto y pensando en una proyección de ventas masivo, dame 5 opciones de nombre para este producto. Los nombres deben ser:
- Llamativos y con potencial de recordación
- Cortos (máximo 2 palabras)
- Fáciles de pronunciar en español
- Transmitir el beneficio principal

Para cada nombre incluye una breve justificación de por qué funciona.`,

    dolores: `${ctx}
Escribe una lista de 5 dolores específicos que sufren las personas que NO tienen este producto. Para cada dolor:
- Describe el dolor con precisión y empatía
- Muestra cómo afecta su vida cotidiana
- Usa lenguaje cercano y emocional, no técnico`,

    objeciones: `${ctx}
Escribe una lista de 5 objeciones principales por las cuales una persona NO compraría este producto. Para cada objeción:
- Describe la objeción tal como la pensaría el cliente
- Explica por qué surge esa objeción
- Sugiere brevemente cómo rebatirla`,

    angulosVenta: `${ctx}
Tomando en cuenta los dolores y objeciones típicas al comprar este tipo de producto, escribe 5 ángulos de venta diferentes. Cada ángulo debe:
- Tener un título gancho
- Explicar el enfoque desde el cual se vende (ej: transformación, miedo, aspiración, prueba social, autoridad)
- Incluir un ejemplo de cómo se comunicaría ese ángulo en un anuncio`,

    propuestaUnicaValor: `${ctx}
Tomando en cuenta los dolores, objeciones, buyer persona y ángulos de venta de este producto, escribe la Propuesta Única de Valor (PUV). Incluye:
1. La PUV en una sola frase poderosa
2. Desarrollo de por qué es única y diferenciadora
3. Cómo comunicarla en una foto del producto: describe exactamente qué imagen usar, qué texto superponer, composición, colores y mensaje visual.`,

    beneficiosProducto: `${ctx}
Tomando en cuenta el buyer persona, dolores, ángulos de venta y objeciones, escribe los principales beneficios del producto. Sé muy persuasivo, enfócate en la transformación y el alivio del dolor. Incluye:
1. Lista de beneficios principales (mínimo 6), con énfasis en la transformación emocional
2. Qué soluciona concretamente el producto
3. Cómo reflejar estos beneficios en una foto del producto: imagen exacta, texto a usar, composición y mensaje visual`,

    antesYDespues: `${ctx}
Tomando en cuenta los dolores, deseos de transformación y objeciones, escribe cómo mostrar un antes y después de este producto para convencer al cliente. Incluye:
1. Descripción detallada del ANTES: situación, emoción, contexto del cliente sin el producto
2. Descripción detallada del DESPUÉS: transformación, emoción, contexto del cliente con el producto
3. Cómo plasmarlo en una foto o imagen de antes/después: composición exacta, textos, colores, enfoque visual
Nota: resalta resistencia, calidad, diseño y funcionalidad — no solo impermeabilidad.`,

    pruebaSocial: `${ctx}
Tomando en cuenta los dolores, deseos de transformación y objeciones, escribe cómo reflejar prueba social para convencer al cliente. Incluye:
1. 3 tipos de prueba social recomendados para este producto (reseñas, testimonios, UGC, etc.)
2. Frases de testimonio tipo que podrías usar (inventadas pero verosímiles)
3. Cómo plasmarlo en una foto o imagen: composición exacta, textos, estrellas, nombres, escenario visual
Nota: resalta resistencia, calidad, diseño y funcionalidad — no solo impermeabilidad.`,

    leadMagnet: `${ctx}
Tomando en cuenta los dolores, deseos de transformación y objeciones, dame una idea de lead magnet o infoproducto que puedas regalar por la compra de este producto. Incluye:
1. Nombre del lead magnet
2. Formato (PDF, video, acceso a grupo, etc.)
3. Contenido exacto que incluiría (tabla de contenidos o estructura)
4. Por qué ese lead magnet complementa el producto y reduce la fricción de compra
Nota: resalta resistencia, calidad, diseño y uso — no solo impermeabilidad.`,

    estructuraLanding: `${ctx}
Eres un experto en Marketing digital, ecommerce y ventas online. Escribe toda la información de la página de venta (landing page) para este producto. Utiliza persuasión y toca distintos dolores del público objetivo. Sigue esta estructura EXACTA:

1. Nombre del producto: llamativo, corto y vendedor
2. Descripción de 3 líneas: propuesta de valor y transformación
3. 4 características del producto: cortas, persuasivas, con emoji cada una
4. Información detallada:
   - ¿Cómo funciona el producto? (qué hace exactamente para el cliente y cómo logra la transformación)
   - Instrucciones de uso paso a paso
   - Beneficios principales para el cliente
   - Frase de seguridad de envío (3-5 días, pago contraentrega, descuento por pago anticipado)
5. Garantía de funcionalidad con plazo en días
6. Frase de aval de expertos (genérica, no en primera persona)
7. 3 beneficios adicionales con frase de autoridad y confianza cada uno
8. Tabla de comparación: 8 ítems donde el producto muestra ventaja clara vs. competencia
9. 4 Bullet Points del producto: cada uno es una frase + texto de 5 líneas de respaldo + aval experto si aplica
10. 5 estadísticas de clientes satisfechos con porcentajes (prueba social)
11. Frase que realce la propuesta de valor
12. Frase corta que motive la compra y resalte efectividad
13. Especificaciones del producto: dimensiones, contenido, uso y recomendaciones
14. Frase corta + pregunta persuasiva que venda el producto
15. Frase corta con gatillos mentales que venda el producto`,
  };

  return prompts[seccion];
}

export async function generarSeccion(
  seccion: SeccionId,
  nombreProducto: string,
  descripcionProducto: string
): Promise<string> {
  const seccionDef = SECCIONES_INVESTIGACION.find((s) => s.id === seccion);
  const maxTokens = seccionDef?.maxTokens ?? 1200;
  const prompt = buildPrompt(seccion, nombreProducto, descripcionProducto);

  return chatCompletion(
    [{ role: "user", content: prompt }],
    { max_tokens: maxTokens }
  );
}
