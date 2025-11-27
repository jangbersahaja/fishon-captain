import { env } from "@/lib/env"; // triggers validation early
import { prisma } from "@/lib/prisma";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import bcrypt from "bcryptjs";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";

export type OAuthProviderInfo = {
  id: string;
  name: string;
  configured: boolean;
};

const googleConfigured = Boolean(
  env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
);

export const oauthProviders: OAuthProviderInfo[] = [
  {
    id: "google",
    name: "Google",
    configured: googleConfigured,
  },
];

const providers: NextAuthOptions["providers"] = [];

if (googleConfigured) {
  providers.push(
    GoogleProvider({
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      allowDangerousEmailAccountLinking: false,
    })
  );
}

providers.push(
  CredentialsProvider({
    name: "Credentials",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    async authorize(credentials) {
      if (!credentials?.email || !credentials.password) return null;
      const user = await prisma.user.findUnique({
        where: { email: credentials.email },
        select: {
          id: true,
          email: true,
          name: true,
          passwordHash: true,
          emailVerified: true,
        },
      });
      if (!user?.passwordHash) return null; // user exists but only via OAuth

      // Check if email is verified
      if (!user.emailVerified) {
        throw new Error(
          "Email not verified. Please check your email for the verification code."
        );
      }

      const valid = await bcrypt.compare(
        credentials.password,
        user.passwordHash
      );
      if (!valid) return null;
      return { id: user.id, email: user.email, name: user.name };
    },
  })
);

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  providers,
  cookies: {
    sessionToken: {
      name: `next-auth.session-token.captain`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user && (user as { id?: string }).id) {
        // Attach internal id to JWT token
        (token as { id?: string }).id = (user as { id: string }).id;
        try {
          const u = await prisma.user.findUnique({
            where: { id: (user as { id: string }).id },
            select: { role: true },
          });
          if (u?.role) (token as { role?: string }).role = u.role;
        } catch {}
      }
      return token;
    },
    async session({ session, token }) {
      if ((token as { id?: string }).id) {
        (session.user as { id?: string }).id = (token as { id: string }).id;
      }
      if ((token as { role?: string }).role) {
        (session.user as { role?: string }).role = (
          token as { role: string }
        ).role;
      }
      return session;
    },
    async signIn({ user, account, profile }) {
      const start = Date.now();
      const context = {
        evt: "signIn",
        provider: account?.provider,
        userId: user?.id,
        email: user?.email,
      };
      try {
        if (account?.type === "oauth" && user?.email) {
          const profileRecord: Record<string, unknown> | null =
            profile && typeof profile === "object"
              ? (profile as Record<string, unknown>)
              : null;

          const getString = (value: unknown): string | undefined => {
            if (typeof value !== "string") return undefined;
            const trimmed = value.trim();
            return trimmed.length ? trimmed : undefined;
          };

          const nameValue = profileRecord?.["name"];
          const nameObject =
            nameValue && typeof nameValue === "object"
              ? (nameValue as Record<string, unknown>)
              : null;
          const nameObjectFirst = getString(nameObject?.["firstName"]);
          const nameObjectLast = getString(nameObject?.["lastName"]);

          const fullName = (
            getString(user.name) ||
            getString(nameValue) ||
            getString(profileRecord?.["fullName"]) ||
            (nameObjectFirst && nameObjectLast
              ? `${nameObjectFirst} ${nameObjectLast}`
              : undefined) ||
            "Captain User"
          ).trim();

          const nameParts = fullName.split(/\s+/).filter(Boolean);

          const givenName =
            getString(profileRecord?.["given_name"]) ||
            getString(profileRecord?.["first_name"]) ||
            getString(profileRecord?.["firstName"]) ||
            nameObjectFirst ||
            nameParts[0] ||
            "Captain";

          const familyName =
            getString(profileRecord?.["family_name"]) ||
            getString(profileRecord?.["last_name"]) ||
            getString(profileRecord?.["lastName"]) ||
            nameObjectLast ||
            (nameParts.length > 1 ? nameParts.slice(1).join(" ") : "User");

          try {
            await prisma.user.update({
              where: { id: user.id },
              data: { firstName: givenName, lastName: familyName },
            });
            console.info("[auth] user.update success", {
              ...context,
              action: "userUpdate",
              firstName: givenName,
              lastName: familyName,
              ms: Date.now() - start,
            });
          } catch (e) {
            console.warn("[auth] user.update skipped", {
              ...context,
              error: (e as Error).message,
            });
          }

          // Phase 3: CaptainProfile creation removed from OAuth signup
          // Will be created during charter finalize with real data from form
          // This prevents creating profiles with default values during login
          console.info("[auth] captainProfile creation deferred to finalize", {
            ...context,
            action: "captainProfileDeferred",
            ms: Date.now() - start,
          });
        }
      } catch (err) {
        console.error("[auth] signIn outer error", {
          ...context,
          error: (err as Error).message,
        });
      }

      // Security: For OAuth sign-ins, verify user exists and has appropriate access
      // PrismaAdapter creates user automatically, but we control access via role checks
      if (account?.type === "oauth") {
        // For OAuth users, always allow sign-in. The PrismaAdapter handles user creation.
        // Previously we checked if user exists by ID, but this caused issues with new
        // registrations due to timing issues with serverless DBs (Neon) where the newly
        // created user record wasn't immediately visible for ID-based lookups.
        //
        // OAuth providers (Google, etc.) have already verified the user's identity,
        // and the PrismaAdapter creates/updates the user record. Additional DB checks
        // here are unnecessary and can cause "access denied" errors for new users.
        //
        // Role-based access control is enforced at the route/middleware level.
        try {
          // Try to fetch user info for logging purposes only
          const existingUser = await prisma.user.findUnique({
            where: { id: user.id },
            select: {
              id: true,
              role: true,
              email: true,
              createdAt: true,
            },
          });

          // Check if this is a newly created user (created in last 5 seconds)
          const isNewUser = existingUser
            ? Date.now() - existingUser.createdAt.getTime() < 5000
            : true; // If we can't find user, they're likely new

          // Default role for new OAuth users (matches Prisma schema default)
          const DEFAULT_OAUTH_ROLE = "CAPTAIN" as const;

          console.info("[auth] signIn allow", {
            ...context,
            role: existingUser?.role ?? DEFAULT_OAUTH_ROLE,
            isNewUser,
            ms: Date.now() - start,
          });
        } catch (err) {
          // Log the error but don't block sign-in
          console.warn("[auth] user lookup for logging failed", {
            ...context,
            error: (err as Error).message,
          });
        }

        // Always allow OAuth sign-ins - the OAuth provider has verified the user
        return true;
      }

      // For non-OAuth (credentials), allow
      console.info("[auth] signIn allow", {
        ...context,
        ms: Date.now() - start,
      });
      return true;
    },
  },
  // We rely on our custom /auth page handling sign in/up; omit pages.signIn
};

export default authOptions;
