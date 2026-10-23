import type { ID, ISODateString } from "./common";

export type ServiceCategorySlug =
  | "cleaning"
  | "plumbing"
  | "electrical"
  | "carpentry"
  | "painting"
  | "appliance-repair"
  | "moving"
  | "gardening"
  | "construction"
  | "other";

export interface ServiceCategory {
  id: ID;
  slug: ServiceCategorySlug;
  name: string;
  description: string | null;
  icon: string | null;
  isActive: boolean;
  sortOrder: number;
}

export interface ProfessionalService {
  id: ID;
  professionalId: ID;
  categoryId: ID;
  title: string;
  description: string | null;
  basePrice: number;
  pricingUnit: "fixed" | "hourly" | "per_meter" | "per_item";
  isActive: boolean;
  createdAt: ISODateString;
}

export interface ServiceSummary {
  id: ID;
  title: string;
  category: ServiceCategory;
  priceFrom: number;
  rating: number;
  reviewCount: number;
  providerName: string;
  providerId: ID;
  providerImage: string | null;
}
