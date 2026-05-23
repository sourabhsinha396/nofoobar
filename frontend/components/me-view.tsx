"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ApiError, apiGet, apiPost } from "@/lib/api";

interface User {
  id: string;
  email: string;
  name: string;
}

export function MeView() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    apiGet<User>("/api/v1/me")
      .then(setUser)
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.status === 401) {
          router.replace("/login");
          return;
        }
        setError(err instanceof Error ? err.message : "Failed to load");
      });
  }, [router]);

  async function onLogout() {
    setIsLoggingOut(true);
    try {
      await apiPost("/api/v1/auth/logout");
      router.replace("/login");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Logout failed");
      setIsLoggingOut(false);
    }
  }

  if (error) {
    return <p className="text-sm text-red-500">{error}</p>;
  }

  if (!user) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }

  return (
    <Card className="w-full max-w-lg p-2">
      <CardHeader className="space-y-2">
        <CardTitle className="text-3xl font-semibold tracking-tight">Hi, {user.name}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <div className="text-base text-muted-foreground">
          Signed in as <span className="font-medium text-foreground">{user.email}</span>
        </div>
        <Button variant="outline" onClick={onLogout} disabled={isLoggingOut} className="h-11 text-base">
          {isLoggingOut ? "Signing out..." : "Sign out"}
        </Button>
      </CardContent>
    </Card>
  );
}
