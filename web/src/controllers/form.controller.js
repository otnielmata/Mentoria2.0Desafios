"use client";

import { useRef, useState } from "react";
import {
  clearSensitiveValues,
  createFormStatus,
  createIdleFormStatus,
  createLoadingFormStatus,
  createStatusAfterFieldChange,
  createStatusFromResult,
  getEventField,
  mergeFieldValue,
} from "@/models/form.model";

function defaultShouldClearSensitiveFields() {
  return false;
}

export function useFormController({
  initialValues,
  onSubmit,
  onSuccess,
  sensitiveFields = [],
  shouldClearSensitiveFields = defaultShouldClearSensitiveFields,
  successMessage = "",
}) {
  const submittingRef = useRef(false);
  const [form, setForm] = useState(initialValues);
  const [status, setStatus] = useState(createIdleFormStatus());

  function resetForm(nextValues = initialValues) {
    setForm(nextValues);
    setStatus(createIdleFormStatus());
  }

  function updateField(event) {
    const { name, value } = getEventField(event);

    setForm((current) => mergeFieldValue(current, name, value));
    setStatus((current) => createStatusAfterFieldChange(current, name));
  }

  async function handleSubmit(event) {
    event?.preventDefault?.();

    if (submittingRef.current) {
      return {
        ok: false,
        message: "Aguarde a resposta antes de enviar novamente.",
        type: "loading",
      };
    }

    submittingRef.current = true;
    setStatus(createLoadingFormStatus());

    try {
      const result = await onSubmit(form);

      if (!result.ok) {
        if (shouldClearSensitiveFields(result)) {
          setForm((current) => clearSensitiveValues(current, sensitiveFields));
        }

        setStatus(createStatusFromResult(result));
        return result;
      }

      setStatus(createStatusFromResult(result, successMessage));
      await onSuccess?.(result, {
        createFormStatus,
        resetForm,
        setForm,
        setStatus,
      });

      return result;
    } finally {
      submittingRef.current = false;
    }
  }

  return {
    form,
    formState: status.state,
    handleSubmit,
    isSubmitting: status.state === "loading",
    resetForm,
    setForm,
    setStatus,
    status,
    updateField,
  };
}
