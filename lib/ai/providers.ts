type ChatMessage = {
  role: "system" | "user";
  content: string;
};

export type LlmProvider = {
  name: string;
  enabled: boolean;
  invoke: (messages: ChatMessage[]) => Promise<string>;
};

async function invokeOpenAiCompatible(
  baseUrl: string,
  apiKey: string | undefined,
  model: string,
  messages: ChatMessage[]
) {
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {})
    },
    body: JSON.stringify({
      model,
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages
    }),
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`Provider request failed with ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content ?? "{}";
}

export function getProviders(): LlmProvider[] {
  return [
    {
      name: "openai",
      enabled: Boolean(process.env.OPENAI_API_KEY),
      invoke: (messages) =>
        invokeOpenAiCompatible(
          process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1",
          process.env.OPENAI_API_KEY,
          process.env.OPENAI_MODEL ?? "gpt-4.1-mini",
          messages
        )
    },
    {
      name: "local-llm",
      enabled: Boolean(process.env.LOCAL_LLM_BASE_URL),
      invoke: (messages) =>
        invokeOpenAiCompatible(
          process.env.LOCAL_LLM_BASE_URL ?? "http://127.0.0.1:1234/v1",
          undefined,
          process.env.LOCAL_LLM_MODEL ?? "local-model",
          messages
        )
    },
    {
      name: "huggingface",
      enabled: Boolean(process.env.HUGGINGFACE_API_KEY),
      invoke: async (messages) => {
        const response = await fetch(
          `https://api-inference.huggingface.co/models/${process.env.HUGGINGFACE_MODEL ?? "HuggingFaceH4/zephyr-7b-beta"}`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              inputs: messages.map((message) => `${message.role.toUpperCase()}: ${message.content}`).join("\n")
            }),
            cache: "no-store"
          }
        );

        if (!response.ok) {
          throw new Error(`HuggingFace request failed with ${response.status}`);
        }

        const data = await response.json();
        const text = Array.isArray(data) ? data[0]?.generated_text : data?.generated_text;
        return typeof text === "string" ? text : "{}";
      }
    }
  ];
}

export async function invokeWithFallback(messages: ChatMessage[]) {
  const providers = getProviders().filter((provider) => provider.enabled);
  const errors: string[] = [];

  for (const provider of providers) {
    try {
      const content = await provider.invoke(messages);
      return { provider: provider.name, content };
    } catch (error) {
      errors.push(`${provider.name}: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  return {
    provider: "deterministic-fallback",
    content: "",
    errors
  };
}
