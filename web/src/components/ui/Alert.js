export default function Alert({ children, type = "" }) {
  if (!children) {
    return null;
  }

  const isError = type === "error";

  return (
    <p
      aria-live={isError ? "assertive" : "polite"}
      className={`alert ${isError ? "alert-error" : "alert-success"}`}
      role={isError ? "alert" : "status"}
    >
      {children}
    </p>
  );
}
