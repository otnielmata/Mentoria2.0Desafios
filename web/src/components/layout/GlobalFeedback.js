import { globalFeedbackDefaults } from "@/config/navigation";

export default function GlobalFeedback({ isLoading = false, message = "", type = "info" }) {
  return (
    <div
      aria-busy={isLoading}
      aria-label={globalFeedbackDefaults.messageRegionLabel}
      aria-live="polite"
      className={`global-feedback ${message ? "global-feedback-visible" : ""}`}
      role="status"
    >
      {message ? <p className={`global-feedback-message global-feedback-${type}`}>{message}</p> : null}
    </div>
  );
}
