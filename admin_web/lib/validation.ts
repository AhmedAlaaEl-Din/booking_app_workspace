// Pure form validation. Returns a message per field, or an empty object.
import type { ServiceInput } from "./types";

export type FieldErrors<K extends string> = Partial<Record<K, string>>;

// Same idea as the app's validator: something@something.something
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateLogin(
  email: string,
  password: string,
): FieldErrors<"email" | "password"> {
  const errors: FieldErrors<"email" | "password"> = {};
  if (email.trim() === "") errors.email = "Enter your email.";
  else if (!EMAIL_PATTERN.test(email.trim()))
    errors.email = "Enter a valid email address.";
  if (password === "") errors.password = "Enter your password.";
  return errors;
}

// Limits shared with validService() in firestore.rules.
export const SERVICE_LIMITS = {
  nameMax: 60,
  descriptionMax: 300,
  durationMax: 480, // 8 hours: the whole opening day (09:00–17:00)
};

/** What the service form holds: text from the inputs, plus the checkbox. */
export type ServiceFormValues = {
  name: string;
  description: string;
  durationMinutes: string;
  price: string;
  active: boolean;
};

// A whole number, optionally with 1 or 2 decimals: 25, 25.5, 25.50
const PRICE_PATTERN = /^\d+(\.\d{1,2})?$/;

type ServiceField ="name" | "description" | "durationMinutes" | "price";

/** Checks the form and, if it is valid, converts it to Firestore fields. */
export function validateServiceForm(values: ServiceFormValues): {
  errors: FieldErrors<ServiceField>;
  data?: ServiceInput;
} {
  const errors: FieldErrors<ServiceField> = {};
  const name = values.name.trim();
  const description = values.description.trim();
  const duration = Number(values.durationMinutes);
  const price = Number(values.price);

  if (name === "") errors.name = "Enter a name.";
  else if (name.length > SERVICE_LIMITS.nameMax)
    errors.name = `Use at most ${SERVICE_LIMITS.nameMax} characters.`;

  if (description.length > SERVICE_LIMITS.descriptionMax)
    errors.description = `Use at most ${SERVICE_LIMITS.descriptionMax} characters.`;

  if (
    !/^\d+$/.test(values.durationMinutes.trim()) ||
    duration < 1 ||
    duration > SERVICE_LIMITS.durationMax
  )
    errors.durationMinutes = `Enter whole minutes from 1 to ${SERVICE_LIMITS.durationMax}.`;

  // Checked as text, because 0.29 * 100 is not exactly 29 in JavaScript.
  if (!PRICE_PATTERN.test(values.price.trim()))
    errors.price = "Enter a price like 25 or 12.50 (0 or more).";

  if (Object.keys(errors).length > 0) return { errors };
  return {
    errors,
    data: {
      name,
      description,
      durationMinutes: duration,
      price,
      active: values.active,
    },
  };
}
