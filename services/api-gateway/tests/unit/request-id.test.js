import { jest } from "@jest/globals";
import { requestId } from "../../src/middleware/requestId.js";
describe("Request ID Middleware Unit Tests", () => {
    it("should preserve an incoming x-request-id header", () => {
        const req = {
            headers: {
                "x-request-id": "client-correlation-id-12345",
            },
        };
        const setHeaderMock = jest.fn();
        const res = {
            setHeader: setHeaderMock,
        };
        const next = jest.fn();
        requestId(req, res, next);
        expect(req.headers["x-request-id"]).toBe("client-correlation-id-12345");
        expect(setHeaderMock).toHaveBeenCalledWith("x-request-id", "client-correlation-id-12345");
        expect(next).toHaveBeenCalledTimes(1);
    });
    it("should generate a UUID when x-request-id is missing", () => {
        const req = {
            headers: {},
        };
        const setHeaderMock = jest.fn();
        const res = {
            setHeader: setHeaderMock,
        };
        const next = jest.fn();
        requestId(req, res, next);
        const generatedId = req.headers["x-request-id"];
        expect(generatedId).toBeDefined();
        expect(generatedId.length).toBeGreaterThan(10);
        expect(setHeaderMock).toHaveBeenCalledWith("x-request-id", generatedId);
        expect(next).toHaveBeenCalledTimes(1);
    });
});
//# sourceMappingURL=request-id.test.js.map