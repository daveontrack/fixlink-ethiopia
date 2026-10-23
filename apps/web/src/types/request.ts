import type { ID, ISODateString } from "./common";
import type { ServiceCategory } from "./service";

export type RequestStatus =
  | "open"
  | "in_review"
  | "quoted"
  | "accepted"
  | "in_progress"
  | "completed"
  | "cancelled";

export type RequestPriority = "low" | "normal" | "high" | "urgent";

export interface ServiceRequest {
  id: ID;
  customerId: ID;
  customerName: string;
  category: ServiceCategory;
  title: string;
  description: string;
  status: RequestStatus;
  priority: RequestPriority;
  city: string;
  subCity: string | null;
  address: string | null;
  scheduledDate: ISODateString | null;
  budgetMin: number | null;
  budgetMax: number | null;
  quotationCount: number;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface RequestCreateInput {
  categoryId: ID;
  title: string;
  description: string;
  priority: RequestPriority;
  city: string;
  subCity?: string;
  address?: string;
  scheduledDate?: string;
  budgetMin?: number;
  budgetMax?: number;
}
