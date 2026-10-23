import type { ID, ISODateString } from "./common";

export type BookingStatus =
  | "pending"
  | "confirmed"
  | "in_progress"
  | "completed"
  | "cancelled";

export type PaymentStatus = "unpaid" | "partial" | "paid" | "refunded";

export interface Booking {
  id: ID;
  requestId: ID | null;
  quotationId: ID | null;
  customerId: ID;
  customerName: string;
  customerPhone: string | null;
  professionalId: ID;
  professionalName: string;
  professionalPhone: string | null;
  title: string;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  scheduledDate: ISODateString;
  scheduledTime: string;
  durationHours: number;
  totalPrice: number;
  address: string;
  notes: string | null;
  createdAt: ISODateString;
}
