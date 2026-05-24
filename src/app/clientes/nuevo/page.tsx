"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const SECTORES = [
  "E-commerce", "Salud y Bienestar", "Educación", "Finanzas",
  "Inmobiliario", "Restaurantes / Alimentos", "Turismo",
  "Tecnología / SaaS", "Moda", "Consultoría", "Retail",
  "Servicios Profesionales", "Entretenimiento", "Otro",
];

export default function NuevoClientePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    nombre: "", empresa: "", email: "", telefono: "",
    pais: "México", sector: "", notas: "",
  });

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/clientes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Error al crear cliente");
      setLoading(false);
      return;
    }

    const cliente = await res.json();
    router.push(`/clientes/${cliente.id}/timeline`);
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-4">
          <Link href="/dashboard" className="text-slate-400 hover:text-slate-600 text-sm">
            ← Dashboard
          </Link>
          <span className="font-semibold text-slate-900">Nuevo Cliente</span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-8">
        <div className="bg-white rounded-2xl border border-slate-200 p-8">
          <h1 className="text-lg font-bold text-slate-900 mb-6">
            Registrar nuevo cliente en A.L.C.A.N.Z.A.
          </h1>
          <p className="text-sm text-slate-500 mb-6 -mt-4">
            Al crear el cliente se instanciarán automáticamente las 25 tareas del proceso de 45 días.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Nombre del contacto *
                </label>
                <input
                  value={form.nombre}
                  onChange={(e) => set("nombre", e.target.value)}
                  required
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="María García"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Empresa *
                </label>
                <input
                  value={form.empresa}
                  onChange={(e) => set("empresa", e.target.value)}
                  required
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Mi Empresa S.A."
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                  required
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="maria@empresa.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Teléfono
                </label>
                <input
                  type="tel"
                  value={form.telefono}
                  onChange={(e) => set("telefono", e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="+52 55 1234 5678"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  País
                </label>
                <input
                  value={form.pais}
                  onChange={(e) => set("pais", e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="México"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Sector
                </label>
                <select
                  value={form.sector}
                  onChange={(e) => set("sector", e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                >
                  <option value="">Seleccionar...</option>
                  {SECTORES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Notas internas
              </label>
              <textarea
                value={form.notas}
                onChange={(e) => set("notas", e.target.value)}
                rows={3}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                placeholder="Contexto del cliente, cómo llegó, expectativas especiales..."
              />
            </div>

            {error && (
              <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-xl border border-red-200">
                {error}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Link
                href="/dashboard"
                className="px-6 py-2.5 border border-slate-300 text-slate-700 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </Link>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-indigo-600 text-white py-2.5 rounded-xl font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50"
              >
                {loading ? "Creando..." : "Crear Cliente y Activar Proceso →"}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
