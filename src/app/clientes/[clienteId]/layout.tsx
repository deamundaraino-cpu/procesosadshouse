"use client";

import Link from "next/link";
import { useParams, usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "timeline", label: "Timeline" },
  { href: "tareas", label: "Tareas" },
  { href: "brief", label: "Brief" },
  { href: "documentos", label: "Documentos" },
  { href: "investigacion", label: "Investigación" },
  { href: "entregables", label: "Entregables" },
  { href: "reportes", label: "Reportes" },
  { href: "reuniones", label: "Reuniones" },
  { href: "drive", label: "Drive" },
  { href: "editar", label: "⚙ Editar" },
];

export default function ClienteLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const pathname = usePathname();
  const clienteId = params.clienteId as string;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top nav */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center gap-1 overflow-x-auto">
            <Link
              href="/dashboard"
              className="shrink-0 text-slate-500 hover:text-slate-700 text-sm px-3 py-4 border-b-2 border-transparent hover:border-slate-300 transition-colors"
            >
              ← Dashboard
            </Link>
            <div className="h-5 w-px bg-slate-200 mx-1 shrink-0" />
            {NAV_ITEMS.map((item) => {
              const href = `/clientes/${clienteId}/${item.href}`;
              const isActive = pathname.startsWith(href);
              return (
                <Link
                  key={item.href}
                  href={href}
                  className={`shrink-0 text-sm px-4 py-4 border-b-2 transition-colors whitespace-nowrap ${
                    isActive
                      ? "border-indigo-600 text-indigo-700 font-medium"
                      : "border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      {children}
    </div>
  );
}
