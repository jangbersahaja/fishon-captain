import { getEffectiveUserId } from "@/lib/adminBypass";
import { authOptions } from "@/lib/auth";
import { getCaptainConversationsEnriched } from "@/lib/message-service";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import ConversationsClient from "./conversations-client";

/**
 * GET /captain/messages
 *
 * Captain's conversations list page
 * Shows all conversations for captain's charters
 */

// Force dynamic rendering to always fetch fresh data
export const dynamic = "force-dynamic";

export default async function CaptainMessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ selected?: string; adminUserId?: string }>;
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login");
  }

  // Await searchParams (Next.js 15 requirement)
  const params = await searchParams;
  const adminUserId = params.adminUserId;

  // Use effective user ID for admin bypass
  const effectiveUserId = getEffectiveUserId({
    session,
    query: { adminUserId },
  });

  if (!effectiveUserId) {
    redirect("/login");
  }

  // Get all charters owned by this captain
  const charters = await prisma.charter.findMany({
    where: { ownerId: effectiveUserId },
    select: { id: true },
  });

  const charterIds = charters.map((c) => c.id);
  const conversations = await getCaptainConversationsEnriched(charterIds);

  // Serialize dates for client component
  const serializedConversations = conversations.map((conv) => ({
    ...conv,
    messages: conv.messages.map(
      (msg: {
        id: string;
        content: string;
        createdAt: Date;
        senderType: string;
      }) => ({
        ...msg,
        createdAt: msg.createdAt.toISOString(),
      })
    ),
  }));

  const selectedId = params.selected;

  // Fetch selected conversation details if on desktop view
  let selectedConversation = null;
  if (selectedId) {
    const { getConversationEnriched } = await import("@/lib/message-service");
    selectedConversation = await getConversationEnriched(selectedId);
  }

  return (
    <ConversationsClient
      conversations={serializedConversations}
      selectedId={selectedId}
      selectedConversation={selectedConversation}
      userId={effectiveUserId}
    />
  );
}
