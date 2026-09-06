import { PoolClient } from "pg";
import { pool } from "../../../db.js";
import { User, UserRow } from "../types/user.types.js";
import { EmailAlreadyExistsError } from "../errors/auth.errors.js";
import { RegisterInput } from "../schemas/auth.schema.js";

function mapUser(row: UserRow): User {
  return {
    id: row.id,
    email: row.email,
    firstName: row.first_name,
    lastName: row.last_name,
    passwordHash: row.password_hash,
    role: row.role,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class UserRepository {
  async findByEmail(email: string, client?: PoolClient): Promise<User | null> {
    const executor = client ?? pool;
    const result = await executor.query(
      `
      SELECT id, email, first_name, last_name, password_hash, role, is_active, created_at, updated_at
      FROM users
      WHERE email = $1
      LIMIT 1
      `,
      [email.toLowerCase()],
    );

    if (result.rowCount === 0) {
      return null;
    }

    return mapUser(result.rows[0]);
  }

  async findById(id: string, client?: PoolClient): Promise<User | null> {
    const executor = client ?? pool;
    const result = await executor.query(
      `
      SELECT id, email, first_name, last_name, password_hash, role, is_active, created_at, updated_at
      FROM users
      WHERE id = $1
      LIMIT 1
      `,
      [id],
    );

    if (result.rowCount === 0) {
      return null;
    }

    return mapUser(result.rows[0]);
  }

  async create(
    data: Omit<RegisterInput, "password"> & { password_hash: string },
    client?: PoolClient,
  ): Promise<User> {
    const executor = client ?? pool;
    try {
      const result = await executor.query(
        `
        INSERT INTO users (email, password_hash, first_name, last_name, role)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, email, first_name, last_name, password_hash, role, is_active, created_at, updated_at;
      `,
        [
          data.email.toLowerCase(),
          data.password_hash,
          data.first_name,
          data.last_name,
          data.role ?? "CUSTOMER",
        ],
      );

      return mapUser(result.rows[0]);
    } catch (error: unknown) {
      if (error && typeof error === "object" && "code" in error && error.code === "23505") {
        throw new EmailAlreadyExistsError(data.email);
      }

      throw error;
    }
  }
}
