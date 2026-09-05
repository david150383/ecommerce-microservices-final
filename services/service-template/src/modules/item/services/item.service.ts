import { ItemRepository } from "../repositories/item.repository.js";
import { CreateItemInput, UpdateItemInput } from "../schemas/item.schema.js";
import { NotFoundError, ForbiddenError } from "../../../shared/errors/app.error.js";
import { Item } from "../types/item.types.js";

export class ItemService {
  constructor(private readonly repository: ItemRepository) {}

  async getItem(id: string): Promise<Item> {
    const item = await this.repository.findById(id);
    if (!item) {
      throw new NotFoundError("Item", id);
    }
    return item;
  }

  async listItems(limit?: number, offset?: number): Promise<Item[]> {
    return this.repository.list(limit, offset);
  }

  async createItem(input: CreateItemInput, userId: string): Promise<Item> {
    return this.repository.create({ ...input, userId });
  }

  async updateItem(
    id: string,
    input: UpdateItemInput,
    userId: string,
    userRole: string,
  ): Promise<Item> {
    const existing = await this.getItem(id);

    if (existing.userId !== userId && userRole !== "ADMIN") {
      throw new ForbiddenError("You can only edit items you created.");
    }

    const updated = await this.repository.update(id, input);
    if (!updated) {
      throw new NotFoundError("Item", id);
    }
    return updated;
  }

  async deleteItem(id: string, userId: string, userRole: string): Promise<void> {
    const existing = await this.getItem(id);

    if (existing.userId !== userId && userRole !== "ADMIN") {
      throw new ForbiddenError("You can only delete items you created.");
    }

    await this.repository.delete(id);
  }
}
