"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Landing Page
 * Redirects to dashboard or login based on auth state
 */
export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      router.push("/dashboard");
    } else {
      router.push("/auth/login");
    }
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-pulse">
        <div className="w-16 h-16 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500"></div>
      </div>
    </div>
  );
}
