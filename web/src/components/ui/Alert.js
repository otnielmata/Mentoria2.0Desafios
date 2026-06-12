export default function Alert({ children, type = "" }) {
  if (!children) {
    return null;
  }

  return (
    <p className={`alert ${type === "error" ? "alert-error" : "alert-success"}`}>
      {children}
    </p>
  );
}
