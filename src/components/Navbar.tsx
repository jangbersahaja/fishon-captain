"use client";

import type { LucideIcon } from "lucide-react";
import {
  CircleUser,
  LogIn,
  LogOut,
  Menu,
  ShieldCheck,
  Ship,
  Store,
} from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { Tooltip } from "@/components/ui/Tooltip";

type AccountStatus =
  | { authenticated: false }
  | {
      authenticated: true;
      role: string | null;
      hasCharter: boolean;
      avatarUrl: string | null;
      image: string | null;
      name: string | null;
      nickname: string | null;
      firstName: string | null;
      lastName: string | null;
    };

type NavItem = {
  key: string;
  label: string;
  href: string;
  icon: LucideIcon;
  external?: boolean;
};

export default function Navbar() {
  const { data: session, status } = useSession();
  const [accountStatus, setAccountStatus] = useState<AccountStatus | null>(
    null
  );
  const [loadingAccount, setLoadingAccount] = useState(false);
  const [desktopMenuOpen, setDesktopMenuOpen] = useState(false);

  const desktopTriggerRef = useRef<HTMLButtonElement | null>(null);
  const desktopMenuRef = useRef<HTMLDivElement | null>(null);

  const authenticated = status === "authenticated";

  useEffect(() => {
    if (!authenticated) {
      setAccountStatus(null);
      setLoadingAccount(false);
      setDesktopMenuOpen(false);
      return;
    }

    let cancelled = false;
    const controller = new AbortController();

    const load = async () => {
      setLoadingAccount(true);
      try {
        const res = await fetch("/api/account/status", {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!res.ok) return;
        const data = (await res.json()) as AccountStatus;
        if (!cancelled) {
          setAccountStatus(data);
        }
      } catch (error) {
        const abort =
          error instanceof DOMException && error.name === "AbortError";
        if (abort || cancelled) return;
        setAccountStatus(null);
      } finally {
        if (!cancelled) setLoadingAccount(false);
      }
    };

    load();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [authenticated]);

  useEffect(() => {
    if (!desktopMenuOpen) return;

    const handlePointer = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        desktopMenuRef.current?.contains(target) ||
        desktopTriggerRef.current?.contains(target)
      ) {
        return;
      }
      setDesktopMenuOpen(false);
    };

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setDesktopMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointer);
    document.addEventListener("keydown", handleKey);

    return () => {
      document.removeEventListener("mousedown", handlePointer);
      document.removeEventListener("keydown", handleKey);
    };
  }, [desktopMenuOpen]);

  const account =
    accountStatus && accountStatus.authenticated ? accountStatus : null;

  const displayName = useMemo(() => {
    if (!authenticated) return "Guest";
    if (!account) return session?.user?.name ?? "Captain";
    if (account.nickname && account.nickname.trim())
      return account.nickname.trim();
    const parts = [account.firstName, account.lastName]
      .map((part) => part?.trim())
      .filter(Boolean) as string[];
    if (parts.length) return parts.join(" ");
    if (account.name && account.name.trim()) return account.name.trim();
    return session?.user?.name ?? "Captain";
  }, [account, authenticated, session?.user?.name]);

  const profileImage = useMemo(() => {
    const imageCandidate =
      account?.avatarUrl || account?.image || session?.user?.image || null;
    return imageCandidate && imageCandidate.trim().length
      ? imageCandidate
      : null;
  }, [account?.avatarUrl, account?.image, session?.user?.image]);

  const navItems = useMemo<NavItem[]>(() => {
    const items: NavItem[] = [
      {
        key: "marketplace",
        label: "Marketplace",
        href: "https://www.fishon.my",
        icon: Store,
        external: true,
      },
    ];

    if (authenticated && account?.hasCharter) {
      items.push({
        key: "captain-portal",
        label: "Captain Portal",
        href: "/captain",
        icon: Ship,
      });
    }

    const role = account?.role;
    if (authenticated && role && (role === "ADMIN" || role === "STAFF")) {
      items.push({
        key: "staff-portal",
        label: "Staff Portal",
        href: "/staff",
        icon: ShieldCheck,
      });
    }

    return items;
  }, [account?.hasCharter, account?.role, authenticated]);

  const toggleDesktopMenu = () => setDesktopMenuOpen((prevOpen) => !prevOpen);

  const closeDesktopMenu = () => setDesktopMenuOpen(false);

  const handleSignOut = async () => {
    closeDesktopMenu();
    await signOut({ callbackUrl: "/" });
  };

  const ProfileAvatar = ({
    variant = "default",
  }: {
    variant?: "default" | "card";
  }) => (
    <div
      className={`relative h-10 w-10 overflow-hidden rounded-full shadow-inner ${
        variant === "card"
          ? "border border-slate-200 bg-slate-100"
          : "border border-white/30 bg-white/10"
      }`}
    >
      {profileImage ? (
        <Image
          src={profileImage}
          alt={`${displayName}'s avatar`}
          fill
          sizes="40px"
          className="object-cover"
          unoptimized={
            profileImage.startsWith("http://") ||
            profileImage.startsWith("https://")
          }
        />
      ) : (
        <CircleUser
          className={`h-full w-full p-1.5 ${
            variant === "card" ? "text-slate-400" : "text-white/70"
          }`}
          aria-hidden
        />
      )}
    </div>
  );

  const logo = (
    <Link
      href="/"
      className="flex items-center gap-2"
      aria-label="Fishon.my home"
    >
      <span className="relative h-12 w-24 sm:h-14 sm:w-28">
        <Image
          src="/images/logos/fishon-logo-white.png"
          alt="Fishon"
          fill
          className="object-contain"
          priority
          sizes="(min-width: 640px) 112px, 96px"
        />
      </span>
      <div className="bg-white px-2 py-1 rounded-r-lg inset-shadow-2xs">
        <h1 className="text-lg font-bold sm:text-xl text-[#ec2227] ">
          Captains
        </h1>
      </div>
    </Link>
  );

  return (
    <header className="z-40 w-full border-t border-white/20 bg-[#ec2227] text-white backdrop-blur">
      <div className="mx-auto flex w-full flex-col gap-3 px-4 py-3 sm:px-6">
        <div className="flex w-full items-center gap-3 md:hidden">
          {logo}
          <div className="ml-auto flex min-w-0 items-center gap-2">
            <div className="flex max-w-[65vw] min-w-0 items-center gap-1 overflow-x-auto rounded-full border border-white/30 bg-white/10 px-2 py-1 shadow-sm">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Tooltip key={item.key} content={item.label}>
                    <Link
                      href={item.href}
                      target={item.external ? "_blank" : undefined}
                      rel={item.external ? "noreferrer" : undefined}
                      className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 text-white transition hover:bg-white/20"
                    >
                      <Icon className="h-5 w-5" aria-hidden />
                      <span className="sr-only">{item.label}</span>
                    </Link>
                  </Tooltip>
                );
              })}
              {authenticated ? (
                <Tooltip content="Sign out">
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 text-white transition hover:bg-white/20"
                  >
                    <LogOut className="h-5 w-5" aria-hidden />
                    <span className="sr-only">Sign out</span>
                  </button>
                </Tooltip>
              ) : (
                <Tooltip content="Sign in">
                  <Link
                    href="/auth?mode=signin"
                    className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 text-white transition hover:bg-white/20"
                  >
                    <LogIn className="h-5 w-5" aria-hidden />
                    <span className="sr-only">Sign in</span>
                  </Link>
                </Tooltip>
              )}
            </div>
            <Tooltip content={displayName}>
              <div className="shrink-0">
                <ProfileAvatar />
              </div>
            </Tooltip>
          </div>
        </div>

        <div className="hidden w-full items-center justify-between gap-3 md:flex">
          {logo}
          <div className="flex items-center gap-3">
            <Tooltip content={displayName}>
              <div>
                <ProfileAvatar />
              </div>
            </Tooltip>
            <div className="relative">
              <button
                ref={desktopTriggerRef}
                type="button"
                aria-haspopup="true"
                aria-expanded={desktopMenuOpen}
                onClick={toggleDesktopMenu}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/30 bg-white/10 text-white transition hover:bg-white/20"
              >
                <Menu className="h-5 w-5" aria-hidden />
                <span className="sr-only">Open navigation</span>
              </button>
              {desktopMenuOpen ? (
                <div
                  ref={desktopMenuRef}
                  className="absolute right-0 z-50 mt-2 w-72 overflow-hidden rounded-xl border border-white/20 bg-white text-slate-900 shadow-2xl"
                >
                  <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3">
                    <ProfileAvatar variant="card" />
                    <div className="flex-1 text-sm">
                      <div className="font-semibold text-slate-900">
                        {displayName}
                      </div>
                      <div className="text-xs text-slate-500">
                        {loadingAccount
                          ? "Updating..."
                          : authenticated
                          ? "Signed in"
                          : "Guest access"}
                      </div>
                    </div>
                  </div>
                  <nav className="flex flex-col gap-1 px-2 py-2">
                    {navItems.map((item) => {
                      const Icon = item.icon;
                      return (
                        <Link
                          key={item.key}
                          href={item.href}
                          target={item.external ? "_blank" : undefined}
                          rel={item.external ? "noreferrer" : undefined}
                          onClick={closeDesktopMenu}
                          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-800 transition hover:bg-slate-100"
                        >
                          <Icon className="h-4 w-4" aria-hidden />
                          <span>{item.label}</span>
                          {item.external ? (
                            <span className="ml-auto text-xs text-slate-400">
                              ↗
                            </span>
                          ) : null}
                        </Link>
                      );
                    })}
                    {authenticated ? (
                      <button
                        type="button"
                        onClick={handleSignOut}
                        className="flex items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-800 transition hover:bg-slate-100"
                      >
                        <LogOut className="h-4 w-4" aria-hidden />
                        <span>Sign out</span>
                      </button>
                    ) : (
                      <Link
                        href="/auth?mode=signin"
                        onClick={closeDesktopMenu}
                        className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-emerald-700 transition hover:bg-emerald-50"
                      >
                        <LogIn className="h-4 w-4" aria-hidden />
                        <span>Sign in</span>
                      </Link>
                    )}
                  </nav>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
