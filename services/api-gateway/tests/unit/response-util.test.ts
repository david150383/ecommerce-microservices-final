import { jest } from "@jest/globals";
import { Response } from "express";
import { sendSuccess, sendError } from "../../src/shared/utils/response.util.js";

describe("Response Utility Unit Tests", () => {
  it("should format successful responses properly", () => {
    const jsonMock = jest.fn();
    const statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    const res = { status: statusMock } as unknown as Response;

    sendSuccess(res, { foo: "bar" }, "Operation completed", 200, { limit: 10 });

    expect(statusMock).toHaveBeenCalledWith(200);
    expect(jsonMock).toHaveBeenCalledWith({
      success: true,
      data: { foo: "bar" },
      message: "Operation completed",
      meta: { limit: 10 },
    });
  });

  it("should format error responses with code and requestId", () => {
    const jsonMock = jest.fn();
    const statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    const res = { status: statusMock } as unknown as Response;

    sendError(res, 404, "NOT_FOUND", "Item was not found", "req-xyz-123");

    expect(statusMock).toHaveBeenCalledWith(404);
    expect(jsonMock).toHaveBeenCalledWith({
      success: false,
      error: {
        code: "NOT_FOUND",
        message: "Item was not found",
        requestId: "req-xyz-123",
      },
    });
  });
});
