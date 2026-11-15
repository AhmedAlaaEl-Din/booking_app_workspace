"use client";

// The add/edit form for a service, shown in a dialog.
import { useState } from "react";

import { Modal } from "@/components/modal";
import { friendlyError } from "@/lib/errors";
import type { Service, ServiceInput } from "@/lib/types";
import {
  SERVICE_LIMITS,
  validateServiceForm,
  type ServiceFormValues,
} from "@/lib/validation";

export function ServiceForm({
  service,
  onSave,
  onClose,
}: {
  service: Service | null; // null = add a new service
  onSave: (input: ServiceInput) => Promise<void>;
  onClose: () => void;
}) {
  const [values, setValues] = useState<ServiceFormValues>({
    name: service?.name ?? "",
    description: service?.description ?? "",
    durationMinutes: service ? String(service.durationMinutes) : "",
    price: service ? String(service.price) : "",
    active: service?.active ?? true,
  });
  const [errors, setErrors] = useState<
    ReturnType<typeof validateServiceForm>["errors"]
  >({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  function set<K extends keyof ServiceFormValues>(
    key: K,
    value: ServiceFormValues[K],
  ) {
    setValues({ ...values, [key]: value });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const result = validateServiceForm(values);
    setErrors(result.errors);
    if (!result.data) return;

    setSaving(true);
    setSaveError(null);
    try {
      await onSave(result.data);
      onClose();
    } catch (err) {
      setSaveError(friendlyError(err));
      setSaving(false);
    }
  }

  return (
    <Modal
      title={service ? "Edit service" : "Add service"}
      onClose={saving ? () => {} : onClose}
    >
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <Field id="name" label="Name" error={errors.name}>
          <input
            id="name"
            value={values.name}
            maxLength={SERVICE_LIMITS.nameMax}
            onChange={(e) => set("name", e.target.value)}
            className="input"
          />
        </Field>

        <Field id="description" label="Description" error={errors.description}>
          <textarea
            id="description"
            rows={2}
            value={values.description}
            maxLength={SERVICE_LIMITS.descriptionMax}
            onChange={(e) => set("description", e.target.value)}
            className="input"
          />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field
            id="durationMinutes"
            label="Duration (minutes)"
            error={errors.durationMinutes}
          >
            <input
              id="durationMinutes"
              inputMode="numeric"
              value={values.durationMinutes}
              onChange={(e) => set("durationMinutes", e.target.value)}
              className="input"
            />
          </Field>
          <Field id="price" label="Price ($)" error={errors.price}>
            <input
              id="price"
              inputMode="decimal"
              value={values.price}
              onChange={(e) => set("price", e.target.value)}
              className="input"
            />
          </Field>
        </div>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={values.active}
            onChange={(e) => set("active", e.target.checked)}
            className="h-4 w-4 accent-teal-700"
          />
          <span>Active (customers can book it)</span>
        </label>

        {saveError && (
          <p role="alert" className="text-sm text-red-700">
            {saveError}
          </p>
        )}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="btn-secondary"
          >
            Cancel
          </button>
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function Field({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="label">
        {label}
      </label>
      {children}
      {error && <p className="field-error">{error}</p>}
    </div>
  );
}
