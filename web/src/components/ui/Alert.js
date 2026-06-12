export default function Alert({ children, type = "" }) {
  if (!children) {
    return null;
  }

  return (
    <p
      className={`alert ${type === "error" ? "alert-error" : "alert-success"}`}
      role={type === "error" ? "alert" : "status"}
    >
      {children}
    </p>
  );
}
