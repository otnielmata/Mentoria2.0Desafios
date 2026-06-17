import "./globals.css";

export const metadata = {
  title: "Desafios Mentoria 2.0",
  description: "Painel operacional dos desafios da mentoria.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,400..700,0..1,-50..200"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
