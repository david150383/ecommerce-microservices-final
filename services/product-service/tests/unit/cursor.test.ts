import { encodeCursor, decodeCursor } from "../../src/shared/utils/cursor.util.js";

describe("Cursor Utility Unit Tests", () => {
  it("should encode and decode a valid cursor correctly", () => {
    const date = new Date("2026-09-06T10:00:00.000Z");
    const id = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";

    const cursor = encodeCursor(date, id);
    expect(typeof cursor).toBe("string");

    const decoded = decodeCursor(cursor);
    expect(decoded.id).toBe(id);
    expect(decoded.createdAt.toISOString()).toBe(date.toISOString());
  });

  it("should throw an error for malformed cursor", () => {
    expect(() => decodeCursor("invalid-cursor")).toThrow();
  });
});
