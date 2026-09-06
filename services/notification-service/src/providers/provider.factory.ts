import { NotificationChannel, NotificationProvider } from "./notification.provider.interface.js";
import { EmailProvider } from "./email.provider.js";
import { SmsProvider } from "./sms.provider.js";
import { WebhookProvider } from "./webhook.provider.js";

export class NotificationProviderFactory {
  private static emailProvider = new EmailProvider();
  private static smsProvider = new SmsProvider();
  private static webhookProvider = new WebhookProvider();

  public static getProvider(channel: NotificationChannel): NotificationProvider {
    switch (channel) {
      case "EMAIL":
        return this.emailProvider;
      case "SMS":
        return this.smsProvider;
      case "WEBHOOK":
        return this.webhookProvider;
      default:
        return this.emailProvider;
    }
  }
}
