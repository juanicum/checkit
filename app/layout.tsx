import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ChecKit | Redactor IA ChequeaBolivia",
  description: "Herramienta interna para redactar verificaciones con apoyo de IA, ficha estructurada, chat guiado y base de datos."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
