import { PrismaClient } from ".prisma/client-market";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
const prisma = new PrismaClient();

(async () => {
  try {
    const conv = await prisma.conversation.findFirst();
    if (!conv) {
      console.log("No conversations found");
      process.exit(1);
    }
    console.log("Testing message creation for conversation:", conv.id);
    const testMsg = await prisma.message.create({
      data: {
        conversationId: conv.id,
        senderId: "test-user",
        senderType: "captain",
        senderName: "Test Captain",
        content: "Test message from CLI",
        contentType: "text",
        isQuickReply: false,
        status: "SENT",
      },
    });
    console.log("Message created successfully:", testMsg.id);
    await prisma.message.delete({ where: { id: testMsg.id } });
    console.log("Test message deleted");
    await prisma.$disconnect();
    console.log("SUCCESS: Message creation works!");
  } catch (error) {
    console.error("ERROR:", error.message);
    console.error("Stack:", error.stack);
    process.exit(1);
  }
})();
