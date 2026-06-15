import "./globals.css";

export const metadata = {
  title: "Desafios Mentoria 2.0",
  description: "Painel operacional dos desafios da mentoria.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
