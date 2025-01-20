import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { Navigation } from "@/components/navigation/navigation";
import { Header } from "@/components/navigation/header";
import { ChatWidget } from "@/components/chat/chat-widget";
import { Suspense } from "react";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/sign-in");
  }

  return (
    <div className="flex w-full min-h-screen bg-gray-50">
      {/* Navigation Sidebar */}
      <Navigation />

      <div className="flex-1 flex flex-col">
        {/* Header */}
        <Header />

        {/* Main Content */}
        <Suspense fallback={<div>Loading...</div>}>
          <main className="flex-1 container mx-auto max-w-7xl p-6">
            {children}
          </main>
        </Suspense>
      </div>

      {/* Chat Widget - Client Component */}
      <Suspense fallback={null}>
        <ChatWidget />
      </Suspense>
    </div>
  );
} 