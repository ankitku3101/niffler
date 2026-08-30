import { eq } from "drizzle-orm";
import Groq from "groq-sdk";
import { db } from "../src/db/client.js";
import { recoveryCases } from "../src/db/schema.js";

// Stage 6, Task 6.1: the smallest possible proof that Groq's tool-calling
// wire format works the way we expect, before any LlmClient interface or
// agent loop exists. One request, one tool definition, print what comes
// back. No tool is actually executed here.

const [existingCase] = await db
  .select()
  .from(recoveryCases)
  .where(eq(recoveryCases.status, "DETECTED"))
  .limit(1);

if (!existingCase) {
  throw new Error("no DETECTED recovery case in DB — run `npm run check:cases` first");
}

console.log("using case:", existingCase.id, "order:", existingCase.orderId);

const groq = new Groq();

const response = await groq.chat.completions.create({
  model: "openai/gpt-oss-120b",
  messages: [
    {
      role: "system",
      content:
        "You are investigating a failed payment recovery case. Use the getOrder tool to look up order details before responding.",
    },
    {
      role: "user",
      content: `Investigate recovery case ${existingCase.id}.`,
    },
  ],
  tools: [
    {
      type: "function",
      function: {
        name: "getOrder",
        description: "Fetch the order (and its payment status) for a recovery case.",
        parameters: {
          type: "object",
          properties: {
            caseId: {
              type: "integer",
              description: "The recovery case id to look up.",
            },
          },
          required: ["caseId"],
        },
      },
    },
  ],
});

const choice = response.choices[0];
if (!choice) {
  throw new Error("Groq returned no choices");
}

console.log("finish_reason:", choice.finish_reason);

const toolCalls = choice.message.tool_calls;
if (toolCalls && toolCalls.length > 0) {
  for (const call of toolCalls) {
    console.log(
      "requested tool:",
      call.function.name,
      "args:",
      JSON.parse(call.function.arguments)
    );
  }
} else {
  console.log("no tool call requested; message content:", choice.message.content);
}

process.exit(0);
