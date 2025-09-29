import { env } from "@/lib/env"; // triggers validation early
import { prisma } from "@/lib/prisma";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import bcrypt from "bcryptjs";
import type { NextAuthOptions } from "next-auth";
import AppleProvider from "next-auth/providers/apple";
import CredentialsProvider from "next-auth/providers/credentials";
import FacebookProvider from "next-auth/providers/facebook";
import GoogleProvider from "next-auth/providers/google";

export type OAuthProviderInfo = {
  id: string;
  name: string;
  configured: boolean;
};

const googleConfigured = Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);
const facebookConfigured = Boolean(
  env.FACEBOOK_CLIENT_ID && env.FACEBOOK_CLIENT_SECRET
);
const appleConfigured = Boolean(env.APPLE_CLIENT_ID && env.APPLE_CLIENT_SECRET);

export const oauthProviders: OAuthProviderInfo[] = [
  {
    id: "google",
    name: "Google",
    configured: googleConfigured,
  },
  {
    id: "facebook",
    name: "Facebook",
    configured: facebookConfigured,
  },
  {
    id: "apple",
    name: "Apple",
    configured: appleConfigured,
  },
];

const providers: NextAuthOptions["providers"] = [];

if (googleConfigured) {
  providers.push(
    GoogleProvider({
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      allowDangerousEmailAccountLinking: true,
    })
  );
}

if (facebookConfigured) {
  providers.push(
    FacebookProvider({
      clientId: env.FACEBOOK_CLIENT_ID!,
      clientSecret: env.FACEBOOK_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true,
    })
  );
}

if (appleConfigured) {
  providers.push(
    AppleProvider({
      clientId: env.APPLE_CLIENT_ID!,
      clientSecret: env.APPLE_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true,
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
      });
      if (!user?.passwordHash) return null; // user exists but only via OAuth
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
            (nameParts.length > 1
              ? nameParts.slice(1).join(" ")
              : "User");

          try {
            await prisma.user.update({
              where: { id: user.id },
              data: { firstName: givenName, lastName: familyName },
            });
          } catch (e) {
            console.warn("[auth] user.update skipped", {
              ...context,
              error: (e as Error).message,
            });
          }

          try {
            await prisma.captainProfile.upsert({
              where: { userId: user.id },
              update: {},
              create: {
                userId: user.id,
                firstName: givenName,
                lastName: familyName,
                displayName:
                  fullName || `${givenName} ${familyName}`.trim(),
                phone: "",
                bio: "",
                experienceYrs: 0,
              },
            });
            console.info("[auth] captainProfile ensured", {
              ...context,
              action: "captainProfileUpsert",
              ms: Date.now() - start,
            });
          } catch (e) {
            console.error("[auth] captainProfile upsert failed", {
              ...context,
              error: (e as Error).message,
            });
          }
        }
      } catch (err) {
        console.error("[auth] signIn outer error", {
          ...context,
          error: (err as Error).message,
        });
      }
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
