import type { ID, ISODateString } from "./common";

/** The three account kinds supported by FIXLINK. */
export type UserRole = "customer" | "professional" | "admin";

export type VerificationStatus =
  | "not_started"
  | "pending"
  | "approved"
  | "rejected";

export type AccountStatus = "active" | "suspended" | "pending";

export interface Profile {
  id: ID;
  clerkUserId: ID;
  role: UserRole;
  fullName: string;
  phone: string | null;
  email: string;
  avatarUrl: string | null;
  preferredLanguage: "en" | "am" | "om";
  city: string | null;
  subCity: string | null;
  address: string | null;
  status: AccountStatus;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface ProfessionalProfile extends Profile {
  role: "professional";
  headline: string | null;
  bio: string | null;
  yearsExperience: number | null;
  verificationStatus: VerificationStatus;
  averageRating: number | null;
  totalReviews: number;
  completedJobs: number;
  isAvailable: boolean;
}

export interface ProfessionalDocument {
  id: ID;
  professionalId: ID;
  type: "id" | "business_license" | "certificate" | "portfolio";
  fileUrl: string;
  status: VerificationStatus;
  reviewNote: string | null;
  createdAt: ISODateString;
}

export interface CurrentUser {
  clerkUserId: ID;
  role: UserRole;
  profileId: ID | null;
  fullName: string;
  email: string;
  imageUrl: string | null;
}
