import { PoolClient } from "pg";
import { pool } from "../../../db.js";
import { Item, ItemRow } from "../types/item.types.js";
import { CreateItemInput, UpdateItemInput } from "../schemas/item.schema.js";

function mapItem(row: ItemRow): Item {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    price: Number(row.price),
    userId: row.user_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class ItemRepository {
  async findById(id: string, client?: PoolClient): Promise<Item | null> {
    const executor = client ?? pool;
    const result = await executor.query(`SELECT * FROM items WHERE id = $1 LIMIT 1`, [id]);
    if (result.rowCount === 0) return null;
    return mapItem(result.rows[0]);
  }

  async list(limit = 50, offset = 0, client?: PoolClient): Promise<Item[]> {
    const executor = client ?? pool;
    const result = await executor.query(
      `SELECT * FROM items ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
      [limit, offset],
    );
    return result.rows.map(mapItem);
  }

  async create(data: CreateItemInput & { userId: string }, client?: PoolClient): Promise<Item> {
    const executor = client ?? pool;
    const result = await executor.query(
      `
      INSERT INTO items (name, description, price, user_id)
      VALUES ($1, $2, $3, $4)
      RETURNING *
      `,
      [data.name, data.description, data.price, data.userId],
    );
    return mapItem(result.rows[0]);
  }

  async update(id: string, data: UpdateItemInput, client?: PoolClient): Promise<Item | null> {
    const executor = client ?? pool;
    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (data.name !== undefined) {
      fields.push(`name = $${idx++}`);
      values.push(data.name);
    }
    if (data.description !== undefined) {
      fields.push(`description = $${idx++}`);
      values.push(data.description);
    }
    if (data.price !== undefined) {
      fields.push(`price = $${idx++}`);
      values.push(data.price);
    }

    if (fields.length === 0) return this.findById(id, client);

    fields.push(`updated_at = NOW()`);
    values.push(id);

    const result = await executor.query(
      `
      UPDATE items
      SET ${fields.join(", ")}
      WHERE id = $${idx}
      RETURNING *
      `,
      values,
    );

    if (result.rowCount === 0) return null;
    return mapItem(result.rows[0]);
  }

  async delete(id: string, client?: PoolClient): Promise<boolean> {
    const executor = client ?? pool;
    const result = await executor.query(`DELETE FROM items WHERE id = $1`, [id]);
    return (result.rowCount ?? 0) > 0;
  }
}
