import { env } from "@/lib/env"; // triggers validation early
import { prisma } from "@/lib/prisma";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import bcrypt from "bcryptjs";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  providers: [
    GoogleProvider({
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      allowDangerousEmailAccountLinking: true,
    }),
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
    }),
  ],
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
        if (account?.provider === "google" && user?.email) {
          interface ProfileLike {
            name?: string;
            given_name?: string;
            family_name?: string;
          }
          const p: ProfileLike | null =
            profile && typeof profile === "object"
              ? (profile as ProfileLike)
              : null;
          const fullName = (user.name || p?.name || "Captain User").trim();
          const nameParts = fullName.split(/\s+/);
          const given = p?.given_name || nameParts[0] || "Captain";
          const family =
            p?.family_name ||
            (nameParts.length > 1 ? nameParts.slice(1).join(" ") : "User");

          try {
            await prisma.user.update({
              where: { id: user.id },
              data: { firstName: given, lastName: family },
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
                firstName: given,
                lastName: family,
                displayName: fullName || `${given} ${family}`.trim(),
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
