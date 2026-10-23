import type { ID, ISODateString } from "./common";

export interface Review {
  id: ID;
  bookingId: ID;
  professionalId: ID;
  customerId: ID;
  customerName: string;
  rating: number;
  comment: string | null;
  isPublished: boolean;
  createdAt: ISODateString;
}
