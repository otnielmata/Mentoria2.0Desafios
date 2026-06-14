export default function Input({ error = "", helpText = "", label, name, ...props }) {
  const inputId = props.id || name;
  const errorId = error ? `${name}-error` : undefined;
  const helpId = helpText ? `${name}-help` : undefined;
  const describedBy = [errorId, helpId].filter(Boolean).join(" ") || undefined;

  return (
    <label className="field-group" htmlFor={inputId}>
      <span>{label}</span>
      <input
        aria-describedby={describedBy}
        aria-errormessage={errorId}
        aria-invalid={Boolean(error)}
        id={inputId}
        name={name}
        {...props}
      />
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
