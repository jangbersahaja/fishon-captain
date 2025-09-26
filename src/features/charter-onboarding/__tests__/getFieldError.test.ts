import { getFieldError } from "@features/charter-onboarding/utils/validation";
import { describe, expect, it } from "vitest";

type Err = { message?: string; [k: string]: unknown };
type ErrorShape = Record<string, unknown>;

describe("getFieldError", () => {
  it("returns undefined for empty path", () => {
    expect(getFieldError({}, undefined)).toBeUndefined();
  });

  it("navigates simple path and returns message", () => {
    const errors: ErrorShape = { name: { message: "Required" } as Err };
    expect(getFieldError(errors, "name")).toBe("Required");
  });

  it("navigates nested dotted path", () => {
    const errors: ErrorShape = {
      boat: { lengthFeet: { message: "Too short" } as Err },
    };
    expect(getFieldError(errors, "boat.lengthFeet")).toBe("Too short");
  });

  it("handles array index path", () => {
    const errors: ErrorShape = {
      trips: [{ price: { message: "Invalid price" } as Err }],
    };
    expect(getFieldError(errors, "trips[0].price")).toBe("Invalid price");
  });

  it("returns undefined when path missing", () => {
    const errors: ErrorShape = { boat: {} };
    expect(getFieldError(errors, "boat.capacity")).toBeUndefined();
  });
});
