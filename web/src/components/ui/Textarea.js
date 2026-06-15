export default function Textarea({ error = "", helpText = "", label, name, ...props }) {
  const textareaId = props.id || name;
  const errorId = error ? `${name}-error` : undefined;
  const helpId = helpText ? `${name}-help` : undefined;
  const describedBy = [errorId, helpId].filter(Boolean).join(" ") || undefined;

  return (
    <label className="field-group" htmlFor={textareaId}>
      <span>{label}</span>
      <textarea
        aria-describedby={describedBy}
        aria-errormessage={errorId}
        aria-invalid={Boolean(error)}
        id={textareaId}
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
