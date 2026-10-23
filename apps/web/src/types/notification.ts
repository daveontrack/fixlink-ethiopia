import type { ID, ISODateString } from "./common";

export type NotificationType =
  | "request_created"
  | "quotation_sent"
  | "quotation_accepted"
  | "booking_confirmed"
  | "booking_completed"
  | "message_received"
  | "verification_update"
  | "system";

export interface AppNotification {
  id: ID;
  userId: ID;
  type: NotificationType;
  title: string;
  body: string;
  href: string | null;
  isRead: boolean;
  createdAt: ISODateString;
}
