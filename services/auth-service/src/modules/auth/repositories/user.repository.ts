import { pool } from "../../../db.js";
import { User, UserRow } from "../types/user.types.js";
import { EmailAlreadyExistsError } from "../errors/auth.errors.js";
import { RegisterInput } from "../schemas/auth.schema.js";

function mapUser(row: UserRow): User {
  return {
    id: row.id,
    email: row.email,
    passwordHash: row.password_hash,
    role: row.role,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class UserRepository {
  async findByEmail(email: string): Promise<User | null> {
    const result = await pool.query(
      `
      SELECT *
      FROM users
      WHERE email = $1
      LIMIT 1
      `,
      [email],
    );

    if (result.rowCount === 0) {
      return null;
    }

    return mapUser(result.rows[0]);
  }

  async findById(id: string): Promise<User | null> {
    const result = await pool.query(
      `
      SELECT *
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

  async create(data: Omit<RegisterInput, 'password'> & { password_hash: string }): Promise<User> {
    try {
      const result = await pool.query(
        `
        INSERT INTO users (email, password_hash, first_name, last_name, role)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *;
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
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === "23505"
      ) {
        throw new EmailAlreadyExistsError(data.email);
      }

      throw error;
    }
  }
}