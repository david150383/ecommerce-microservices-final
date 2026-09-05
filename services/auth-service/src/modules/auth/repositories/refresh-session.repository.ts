import { PoolClient } from "pg";
import { pool } from "../../../db.js";
import { ClientType } from "../schemas/auth.schema.js"

export interface RefreshSession {
  id: string;
  userId: string;
  familyId: string;
  tokenHash: string;
  clientType: ClientType;
  deviceId: string | null;
  expiresAt: Date;
  revokedAt: Date | null;
  createdAt: Date;
  lastUsedAt: Date | null;
}

function mapSession(row: any): RefreshSession {
  return {
    id: row.id,
    userId: row.user_id,
    familyId: row.family_id,
    tokenHash: row.token_hash,
    clientType: row.client_type,
    deviceId: row.device_id,
    expiresAt: row.expires_at,
    revokedAt: row.revoked_at,
    createdAt: row.created_at,
    lastUsedAt: row.last_used_at,
  };
}

export class RefreshSessionRepository {
  async create(
    data: {
      userId: string;
      familyId: string;
      tokenHash: string;
      clientType: string;
      deviceId?: string;
      expiresAt: Date;
    },
    client?: PoolClient,
  ): Promise<RefreshSession> {
    const executor = client ?? pool;
    const result = await executor.query(
      `
      INSERT INTO refresh_sessions (
        user_id,
        family_id,
        token_hash,
        client_type,
        device_id,
        expires_at
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
      `,
      [
        data.userId,
        data.familyId,
        data.tokenHash,
        data.clientType,
        data.deviceId ?? null,
        data.expiresAt,
      ],
    );

    return mapSession(result.rows[0]);
  }

  async findByTokenHash(
    tokenHash: string,
    client?: PoolClient,
  ): Promise<RefreshSession | null> {
    const executor = client ?? pool;
    const result = await executor.query(
      `
      SELECT *
      FROM refresh_sessions
      WHERE token_hash = $1
      LIMIT 1
      `,
      [tokenHash],
    );

    if (result.rows.length === 0) {
      return null;
    }

    return mapSession(result.rows[0]);
  }

  async revoke(id: string, client?: PoolClient): Promise<void> {
    const executor = client ?? pool;
    await executor.query(
      `
      UPDATE refresh_sessions
      SET revoked_at = NOW()
      WHERE id = $1
        AND revoked_at IS NULL
      `,
      [id],
    );
  }

  async revokeFamily(familyId: string, client?: PoolClient): Promise<void> {
    const executor = client ?? pool;

    await executor.query(
      `
      UPDATE refresh_sessions
      SET revoked_at = NOW()
      WHERE family_id = $1
        AND revoked_at IS NULL
      `,
      [familyId],
    );
  }

  async updateLastUsed(id: string, client?: PoolClient): Promise<void> {
    const executor = client ?? pool;
    await executor.query(
      `
      UPDATE refresh_sessions
      SET last_used_at = NOW()
      WHERE id = $1
      `,
      [id],
    );
  }

  async revokeAllForUser(userId: string, client?: PoolClient): Promise<void> {
    const executor = client ?? pool;

    await executor.query(
      `
    UPDATE refresh_sessions
    SET revoked_at = NOW()
    WHERE user_id = $1
      AND revoked_at IS NULL
    `,
      [userId],
    );
  }
}
