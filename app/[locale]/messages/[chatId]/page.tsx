import { ChatWindow } from "@/components/chat/chat-window";
import { TuchatiLock } from "@/components/chat/tuchati-lock";

export default async function ChatPage() {
  const unlocked = true;

  return (
    <div className="space-y-6">
      <TuchatiLock enabled={unlocked} />
      <ChatWindow unlocked={unlocked} />
    </div>
  );
}
