import { Suspense } from "react";
import { getCurrentUser } from "@/lib/auth";
import Navbar from "@/components/Navbar";
import ChatApp from "@/components/ChatApp";

export default function ChatPage() {
  const user = getCurrentUser();
  return (
    <div>
      <Navbar user={user} />
      <Suspense fallback={null}>
        <ChatApp currentUserId={user?.userId} />
      </Suspense>
    </div>
  );
}
