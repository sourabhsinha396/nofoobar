"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { isRecaptchaEnabled, RecaptchaCheckbox } from "@/components/auth/recaptcha-checkbox";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiPost } from "@/lib/api";

interface LoginResponse {
  id: string;
  email: string;
  name: string;
}

interface Props {
  redirectTo?: string;
}

export function LoginForm({ redirectTo = "/me" }: Props = {}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [recaptchaToken, setRecaptchaToken] = useState("");
  const [recaptchaReset, setRecaptchaReset] = useState(0);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (isRecaptchaEnabled() && !recaptchaToken) {
      setError("Please complete the reCAPTCHA");
      return;
    }
    setIsSubmitting(true);
    try {
      await apiPost<LoginResponse>("/api/v1/auth/login", {
        email,
        password,
        recaptcha_token: recaptchaToken,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
      setIsSubmitting(false);
      setRecaptchaReset((n) => n + 1);
      return;
    }
    router.push(redirectTo);
    router.refresh();
  }

  return (
    <Card className="w-full max-w-lg p-2">
      <CardHeader className="space-y-2">
        <CardTitle className="text-3xl font-semibold tracking-tight">Welcome back</CardTitle>
        <CardDescription className="text-base">Sign in to nofoobar.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <Label htmlFor="email" className="text-sm font-medium">Email</Label>
            <Input id="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="h-11 text-base" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="password" className="text-sm font-medium">Password</Label>
            <Input id="password" type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className="h-11 text-base" />
          </div>
          <RecaptchaCheckbox onToken={setRecaptchaToken} resetSignal={recaptchaReset} />
          {error && <p className="text-sm text-red-500">{error}</p>}
          <Button type="submit" disabled={isSubmitting} className="h-11 text-base">
            {isSubmitting ? "Signing in..." : "Sign in"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
