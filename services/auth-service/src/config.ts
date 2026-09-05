function requireEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }

  return value;
}

export const config = {
  port: Number(process.env.PORT || 3001),
  nodeEnv: process.env.NODE_ENV || "development",
  db: {
    host: requireEnv("DB_HOST"),
    port: Number(requireEnv("DB_PORT")),
    user: requireEnv("DB_USER"),
    password: requireEnv("DB_PASSWORD"),
    database: requireEnv("DB_NAME"),
  },

  jwt: {
    issuer: requireEnv("JWT_ISSUER"),
    audience: requireEnv("JWT_AUDIENCE"),
    accessTokenTtl: requireEnv("JWT_ACCESS_TOKEN_TTL"),
    accessTokenTtlSeconds: Number(requireEnv("JWT_ACCESS_TOKEN_TTL_SECONDS")),
    refreshTokenTtlSeconds: Number(
      requireEnv("JWT_REFRESH_TOKEN_TTL_SECONDS"),
    ),

    privateKeyPath: requireEnv("JWT_PRIVATE_KEY_PATH"),
    publicKeyPath: requireEnv("JWT_PUBLIC_KEY_PATH"),
  },
};
