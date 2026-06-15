export default function Select({ children, error = "", helpText = "", label, name, ...props }) {
  const selectId = props.id || name;
  const errorId = error ? `${name}-error` : undefined;
  const helpId = helpText ? `${name}-help` : undefined;
  const describedBy = [errorId, helpId].filter(Boolean).join(" ") || undefined;

  return (
    <label className="field-group" htmlFor={selectId}>
      <span>{label}</span>
      <select
        aria-describedby={describedBy}
        aria-errormessage={errorId}
        aria-invalid={Boolean(error)}
        id={selectId}
        name={name}
        {...props}
      >
        {children}
      </select>
      {helpText ? (
        <small className="field-help" id={helpId}>
          {helpText}
        </small>
      ) : null}
      {error ? (
        <small className="field-error" id={errorId}>
          <span className="visually-hidden">Erro: </span>
          {error}
        </small>
      ) : null}
    </label>
  );
}
