export default function Input({ label, name, ...props }) {
  return (
    <label className="field-group">
      <span>{label}</span>
      <input name={name} {...props} />
    </label>
  );
}
