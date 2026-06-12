import AppShell from "@/components/layout/AppShell";
import ThemeProvider from "@/components/theme/ThemeProvider";
import "./globals.css";

export const metadata = {
  title: "Desafios Mentoria 2.0",
  description: "Aplicacao web inicial para desafios, heuristicas e autenticacao.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <AppShell>{children}</AppShell>
        </ThemeProvider>
      </body>
    </html>
  );
}
