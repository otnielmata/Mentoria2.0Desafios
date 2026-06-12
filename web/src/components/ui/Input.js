export default function Input({ error, label, name, ...props }) {
  const inputId = props.id || name;
  const errorId = `${inputId}-error`;

  return (
    <label className={`field-group ${error ? "has-error" : ""}`}>
      <span>{label}</span>
      <input
        aria-describedby={error ? errorId : undefined}
        aria-invalid={Boolean(error)}
        id={inputId}
        name={name}
        {...props}
      />
      {error ? (
        <span className="field-error-text" id={errorId}>
          {error}
        </span>
      ) : null}
    </label>
  );
}
