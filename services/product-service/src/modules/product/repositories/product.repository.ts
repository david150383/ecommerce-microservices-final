import { PoolClient } from "pg";
import { pool } from "../../../db.js";
import {
  Product,
  ProductRow,
  ListProductFilter,
  PaginatedProducts,
} from "../types/product.types.js";
import { CreateProductInput, UpdateProductInput } from "../schemas/product.schema.js";
import { encodeCursor, decodeCursor } from "../../../shared/utils/cursor.util.js";

function mapProduct(row: ProductRow): Product {
  return {
    id: row.id,
    sku: row.sku,
    name: row.name,
    slug: row.slug,
    description: row.description ?? "",
    priceCents: Number(row.price_cents),
    currency: row.currency,
    category: row.category,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class ProductRepository {
  async findById(id: string, client?: PoolClient): Promise<Product | null> {
    const executor = client ?? pool;
    const result = await executor.query(`SELECT * FROM products WHERE id = $1 LIMIT 1`, [id]);
    if (result.rowCount === 0) return null;
    return mapProduct(result.rows[0]);
  }

  async findBySlug(slug: string, client?: PoolClient): Promise<Product | null> {
    const executor = client ?? pool;
    const result = await executor.query(`SELECT * FROM products WHERE slug = $1 LIMIT 1`, [slug]);
    if (result.rowCount === 0) return null;
    return mapProduct(result.rows[0]);
  }

  async findBySku(sku: string, client?: PoolClient): Promise<Product | null> {
    const executor = client ?? pool;
    const result = await executor.query(`SELECT * FROM products WHERE sku = $1 LIMIT 1`, [sku]);
    if (result.rowCount === 0) return null;
    return mapProduct(result.rows[0]);
  }

  async list(filter: ListProductFilter = {}, client?: PoolClient): Promise<PaginatedProducts> {
    const executor = client ?? pool;
    const conditions: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (filter.category) {
      conditions.push(`category = $${paramIndex++}`);
      values.push(filter.category);
    }

    if (filter.status && filter.status !== "ALL") {
      conditions.push(`status = $${paramIndex++}`);
      values.push(filter.status);
    }

    if (filter.search) {
      conditions.push(
        `(name ILIKE $${paramIndex} OR sku ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`,
      );
      values.push(`%${filter.search}%`);
      paramIndex++;
    }

    // Optional cursor condition for keyset pagination
    if (filter.cursor) {
      const decoded = decodeCursor(filter.cursor);
      conditions.push(`(created_at, id) < ($${paramIndex++}, $${paramIndex++})`);
      values.push(decoded.createdAt, decoded.id);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const limit = filter.limit ?? 50;

    // Run total count query only when doing offset-based pagination
    let total: number | undefined;
    let offset: number | undefined;

    if (!filter.cursor) {
      offset = filter.offset ?? 0;
      const countResult = await executor.query(
        `SELECT COUNT(*) AS total FROM products ${whereClause}`,
        values,
      );
      total = parseInt(countResult.rows[0]?.total || "0", 10);
    }

    // Fetch limit + 1 to reliably determine hasNextPage
    const fetchLimit = limit + 1;
    let dataQuery: string;
    let dataValues: any[];

    if (filter.cursor) {
      dataQuery = `
        SELECT * FROM products
        ${whereClause}
        ORDER BY created_at DESC, id DESC
        LIMIT $${paramIndex}
      `;
      dataValues = [...values, fetchLimit];
    } else {
      dataQuery = `
        SELECT * FROM products
        ${whereClause}
        ORDER BY created_at DESC, id DESC
        LIMIT $${paramIndex++} OFFSET $${paramIndex++}
      `;
      dataValues = [...values, fetchLimit, offset];
    }

    const dataResult = await executor.query(dataQuery, dataValues);

    const hasNextPage = dataResult.rows.length > limit;
    const items = hasNextPage ? dataResult.rows.slice(0, limit) : dataResult.rows;
    const products = items.map(mapProduct);
    const lastProduct = products[products.length - 1];
    const nextCursor =
      hasNextPage && lastProduct ? encodeCursor(lastProduct.createdAt, lastProduct.id) : null;

    return {
      products,
      limit,
      ...(filter.cursor ? {} : { offset, total }),
      nextCursor,
      hasNextPage,
    };
  }

  async create(data: CreateProductInput & { slug: string }, client?: PoolClient): Promise<Product> {
    const executor = client ?? pool;
    const result = await executor.query(
      `
      INSERT INTO products (sku, name, slug, description, price_cents, currency, category, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
      `,
      [
        data.sku,
        data.name,
        data.slug,
        data.description ?? "",
        data.priceCents,
        data.currency ?? "USD",
        data.category,
        data.status ?? "ACTIVE",
      ],
    );
    return mapProduct(result.rows[0]);
  }

  async update(id: string, data: UpdateProductInput, client?: PoolClient): Promise<Product | null> {
    const executor = client ?? pool;
    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (data.sku !== undefined) {
      fields.push(`sku = $${idx++}`);
      values.push(data.sku);
    }
    if (data.name !== undefined) {
      fields.push(`name = $${idx++}`);
      values.push(data.name);
    }
    if (data.slug !== undefined) {
      fields.push(`slug = $${idx++}`);
      values.push(data.slug);
    }
    if (data.description !== undefined) {
      fields.push(`description = $${idx++}`);
      values.push(data.description);
    }
    if (data.priceCents !== undefined) {
      fields.push(`price_cents = $${idx++}`);
      values.push(data.priceCents);
    }
    if (data.currency !== undefined) {
      fields.push(`currency = $${idx++}`);
      values.push(data.currency);
    }
    if (data.category !== undefined) {
      fields.push(`category = $${idx++}`);
      values.push(data.category);
    }
    if (data.status !== undefined) {
      fields.push(`status = $${idx++}`);
      values.push(data.status);
    }

    if (fields.length === 0) return this.findById(id, client);

    fields.push(`updated_at = NOW()`);
    values.push(id);

    const result = await executor.query(
      `
      UPDATE products
      SET ${fields.join(", ")}
      WHERE id = $${idx}
      RETURNING *
      `,
      values,
    );

    if (result.rowCount === 0) return null;
    return mapProduct(result.rows[0]);
  }

  async delete(id: string, client?: PoolClient): Promise<boolean> {
    const executor = client ?? pool;
    const result = await executor.query(`DELETE FROM products WHERE id = $1`, [id]);
    return (result.rowCount ?? 0) > 0;
  }
}
