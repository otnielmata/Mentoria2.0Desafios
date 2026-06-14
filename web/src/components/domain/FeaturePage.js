export default function FeaturePage({ content }) {
  return (
    <main className="content-layout">
      <section className="section-header">
        <p className="eyebrow">{content.eyebrow}</p>
        <h1>{content.title}</h1>
        <p>{content.summary}</p>
      </section>

      <section className="feature-panel" aria-label={`Resumo de ${content.title}`}>
        <div>
          <span className="status-pill">MVP</span>
          <h2>Escopo preparado</h2>
        </div>
        <ul className="feature-list">
          {content.highlights.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>
    </main>
  );
}
