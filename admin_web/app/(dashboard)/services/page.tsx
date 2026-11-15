"use client";

// "/services": list, add, edit, activate/deactivate. There is no delete:
// old bookings point to their service, so a service is deactivated instead
// (firestore.rules also refuses deletes).
import { useState } from "react";

import { ServiceForm } from "@/components/service-form";
import { EmptyView, ErrorView, Spinner } from "@/components/state-views";
import { useData } from "@/lib/data-context";
import { formatDuration, formatPrice } from "@/lib/dates";
import { friendlyError } from "@/lib/errors";
import { addService, setServiceActive, updateService } from "@/lib/firestore";
import type { Service } from "@/lib/types";

export default function ServicesPage() {
  const { services } = useData();
  // undefined = form closed, null = adding, a Service = editing it
  const [editing, setEditing] = useState<Service | null | undefined>();
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [toggleError, setToggleError] = useState<string | null>(null);

  async function toggleActive(service: Service) {
    setTogglingId(service.id);
    setToggleError(null);
    try {
      await setServiceActive(service.id, !service.active);
    } catch (err) {
      setToggleError(friendlyError(err));
    } finally {
      setTogglingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Services</h1>
          <p className="text-sm text-slate-500">
            Inactive services are hidden from customers. Services are never
            deleted, because existing bookings refer to them.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setEditing(null)}
          className="btn-primary"
        >
          Add service
        </button>
      </div>

      {toggleError && <ErrorView message={toggleError} />}

      {services.state === "loading" && <Spinner />}
      {services.state === "error" && <ErrorView message={services.message} />}
      {services.state === "ready" && services.data.length === 0 && (
        <EmptyView message="No services yet. Add the first one." />
      )}
      {services.state === "ready" && services.data.length > 0 && (
        <ul className="grid gap-4 lg:grid-cols-2">
          {services.data.map((s) => (
            <li key={s.id} className="card flex flex-col gap-3 p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="font-semibold">{s.name}</h2>
                  <p className="text-sm text-slate-600">
                    {s.description || "No description"}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${
                    s.active
                      ? "bg-teal-50 text-teal-800 ring-teal-200"
                      : "bg-slate-100 text-slate-600 ring-slate-200"
                  }`}
                >
                  {s.active ? "Active" : "Inactive"}
                </span>
              </div>
              <p className="text-sm font-medium text-teal-800">
                {formatDuration(s.durationMinutes)} · {formatPrice(s.price)}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditing(s)}
                  className="btn-secondary"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => toggleActive(s)}
                  disabled={togglingId === s.id}
                  className="btn-secondary"
                >
                  {togglingId === s.id
                    ? "Saving…"
                    : s.active
                      ? "Deactivate"
                      : "Activate"}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {editing !== undefined && (
        <ServiceForm
          service={editing}
          onSave={(input) =>
            editing ? updateService(editing.id, input) : addService(input)
          }
          onClose={() => setEditing(undefined)}
        />
      )}
    </div>
  );
}
