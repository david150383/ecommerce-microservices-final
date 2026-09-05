import { ProductRepository } from "../repositories/product.repository.js";
import {
  CreateProductInput,
  UpdateProductInput,
  ListProductsQuery,
} from "../schemas/product.schema.js";
import {
  NotFoundError,
  ConflictError,
} from "../../../shared/errors/app.error.js";
import {
  Product,
  ListProductFilter,
  PaginatedProducts,
} from "../types/product.types.js";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export class ProductService {
  constructor(private readonly repository: ProductRepository) {}

  async getProductById(id: string): Promise<Product> {
    const product = await this.repository.findById(id);
    if (!product) {
      throw new NotFoundError("Product", id);
    }
    return product;
  }

  async getProductBySlug(slug: string): Promise<Product> {
    const product = await this.repository.findBySlug(slug);
    if (!product) {
      throw new NotFoundError("Product", slug);
    }
    return product;
  }

  async listProducts(
    query: ListProductsQuery,
    isAdmin = false,
  ): Promise<PaginatedProducts> {
    const filter: ListProductFilter = {
      limit: query.limit,
      offset: query.offset,
      cursor: query.cursor,
      category: query.category,
      search: query.search,
    };

    if (query.status) {
      filter.status = query.status;
    } else if (!isAdmin) {
      // Non-admin public catalog browsing defaults to ACTIVE products only
      filter.status = "ACTIVE";
    }

    return this.repository.list(filter);
  }

  async createProduct(input: CreateProductInput): Promise<Product> {
    const slug = input.slug || slugify(input.name);

    // Check SKU uniqueness
    const existingSku = await this.repository.findBySku(input.sku);
    if (existingSku) {
      throw new ConflictError("A product with this SKU already exists.", [
        { field: "sku", message: `SKU '${input.sku}' is already in use` },
      ]);
    }

    // Check Slug uniqueness
    const existingSlug = await this.repository.findBySlug(slug);
    if (existingSlug) {
      throw new ConflictError("A product with this slug already exists.", [
        { field: "slug", message: `Slug '${slug}' is already in use` },
      ]);
    }

    return this.repository.create({
      ...input,
      slug,
    });
  }

  async updateProduct(
    id: string,
    input: UpdateProductInput,
  ): Promise<Product> {
    const existing = await this.getProductById(id);

    if (input.sku && input.sku !== existing.sku) {
      const existingSku = await this.repository.findBySku(input.sku);
      if (existingSku && existingSku.id !== id) {
        throw new ConflictError("A product with this SKU already exists.", [
          { field: "sku", message: `SKU '${input.sku}' is already in use` },
        ]);
      }
    }

    if (input.slug && input.slug !== existing.slug) {
      const existingSlug = await this.repository.findBySlug(input.slug);
      if (existingSlug && existingSlug.id !== id) {
        throw new ConflictError("A product with this slug already exists.", [
          { field: "slug", message: `Slug '${input.slug}' is already in use` },
        ]);
      }
    }

    const updated = await this.repository.update(id, input);
    if (!updated) {
      throw new NotFoundError("Product", id);
    }
    return updated;
  }

  async deleteProduct(id: string): Promise<void> {
    await this.getProductById(id);
    await this.repository.delete(id);
  }
}
