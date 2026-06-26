"use client";

export default function GlobalError({ error, reset }) {
  return (
    <html lang="pt-BR">
      <body>
        <main
          style={{
            minHeight: "100vh",
            display: "grid",
            placeItems: "center",
            padding: "24px",
            background: "#f6f7f9",
            color: "#18202f",
            fontFamily: "Arial, Helvetica, sans-serif",
          }}
        >
          <section
            style={{
              width: "100%",
              maxWidth: "520px",
              padding: "32px",
              borderRadius: "16px",
              background: "#ffffff",
              boxShadow: "0 10px 28px rgba(15, 23, 42, 0.08)",
            }}
          >
            <h1 style={{ margin: 0, fontSize: "28px", lineHeight: 1.1 }}>Algo saiu do esperado</h1>
            <p style={{ margin: "12px 0 0", color: "#667085", lineHeight: 1.5 }}>
              Ocorreu um erro ao carregar esta tela. Tente novamente em alguns instantes.
            </p>
            {error && error.digest ? (
              <p style={{ margin: "12px 0 0", color: "#667085", fontSize: "14px" }}>Ref.: {error.digest}</p>
            ) : null}
            <button
              onClick={() => reset()}
              style={{
                marginTop: "20px",
                minHeight: "44px",
                padding: "10px 16px",
                border: 0,
                borderRadius: "8px",
                background: "#8502ab",
                color: "#ffffff",
                font: "inherit",
              }}
              type="button"
            >
              Tentar novamente
            </button>
          </section>
        </main>
      </body>
    </html>
  );
}
