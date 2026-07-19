import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { clientPromise } from "@/lib/db";
import { findUserByEmail } from "@/lib/auth/users";
import type { Role } from "@/types/auth";

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
      // @ts-expect-error — NextAuth v4 authorize type mismatch
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

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image,
            role: user.role,
          };
        } catch (error: unknown) {
          console.error("One Tap authorization error:", error);
          throw new Error(error instanceof Error ? error.message : "Authentication failed");
        }
      },
    }),
    CredentialsProvider({
      id: "admin-credentials",
      name: "Admin Login",
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

        // Admin credentials login is restricted to admin and staff roles only
        if (user.role !== "admin" && user.role !== "staff") {
          throw new Error("Admin login is restricted to staff accounts. Use Google sign-in for fan access.");
        }

        if (user.staffStatus === "rejected") {
          throw new Error("Your staff application was rejected. Please contact an administrator.");
        }
        if (user.staffStatus === "pending") {
          throw new Error("Your staff application is pending approval. Please wait for an administrator to review.");
        }

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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async jwt({ token, user, account, profile }: any) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.role = (user as Record<string, string>).role;
        token.name = user.name;
      }
      
      if (account?.provider === "google" && profile) {
        const googleProfile = profile as { 
          email?: string; 
          name?: string; 
          picture?: string; 
          sub?: string; 
          email_verified?: boolean | string; 
        };

        // Support both boolean and string variants returned by OAuth providers
        const isVerified = googleProfile.email_verified === true || googleProfile.email_verified === "true";
        if (!isVerified) {
          throw new Error("Google email not verified");
        }

        const email = (googleProfile.email || "").toLowerCase();
        if (!email) {
          throw new Error("No email address returned from Google account provider");
        }

        const existingUser = await findUserByEmail(email);
        const mongoClient = await clientPromise;
        const db = mongoClient.db(DB_NAME);
        const now = new Date();

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
                googleId: googleProfile.sub || existingUser.googleId || "",
                lastSignIn: now,
                updatedAt: now,
              },
            }
          );

          token.id = existingUser.id;
          token.email = existingUser.email;
          token.role = existingUser.role;
          token.name = existingUser.name;
        } else {
          const id = crypto.randomUUID();
          await db.collection("users").insertOne({
            id,
            email,
            name: googleProfile.name || "",
            image: googleProfile.picture || null,
            googleId: googleProfile.sub || "",
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
          token.name = googleProfile.name || "";
        }
      }
      
      // Safety guarantee: Never return null or undefined to prevent library encryption crashes
      return token || {};
    },
    // @ts-expect-error — NextAuth v4 session callback types
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
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || (() => {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'NEXTAUTH_SECRET or AUTH_SECRET environment variable is required in production. ' +
        'Generate one with: openssl rand -base64 32'
      );
    }
    // In development, generate a temporary secret but warn the user
    console.warn(
      '[AUTH WARNING] No NEXTAUTH_SECRET provided. Using temporary secret. ' +
      'Set NEXTAUTH_SECRET in .env.local for consistent sessions. ' +
      'Generate with: openssl rand -base64 32'
    );
    return 'dev-secret-do-not-use-in-production';
  })(),
};

export const auth = async () => {
  const { getServerSession } = await import('next-auth/next');
  return getServerSession(authOptions);
};
