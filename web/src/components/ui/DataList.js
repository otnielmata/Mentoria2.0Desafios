export default function DataList({ children, className = "", title }) {
  return (
    <section className={`list-panel ${className}`.trim()} aria-live="polite">
      {title ? <h2>{title}</h2> : null}
      {children}
    </section>
  );
}
