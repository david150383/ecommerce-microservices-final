import { Router } from "express";
import { ItemController } from "../controllers/item.controller.js";
import { ItemService } from "../services/item.service.js";
import { ItemRepository } from "../repositories/item.repository.js";
import { authenticate } from "../../../middleware/authenticate.middleware.js";
import { validate } from "../../../middleware/validate.middleware.js";
import { createItemSchema, updateItemSchema, itemIdParamSchema } from "../schemas/item.schema.js";

const router = Router();

const repository = new ItemRepository();
const service = new ItemService(repository);
const controller = new ItemController(service);

// Public or Protected Item Routes
router.get("/", controller.list);
router.get("/:id", validate(itemIdParamSchema, "params"), controller.getById);

router.post("/", authenticate, validate(createItemSchema, "body"), controller.create);

router.patch(
  "/:id",
  authenticate,
  validate(itemIdParamSchema, "params"),
  validate(updateItemSchema, "body"),
  controller.update,
);

router.delete("/:id", authenticate, validate(itemIdParamSchema, "params"), controller.delete);

export default router;
