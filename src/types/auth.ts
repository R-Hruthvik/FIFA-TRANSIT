export type Role = "fan" | "staff" | "admin";
export type StaffStatus = "none" | "pending" | "approved" | "rejected";

export interface UserDocument {
  _id: {
    toString(): string;
  };
  id: string;
  email: string;
  emailVerified: Date | null;
  name: string | null;
  image: string | null;
  googleId: string | null;
  passwordHash: string | null;
  role: Role;
  staffStatus: StaffStatus;
  staffRequestedAt: Date | null;
  approvedAt: Date | null;
  approvedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
  lastSignIn: Date | null;
}

// Extend NextAuth v4 types
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      role: Role;
      name: string | null;
      image: string | null;
    };
  }
  interface User {
    id: string;
    email: string;
    role: Role;
    name: string | null;
    image: string | null;
  }
}
declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: Role;
    email: string;
    name?: string | null;
    picture?: string | null;
  }
}