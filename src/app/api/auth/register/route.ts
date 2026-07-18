import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { bcryptjs } from "@/lib/auth/utils";
import { findUserByEmail, createUser } from "@/lib/auth/users";

const registerSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().min(1, "Name is required"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = registerSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { email, password, name } = validation.data;
    const lowerEmail = email.toLowerCase();

    // Check if user already exists
    const existingUser = await findUserByEmail(lowerEmail);
    if (existingUser) {
      return NextResponse.json(
        { error: "A user with this email already exists" },
        { status: 409 }
      );
    }

    // Hash password using the bcryptjs utility
    const passwordHash = await bcryptjs.hash(password, 12);

    // Create user
    const now = new Date();
    const newUser = await createUser({
      id: crypto.randomUUID(),
      email: lowerEmail,
      name,
      emailVerified: null,
      image: null,
      googleId: null,
      passwordHash,
      role: "fan",
      staffStatus: "none",
      staffRequestedAt: null,
      approvedAt: null,
      approvedBy: null,
      createdAt: now,
      updatedAt: now,
      lastSignIn: now,
    });

    return NextResponse.json(
      { success: true, userId: newUser.id },
      { status: 201 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Registration error:", message, error);
    return NextResponse.json(
      { error: "Internal server error", detail: message },
      { status: 500 }
    );
  }
}