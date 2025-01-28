import { createClient } from "@/utils/supabase/server";
import { createAdminChatChain, createCustomerChatChain } from "@/lib/langchain/chat";
import { ChatInput, ChatResponse, Message } from "@/types/chat";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const input: ChatInput = await request.json();
    const supabase = await createClient();
    
    // Get current user and their role
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get user's role from users table
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    const isAdmin = userData?.role === 'admin';

    // Create appropriate chat chain based on user role
    const chain = isAdmin ? createAdminChatChain() : createCustomerChatChain();

    // Process the message
    const response = await chain.invoke({
      chatHistory: [], // Since we're keeping it ephemeral, we don't load history
      userInput: input.message,
    });

    const message: Message = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: response,
      createdAt: new Date(),
      metadata: input.metadata,
    };

    return NextResponse.json({ message } satisfies ChatResponse);
  } catch (error) {
    console.error("Error in chat route:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
} 
