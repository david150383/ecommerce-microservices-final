import argon2 from "argon2";

describe("Password Hashing (Unit)", () => {
  const plainPassword = "SecretPassword123!";

  it("should hash passwords using argon2id", async () => {
    const hash = await argon2.hash(plainPassword, {
      type: argon2.argon2id,
    });

    expect(hash).toBeDefined();
    expect(hash.startsWith("$argon2id$")).toBe(true);
  });

  it("should verify correct password against the hash", async () => {
    const hash = await argon2.hash(plainPassword, {
      type: argon2.argon2id,
    });

    const isMatch = await argon2.verify(hash, plainPassword);
    expect(isMatch).toBe(true);
  });

  it("should reject incorrect password against the hash", async () => {
    const hash = await argon2.hash(plainPassword, {
      type: argon2.argon2id,
    });

    const isMatch = await argon2.verify(hash, "WrongPassword123!");
    expect(isMatch).toBe(false);
  });
});
