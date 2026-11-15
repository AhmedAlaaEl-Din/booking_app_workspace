import { describe, expect, it } from "vitest";

import {
  validateLogin,
  validateServiceForm,
  type ServiceFormValues,
} from "../../lib/validation";

describe("validateLogin", () => {
  it("asks for both fields when empty", () => {
    expect(validateLogin("", "")).toEqual({
      email: "Enter your email.",
      password: "Enter your password.",
    });
  });
  it("rejects an invalid email", () => {
    expect(validateLogin("not-an-email", "secret").email).toBe(
      "Enter a valid email address.",
    );
  });
  it("accepts a valid email and password", () => {
    expect(validateLogin(" admin@example.com ", "secret")).toEqual({});
  });
});

describe("validateServiceForm", () => {
  const valid: ServiceFormValues = {
    name: " Haircut ",
    description: "Wash, cut and style",
    durationMinutes: "30",
    price: "12.50",
    active: true,
  };

  it("converts valid input to Firestore fields", () => {
    expect(validateServiceForm(valid)).toEqual({
      errors: {},
      data: {
        name: "Haircut",
        description: "Wash, cut and style",
        durationMinutes: 30,
        price: 12.5,
        active: true,
      },
    });
  });

  it("accepts prices whose cents aren't exact in floating point", () => {
    expect(validateServiceForm({ ...valid, price: "0.29" }).data?.price).toBe(
      0.29,
    );
  });

  it("reports every invalid field", () => {
    const result = validateServiceForm({
      name: "  ",
      description: "x".repeat(301),
      durationMinutes: "15.5",
      price: "-3",
      active: false,
    });
    expect(result.data).toBeUndefined();
    expect(Object.keys(result.errors).sort()).toEqual([
      "description",
      "durationMinutes",
      "name",
      "price",
    ]);
  });

  it.each(["0", "481", "", "abc"])("rejects duration %j", (durationMinutes) => {
    expect(
      validateServiceForm({ ...valid, durationMinutes }).errors.durationMinutes,
    ).toBeDefined();
  });

  it.each(["1.234", "", "abc", "1,5"])("rejects price %j", (price) => {
    expect(validateServiceForm({ ...valid, price }).errors.price).toBeDefined();
  });
});
