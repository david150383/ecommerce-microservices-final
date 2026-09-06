import {
  sendNotificationSchema,
  listNotificationsQuerySchema,
  notificationIdParamSchema,
} from "../../src/modules/notification/schemas/notification.schemas.js";

describe("Notification Schemas (Unit)", () => {
  const validUuid = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";

  describe("sendNotificationSchema", () => {
    it("should accept valid notification input", () => {
      const payload = {
        channel: "EMAIL",
        recipient: "customer@example.com",
        subject: "Order Confirmation",
        body: "Thank you for your order!",
        userId: validUuid,
      };
      const parsed = sendNotificationSchema.parse(payload);
      expect(parsed.channel).toBe("EMAIL");
      expect(parsed.recipient).toBe("customer@example.com");
      expect(parsed.subject).toBe("Order Confirmation");
      expect(parsed.userId).toBe(validUuid);
    });

    it("should reject invalid notification channel", () => {
      expect(() =>
        sendNotificationSchema.parse({
          channel: "PIGEON",
          recipient: "customer@example.com",
          subject: "Test",
          body: "Hello",
        }),
      ).toThrow();
    });

    it("should reject missing required fields", () => {
      expect(() =>
        sendNotificationSchema.parse({
          channel: "SMS",
          recipient: "+123456789",
        }),
      ).toThrow();
    });

    it("should reject empty subject", () => {
      expect(() =>
        sendNotificationSchema.parse({
          channel: "SMS",
          recipient: "+123456789",
          subject: "",
          body: "Hello",
        }),
      ).toThrow(/Subject is required/);
    });
  });

  describe("listNotificationsQuerySchema", () => {
    it("should apply default limit and offset", () => {
      const parsed = listNotificationsQuerySchema.parse({});
      expect(parsed.limit).toBe(50);
      expect(parsed.offset).toBe(0);
    });

    it("should accept valid status and channel filters", () => {
      const parsed = listNotificationsQuerySchema.parse({
        status: "DELIVERED",
        channel: "EMAIL",
      });
      expect(parsed.status).toBe("DELIVERED");
      expect(parsed.channel).toBe("EMAIL");
    });
  });

  describe("notificationIdParamSchema", () => {
    it("should accept valid UUID", () => {
      expect(notificationIdParamSchema.parse({ id: validUuid }).id).toBe(validUuid);
    });

    it("should reject invalid UUID", () => {
      expect(() => notificationIdParamSchema.parse({ id: "invalid-id" })).toThrow(
        /Invalid notification ID/,
      );
    });
  });
});
