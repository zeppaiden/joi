import { createClient } from "@/utils/supabase/server";
import { generateEmbedding } from "@/lib/openai";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { messageId, content } = await request.json();
    
    if (!messageId || !content) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Generate embedding
    const embedding = await generateEmbedding(content);

    // Convert embedding array to pgvector format
    const pgvector = `[${embedding.join(',')}]`;

    // Update message with embedding
    const supabase = await createClient();
    const { error } = await supabase
      .from("messages")
      .update({ embedding: pgvector })
      .eq("id", messageId);

    if (error) {
      console.error("Error updating message embedding:", error);
      return NextResponse.json(
        { error: "Failed to update message embedding" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in message embedding route:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
} 