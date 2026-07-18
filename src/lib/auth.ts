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
      id: "google-one-tap",
      name: "Google One Tap",
      credentials: {
        credential: { type: "text" },
      },
      // @ts-ignore
      async authorize(credentials) {
        if (!credentials?.credential) {
          throw new Error("No credential provided");
        }
        
        try {
          const token = credentials.credential;
          const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${token}`);
          if (!res.ok) {
            throw new Error("Invalid Google token");
          }
          const profile = await res.json();
          if (profile.email_verified !== "true" && profile.email_verified !== true) {
            throw new Error("Google email not verified");
          }
          if (profile.aud !== process.env.GOOGLE_CLIENT_ID) {
            throw new Error("Invalid client ID audience");
          }

          const email = (profile.email || "").toLowerCase();
          const existingUser = await findUserByEmail(email);
          const mongoClient = await clientPromise;
          const db = mongoClient.db(DB_NAME);
          const now = new Date();

          let user;
          if (existingUser) {
            if (existingUser.staffStatus === "rejected") {
              throw new Error("Your staff application was rejected. Please contact an administrator.");
            }
            if (existingUser.staffStatus === "pending") {
              throw new Error("Your staff application is pending approval. Please wait for an administrator to review it.");
            }

            // Update user with googleId if missing, and refresh lastSignIn
            await db.collection("users").updateOne(
              { id: existingUser.id },
              {
                $set: {
                  googleId: profile.sub || existingUser.googleId || "",
                  lastSignIn: now,
                  updatedAt: now,
                },
              }
            );
            user = existingUser;
          } else {
            const id = crypto.randomUUID();
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
            user = {
              id,
              email,
              name: profile.name || "",
              image: profile.picture || null,
              role: "fan",
            };
          }

          // @ts-ignore — module augmentation handles role compatibility at runtime
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image,
            role: user.role,
          };
        } catch (error: any) {
          console.error("One Tap authorization error:", error);
          throw new Error(error.message || "Authentication failed");
        }
      },
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

        // Update lastSignIn and updatedAt on successful login
        const mongoClient = await clientPromise;
        const db = mongoClient.db(DB_NAME);
        const now = new Date();
        await db.collection("users").updateOne(
          { id: user.id },
          {
            $set: {
              lastSignIn: now,
              updatedAt: now,
            },
          }
        );

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
        const profile = account as { email?: string; name?: string; picture?: string; sub?: string; email_verified?: boolean };

        // Check if email is verified
        if (!profile.email_verified) {
          // Returning null will cause the Google OAuth flow to fail
          return null;
        }

        const email = (profile.email || "").toLowerCase();
        const existingUser = await findUserByEmail(email);
        if (existingUser) {
          const mongoClient = await clientPromise;
          const db = mongoClient.db(DB_NAME);
          const now = new Date();

          // Update existing user: ensure googleId is set, update timestamps
          await db.collection("users").updateOne(
            { id: existingUser.id },
            {
              $set: {
                googleId: profile.sub || existingUser.googleId || "",
                lastSignIn: now,
                updatedAt: now,
              },
              $setOnInsert: {
                // Only set on insert (shouldn't happen for existing user)
                id: existingUser.id,
                email,
                name: profile.name || existingUser.name || "",
                image: profile.picture || existingUser.image || null,
                passwordHash: existingUser.passwordHash,
                role: existingUser.role,
                staffStatus: existingUser.staffStatus,
                staffRequestedAt: existingUser.staffRequestedAt,
                approvedAt: existingUser.approvedAt,
                approvedBy: existingUser.approvedBy,
                createdAt: existingUser.createdAt,
              }
            }
          );

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

export const auth = () => {
  // Import getServerSession dynamically or from next-auth/next
  const { getServerSession } = require("next-auth/next");
  return getServerSession(authOptions);
};
