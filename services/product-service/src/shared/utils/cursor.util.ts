import { BadRequestError } from "../errors/app.error.js";

export interface DecodedCursor {
  createdAt: Date;
  id: string;
}

export function encodeCursor(createdAt: Date, id: string): string {
  const payload = `${createdAt.toISOString()}:${id}`;
  return Buffer.from(payload, "utf8").toString("base64url");
}

export function decodeCursor(cursor: string): DecodedCursor {
  try {
    const raw = Buffer.from(cursor, "base64url").toString("utf8");
    const separatorIdx = raw.lastIndexOf(":");
    if (separatorIdx === -1) {
      throw new Error();
    }
    const isoString = raw.substring(0, separatorIdx);
    const id = raw.substring(separatorIdx + 1);

    const createdAt = new Date(isoString);
    if (isNaN(createdAt.getTime()) || !id) {
      throw new Error();
    }

    return { createdAt, id };
  } catch {
    throw new BadRequestError("Invalid pagination cursor format.");
  }
}
