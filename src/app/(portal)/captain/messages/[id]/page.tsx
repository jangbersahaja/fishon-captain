import { getEffectiveUserId } from "@/lib/adminBypass";
import { authOptions } from "@/lib/auth";
import { getConversationEnriched } from "@/lib/message-service";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import { ChatDetail } from "./chat-detail";

/**
 * Mobile-only chat detail page
 * On desktop, chat is shown inline in /captain/messages
 */
// Force dynamic rendering to ensure revalidation works
export const dynamic = "force-dynamic";

export default async function CaptainChatPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ adminUserId?: string }>;
}) {
  const session = await getServerSession(authOptions);
  const { id } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const adminUserId = resolvedSearchParams?.adminUserId;

  if (!session?.user?.id) {
    redirect("/login");
  }

  // Use effective user ID for admin bypass
  const effectiveUserId = getEffectiveUserId({
    session,
    query: { adminUserId },
  });

  if (!effectiveUserId) {
    redirect("/login");
  }

  // Get captain's charters to verify ownership
  const charters = await prisma.charter.findMany({
    where: { ownerId: effectiveUserId },
    select: { id: true },
  });

  const charterIds = charters.map((c) => c.id);

  if (charterIds.length === 0) {
    notFound();
  }

  // Fetch conversation data
  const conversation = await getConversationEnriched(id);

  if (!conversation) {
    notFound();
  }

  // Verify this conversation belongs to one of captain's charters
  if (!charterIds.includes(conversation.charterId)) {
    notFound();
  }

  return (
    <div className="flex flex-col bg-white">
      <ChatDetail
        conversationId={id}
        initialConversation={conversation}
        userId={effectiveUserId}
        showBackButton={true}
      />
    </div>
  );
}
