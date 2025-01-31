import { NextResponse } from "next/server";
import { TicketAgent } from "@/lib/langchain/agent";

const agent = new TicketAgent();

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { query, history = [] } = body;

    if (!query) {
      return NextResponse.json(
        { error: "Query is required" },
        { status: 400 }
      );
    }

    const { response, state } = await agent.process(query, history);

    return NextResponse.json({ response, state });
  } catch (error: any) {
    console.error("Error in agent route:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}