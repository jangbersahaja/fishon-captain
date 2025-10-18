// Centralized admin bypass logic for all admin impersonation actions
// Usage: getEffectiveUserId({ session, query })

export function getEffectiveUserId({
  session,
  query,
}: {
  session: { user?: { id: string; role?: string } } | null;
  query?: { adminUserId?: string };
}): string | undefined {
  if (!session?.user) return undefined;
  const { id, role } = session.user;
  const adminUserId = query?.adminUserId;
  if (role === "ADMIN" && adminUserId) return adminUserId;
  return id;
}

// Example usage in API routes or pages:
// const userId = getEffectiveUserId({ session, query });

// For UI: use this to show "acting as" banners, warnings, etc.

// For password prompt, see below:
export async function verifyAdminBypassPassword(
  input: string
): Promise<boolean> {
  // Replace with your own secure password check (env var, hash, etc)
  const required = process.env.ADMIN_BYPASS_PASSWORD || "fishon2025";
  return input === required;
}

// Usage: await verifyAdminBypassPassword(passwordInput)
