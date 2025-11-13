"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface LinkedAccount {
  provider: string;
  email: string;
  linkedAt: string;
}

export default function OAuthAccountLinking() {
  const searchParams = useSearchParams();
  const [linkedAccounts, setLinkedAccounts] = useState<LinkedAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [linking, setLinking] = useState(false);
  const [unlinkDialogOpen, setUnlinkDialogOpen] = useState(false);
  const [providerToUnlink, setProviderToUnlink] = useState<string | null>(null);
  const [hasPassword, setHasPassword] = useState(true);

  // Check for callback messages
  useEffect(() => {
    const linkError = searchParams.get("linkError");
    const linkSuccess = searchParams.get("linkSuccess");

    if (linkError) {
      toast.error(decodeURIComponent(linkError));
      // Clear URL params
      window.history.replaceState({}, "", window.location.pathname);
    }

    if (linkSuccess) {
      toast.success(decodeURIComponent(linkSuccess));
      // Refresh linked accounts
      fetchLinkedAccounts();
      // Clear URL params
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [searchParams]);

  useEffect(() => {
    fetchLinkedAccounts();
  }, []);

  const fetchLinkedAccounts = async () => {
    try {
      const response = await fetch("/api/account/linked-accounts");
      if (response.ok) {
        const data = await response.json();
        setLinkedAccounts(data.accounts || []);
        setHasPassword(data.hasPassword);
      }
    } catch (error) {
      console.error("Failed to fetch linked accounts:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLinkGoogle = async () => {
    setLinking(true);
    try {
      const response = await fetch("/api/account/link-oauth/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: "google" }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || "Failed to initiate OAuth linking");
        return;
      }

      // Redirect to Google OAuth
      window.location.href = data.authUrl;
    } catch (error) {
      console.error("Failed to link Google account:", error);
      toast.error("Failed to initiate Google account linking");
    } finally {
      setLinking(false);
    }
  };

  const handleUnlinkGoogle = async () => {
    if (!hasPassword) {
      toast.error(
        "You must set a password before unlinking your Google account"
      );
      return;
    }

    try {
      const response = await fetch("/api/account/link-oauth/unlink", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: "google" }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || "Failed to unlink Google account");
        return;
      }

      toast.success("Google account unlinked successfully");
      fetchLinkedAccounts();
    } catch (error) {
      console.error("Failed to unlink Google account:", error);
      toast.error("Failed to unlink Google account");
    } finally {
      setUnlinkDialogOpen(false);
      setProviderToUnlink(null);
    }
  };

  const confirmUnlink = (provider: string) => {
    setProviderToUnlink(provider);
    setUnlinkDialogOpen(true);
  };

  const isGoogleLinked = linkedAccounts.some((a) => a.provider === "google");

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Connected Accounts</CardTitle>
          <CardDescription>
            Link your Google account to sign in with either email/password or
            Google OAuth
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!hasPassword && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              <p className="font-medium">Password Required</p>
              <p className="mt-1 text-xs">
                You must set a password for your account before you can link or
                unlink OAuth providers. This ensures you always have a way to
                access your account.
              </p>
            </div>
          )}

          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white border">
                  <svg className="h-5 w-5" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                </div>
                <div>
                  <p className="font-medium">Google</p>
                  {isGoogleLinked ? (
                    <p className="text-xs text-muted-foreground">
                      Linked{" "}
                      {linkedAccounts.find((a) => a.provider === "google")
                        ?.email && (
                        <>
                          ·{" "}
                          {
                            linkedAccounts.find((a) => a.provider === "google")
                              ?.email
                          }
                        </>
                      )}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">Not linked</p>
                  )}
                </div>
              </div>
              <div>
                {isGoogleLinked ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => confirmUnlink("google")}
                    disabled={!hasPassword}
                  >
                    Unlink
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleLinkGoogle}
                    disabled={linking || !hasPassword}
                  >
                    {linking ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Linking...
                      </>
                    ) : (
                      "Link Account"
                    )}
                  </Button>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600">
            <p className="font-medium text-slate-900">How it works:</p>
            <ul className="mt-2 space-y-1 list-disc pl-4">
              <li>Link your Google account to sign in with either method</li>
              <li>Both methods access the same account and data</li>
              <li>
                You must verify email ownership during linking (emails must
                match)
              </li>
              <li>
                You can unlink at any time (password required for account
                access)
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <Dialog open={unlinkDialogOpen} onOpenChange={setUnlinkDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Unlink Google Account?</DialogTitle>
            <DialogDescription>
              Are you sure you want to unlink your Google account? You will no
              longer be able to sign in with Google, but you can still sign in
              with your email and password.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setUnlinkDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleUnlinkGoogle}>Unlink Account</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
