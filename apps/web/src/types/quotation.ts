import type { ID, ISODateString } from "./common";

export type QuotationStatus =
  | "draft"
  | "sent"
  | "accepted"
  | "rejected"
  | "expired"
  | "withdrawn";

export interface QuotationLine {
  id: ID;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Quotation {
  id: ID;
  requestId: ID;
  requestTitle: string;
  customerId: ID;
  customerName: string;
  professionalId: ID;
  professionalName: string;
  status: QuotationStatus;
  lines: QuotationLine[];
  subtotal: number;
  transportFee: number;
  total: number;
  notes: string | null;
  validUntil: ISODateString;
  createdAt: ISODateString;
}

export interface QuotationCreateInput {
  requestId: ID;
  lines: Array<{ description: string; quantity: number; unitPrice: number }>;
  transportFee?: number;
  notes?: string;
  validUntil: string;
}
