import request from "supertest";
import { createApp } from "../../src/app.js";
import { closeRedis } from "../../src/redis.js";
describe("API Gateway Routes Integration Tests", () => {
    const app = createApp();
    afterAll(async () => {
        await closeRedis();
    });
    it("should return 404 for unknown route with standard envelope", async () => {
        const res = await request(app).get("/non-existent-endpoint-abc");
        expect(res.status).toBe(404);
        expect(res.body.success).toBe(false);
        expect(res.body.error.code).toBe("ROUTE_NOT_FOUND");
        expect(res.headers["x-request-id"]).toBeDefined();
    });
});
//# sourceMappingURL=gateway-routes.test.js.map