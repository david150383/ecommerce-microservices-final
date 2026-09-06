import {
  createItemSchema,
  updateItemSchema,
  itemIdParamSchema,
} from "../../src/modules/item/schemas/item.schema.js";

describe("Item Schemas (Unit)", () => {
  const validUuid = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";

  describe("createItemSchema", () => {
    it("should accept valid item", () => {
      const payload = {
        name: "Standard Item",
        description: "A great item description",
        price: 49.99,
      };
      const parsed = createItemSchema.parse(payload);
      expect(parsed.name).toBe("Standard Item");
      expect(parsed.price).toBe(49.99);
      expect(parsed.description).toBe("A great item description");
    });

    it("should default description to empty string if omitted", () => {
      const parsed = createItemSchema.parse({
        name: "Item Without Description",
        price: 10,
      });
      expect(parsed.description).toBe("");
    });

    it("should reject empty name", () => {
      expect(() =>
        createItemSchema.parse({
          name: "   ",
          price: 10,
        }),
      ).toThrow(/Name is required/);
    });

    it("should reject non-positive price", () => {
      expect(() =>
        createItemSchema.parse({
          name: "Invalid Item",
          price: 0,
        }),
      ).toThrow(/greater than 0/);
    });
  });

  describe("updateItemSchema", () => {
    it("should accept partial updates", () => {
      const parsed = updateItemSchema.parse({ price: 15.5 });
      expect(parsed.price).toBe(15.5);
      expect(parsed.name).toBeUndefined();
    });
  });

  describe("itemIdParamSchema", () => {
    it("should accept valid UUID", () => {
      expect(itemIdParamSchema.parse({ id: validUuid }).id).toBe(validUuid);
    });

    it("should reject invalid UUID", () => {
      expect(() => itemIdParamSchema.parse({ id: "invalid" })).toThrow(/Invalid item ID format/);
    });
  });
});
