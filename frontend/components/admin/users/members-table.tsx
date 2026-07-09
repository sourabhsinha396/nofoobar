"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError, apiPatch } from "@/lib/api";
import type { OrgMember, OrgRole } from "@/lib/tenant";

interface Props {
  orgSlug: string;
  members: OrgMember[];
  viewerRole: OrgRole | null;
}

const ROLE_LABELS: Record<OrgRole, string> = {
  owner: "Owner",
  instructor: "Instructor",
  student: "Student",
};

function formatJoined(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function MembersTable({ orgSlug, members, viewerRole }: Props) {
  const router = useRouter();
  const canEdit = viewerRole === "owner";

  const [editing, setEditing] = useState<OrgMember | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function openEditor(member: OrgMember) {
    setEditing(member);
    setName(member.name);
    setEmail(member.email);
    setPassword("");
    setError(null);
  }

  function closeEditor() {
    if (isSaving) return;
    setEditing(null);
  }

  async function onSave() {
    if (!editing) return;
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    if (trimmedName === "" || trimmedEmail === "") {
      setError("Name and email can't be empty.");
      return;
    }
    if (password !== "" && password.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }

    const body: Record<string, string> = {};
    if (trimmedName !== editing.name) body.name = trimmedName;
    if (trimmedEmail !== editing.email) body.email = trimmedEmail;
    if (password !== "") body.password = password;
    if (Object.keys(body).length === 0) {
      setEditing(null);
      return;
    }

    setError(null);
    setIsSaving(true);
    try {
      await apiPatch<OrgMember>(
        `/api/v1/admin/members/${editing.user_id}`,
        body,
        { headers: { "X-Tenant-Slug": orgSlug } },
      );
      setEditing(null);
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setError("That email is already registered to another account.");
      } else if (err instanceof ApiError && err.status === 403) {
        setError(err.message);
      } else {
        setError(err instanceof Error ? err.message : "Could not save.");
      }
    } finally {
      setIsSaving(false);
    }
  }

  if (members.length === 0) {
    return (
      <Card className="items-center p-10 text-center">
        <p className="text-muted-foreground">No users yet.</p>
        <p className="mt-1 text-sm text-muted-foreground">
          People appear here when they sign up on your site.
        </p>
      </Card>
    );
  }

  return (
    <>
      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground">
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">Joined</th>
              {canEdit && <th className="px-4 py-3" />}
            </tr>
          </thead>
          <tbody>
            {members.map((member) => (
              <tr
                key={member.user_id}
                className="border-b border-border last:border-b-0"
              >
                <td className="px-4 py-3 font-medium">{member.name}</td>
                <td className="px-4 py-3 text-muted-foreground">{member.email}</td>
                <td className="px-4 py-3">
                  <span className="inline-flex rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">
                    {ROLE_LABELS[member.role]}
                  </span>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {formatJoined(member.joined_at)}
                </td>
                {canEdit && (
                  <td className="px-4 py-3 text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditor(member)}
                    >
                      Edit
                    </Button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={editing !== null} onOpenChange={(open) => !open && closeEditor()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit user</DialogTitle>
            <DialogDescription>
              Changes apply to this person&apos;s account. Leave the password
              blank to keep their current one.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="member-name">Name</Label>
              <Input
                id="member-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={255}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="member-email">Email</Label>
              <Input
                id="member-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                maxLength={320}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="member-password">New password</Label>
              <Input
                id="member-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Leave blank to keep unchanged"
                maxLength={128}
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeEditor} disabled={isSaving}>
              Cancel
            </Button>
            <Button onClick={onSave} disabled={isSaving}>
              {isSaving ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
