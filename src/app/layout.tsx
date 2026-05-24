import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AdsHouse — Plataforma Onboarding A.L.C.A.N.Z.A.",
  description: "Sistema interno de gestión del proceso de onboarding de clientes",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="antialiased bg-slate-50 text-slate-900">{children}</body>
    </html>
  );
}
