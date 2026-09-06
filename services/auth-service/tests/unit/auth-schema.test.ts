import {
  registerSchema,
  loginSchema,
  refreshSchema,
  UserRoleSchema,
} from "../../src/modules/auth/schemas/auth.schema.js";

describe("Auth Schemas (Unit)", () => {
  describe("UserRoleSchema", () => {
    it("should accept valid user roles", () => {
      expect(UserRoleSchema.parse("CUSTOMER")).toBe("CUSTOMER");
      expect(UserRoleSchema.parse("ADMIN")).toBe("ADMIN");
      expect(UserRoleSchema.parse("SUPPORT")).toBe("SUPPORT");
    });

    it("should reject invalid user roles", () => {
      expect(() => UserRoleSchema.parse("SUPERADMIN")).toThrow();
      expect(() => UserRoleSchema.parse("")).toThrow();
    });
  });

  describe("registerSchema", () => {
    const validPayload = {
      email: "test.user@example.com",
      password: "Password123!",
      first_name: "Test",
      last_name: "User",
      role: "CUSTOMER",
    };

    it("should validate a correct registration payload", () => {
      const result = registerSchema.parse(validPayload);
      expect(result.email).toBe("test.user@example.com");
      expect(result.first_name).toBe("Test");
      expect(result.last_name).toBe("User");
      expect(result.role).toBe("CUSTOMER");
    });

    it("should default role to CUSTOMER if omitted", () => {
      const { role: _role, ...withoutRole } = validPayload;
      const result = registerSchema.parse(withoutRole);
      expect(result.role).toBe("CUSTOMER");
    });

    it("should lowercase email", () => {
      const result = registerSchema.parse({
        ...validPayload,
        email: "Test.Caps@Example.COM",
      });
      expect(result.email).toBe("test.caps@example.com");
    });

    it("should reject invalid email formats", () => {
      expect(() =>
        registerSchema.parse({
          ...validPayload,
          email: "not-an-email",
        }),
      ).toThrow(/Invalid email/);
    });

    it("should enforce password complexity requirements", () => {
      // Too short (< 8 chars)
      expect(() =>
        registerSchema.parse({
          ...validPayload,
          password: "Pass1",
        }),
      ).toThrow(/8 characters/);

      // No uppercase
      expect(() =>
        registerSchema.parse({
          ...validPayload,
          password: "password123",
        }),
      ).toThrow(/uppercase/);

      // No lowercase
      expect(() =>
        registerSchema.parse({
          ...validPayload,
          password: "PASSWORD123",
        }),
      ).toThrow(/lowercase/);

      // No number
      expect(() =>
        registerSchema.parse({
          ...validPayload,
          password: "PasswordNoNum",
        }),
      ).toThrow(/number/);
    });

    it("should reject empty first_name or last_name", () => {
      expect(() =>
        registerSchema.parse({
          ...validPayload,
          first_name: "   ",
        }),
      ).toThrow();

      expect(() =>
        registerSchema.parse({
          ...validPayload,
          last_name: "",
        }),
      ).toThrow();
    });
  });

  describe("loginSchema", () => {
    it("should validate a correct login payload", () => {
      const result = loginSchema.parse({
        email: "user@example.com",
        password: "secretPassword",
      });
      expect(result.email).toBe("user@example.com");
      expect(result.password).toBe("secretPassword");
      expect(result.client_type).toBe("WEB"); // default
    });

    it("should reject missing password", () => {
      expect(() =>
        loginSchema.parse({
          email: "user@example.com",
          password: "",
        }),
      ).toThrow(/Password is required/);
    });
  });

  describe("refreshSchema", () => {
    it("should allow optional refreshToken", () => {
      const result = refreshSchema.parse({});
      expect(result.refreshToken).toBeUndefined();
    });

    it("should accept valid string refreshToken", () => {
      const result = refreshSchema.parse({
        refreshToken: "abcdefghijklmnopqrstuvwxyz123456",
      });
      expect(result.refreshToken).toBe("abcdefghijklmnopqrstuvwxyz123456");
    });
  });
});
