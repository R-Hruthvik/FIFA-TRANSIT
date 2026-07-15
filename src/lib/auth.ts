import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { clientPromise } from "@/lib/db";
import { findUserByEmail } from "@/lib/auth/users";
import type { Role, StaffStatus } from "@/types/auth";

const DB_NAME = process.env.MONGODB_DB || "stadium_ops";

// Module augmentation is in src/types/auth.ts — imported via that file

export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Invalid credentials");
        }

        const user = await findUserByEmail(credentials.email.toLowerCase());
        if (!user) {
          throw new Error("No user found with this email");
        }
        if (!user.passwordHash) {
          throw new Error("No password set for this account");
        }

        const isValid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!isValid) {
          throw new Error("Invalid password");
        }

        if (user.staffStatus === "rejected") {
          throw new Error("Your staff application was rejected. Please contact an administrator.");
        }
        if (user.staffStatus === "pending") {
          throw new Error("Your staff application is pending approval. Please wait for an administrator to review it.");
        }

        // @ts-ignore — module augmentation handles the extra fields at runtime
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
        };
      },
    }),
  ],
  session: { strategy: "jwt" } as const,
  callbacks: {
    // @ts-ignore — NextAuth v4 JWT callback types are strict
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.role = (user as Record<string, string>).role;
        token.name = user.name;
      }
      // @ts-ignore
      if (account?.provider === "google") {
        // @ts-ignore
        const profile = account as { email?: string; name?: string; picture?: string; sub?: string };
        const email = (profile.email || "").toLowerCase();
        const existingUser = await findUserByEmail(email);
        if (existingUser) {
          token.id = existingUser.id;
          token.email = existingUser.email;
          token.role = existingUser.role;
          token.name = existingUser.name;
        } else {
          const mongoClient = await clientPromise;
          const db = mongoClient.db(DB_NAME);
          const id = crypto.randomUUID();
          const now = new Date();
          await db.collection("users").insertOne({
            id,
            email,
            name: profile.name || "",
            image: profile.picture || null,
            googleId: profile.sub || "",
            passwordHash: null,
            role: "fan",
            staffStatus: "none",
            staffRequestedAt: null,
            approvedAt: null,
            approvedBy: null,
            createdAt: now,
            updatedAt: now,
            lastSignIn: now,
          });
          token.id = id;
          token.email = email;
          token.role = "fan";
          token.name = profile.name || "";
        }
      }
      return token;
    },
    // @ts-ignore
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.role = (token.role || "fan") as Role;
        session.user.name = token.name as string | null;
        session.user.image = token.picture as string | null;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || "",
};

export const { handlers, auth, signIn, signOut } = NextAuth(authOptions);
