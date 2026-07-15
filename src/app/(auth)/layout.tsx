import { Metadata } from "next";

export const metadata: Metadata = {
  title: "FIFA Transit - Authentication",
  description: "Sign in or create an account for FIFA Transit App",
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 px-4 py-12">
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}