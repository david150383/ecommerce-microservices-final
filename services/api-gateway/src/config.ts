import "dotenv/config";

function requireEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing ${name}`);
  }

  return value;
}

export const config = {
  port: Number(process.env.PORT),

  authServiceUrl: requireEnv("AUTH_SERVICE_URL"),
  productServiceUrl: requireEnv("PRODUCT_SERVICE_URL"),
  jwt: {
    publicKeyPath: requireEnv("JWT_PUBLIC_KEY_PATH"),
    issuer: requireEnv("JWT_ISSUER"),
    audience: requireEnv("JWT_AUDIENCE"),
  },
};
