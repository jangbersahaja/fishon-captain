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
export default async function CaptainChatPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession(authOptions);
  const { id } = await params;

  if (!session?.user?.id) {
    redirect("/login");
  }

  // Get captain's charters to verify ownership
  const charters = await prisma.charter.findMany({
    where: { ownerId: session.user.id },
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
    <div className="flex flex-col h-screen bg-white">
      <ChatDetail
        conversationId={id}
        initialConversation={conversation}
        userId={session.user.id}
        showBackButton={true}
      />
    </div>
  );
}
