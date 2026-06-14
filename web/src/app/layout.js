import AppShell from "@/components/layout/AppShell";
import AuthGuard from "@/components/auth/AuthGuard";
import ThemeProvider from "@/components/theme/ThemeProvider";
import "./globals.css";

export const metadata = {
  title: "Desafios Mentoria 2.0",
  description: "Aplicacao web inicial para desafios, pontuacao, ranking e autenticacao.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <AuthGuard>
            <AppShell>{children}</AppShell>
          </AuthGuard>
        </ThemeProvider>
      </body>
    </html>
  );
}
