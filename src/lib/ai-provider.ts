/**
 * Centralized AI provider abstraction.
 *
 * Supports three backends:
 * 1. Google Gemini  — @google/generative-ai SDK (streaming + tool calling)
 * 2. OpenAI-compat  — raw fetch to any OpenAI-compatible endpoint (NVIDIA NIM, vLLM, etc.)
 * 3. Vertex AI      — raw fetch to Google Cloud Vertex AI (OAuth2 bearer token)
 *
 * Provider selection is driven by admin settings stored in MongoDB `settings.aiProvider`,
 * falling back to env-var auto-detection.
 */

import { GoogleGenerativeAI, type Content, type Part } from "@google/generative-ai";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AiProviderId = "gemini" | "openai-compat" | "vertex";

export interface AiProviderConfig {
  provider: AiProviderId;
  model: string;
  apiKey?: string | null;
  baseUrl?: string | null;     // openai-compat: custom base URL; vertex: projectId + region
  temperature?: number;
  maxOutputTokens?: number;
  vertexProjectId?: string;
  vertexLocation?: string;
}

export interface ToolDeclaration {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export interface GenerateRequest {
  systemInstruction: string;
  contents: Content[];
  tools?: ToolDeclaration[];
  temperature?: number;
  maxOutputTokens?: number;
}

export interface GenerateResult {
  text: string | null;
  toolCalls?: Array<{ name: string; args: Record<string, unknown> }>;
}

export interface StreamChunk {
  text?: string;
  toolCalls?: Array<{ name: string; args: Record<string, unknown> }>;
}

export interface StreamResult {
  stream: AsyncIterable<StreamChunk>;
  response: Promise<GenerateResult>;
}

// ---------------------------------------------------------------------------
// Retry with exponential backoff
// ---------------------------------------------------------------------------

interface RetryOptions {
  retries?: number;
  baseMs?: number;
  factor?: number;
  capMs?: number;
}

function isRetryable(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  // 429 rate-limit and 5xx are transient; network/abort are retryable.
  if (/429|Too Many Requests/i.test(err.message)) return true;
  if (/5\d\d/.test(err.message)) return true;
  if (/fetch failed|network|ECONN|ETIMEDOUT|timeout/i.test(err.message)) return true;
  return false;
}

async function withRetry<T>(
  fn: () => Promise<T>,
  opts: RetryOptions = {},
): Promise<T> {
  const retries = opts.retries ?? 3;
  const baseMs = opts.baseMs ?? 800;
  const factor = opts.factor ?? 2;
  const capMs = opts.capMs ?? 8000;

  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt === retries || !isRetryable(err)) break;
      const delay = Math.min(capMs, baseMs * Math.pow(factor, attempt));
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastErr;
}

// ---------------------------------------------------------------------------
// Provider config resolution
// ---------------------------------------------------------------------------

export async function resolveAiConfig(
  overrides?: Partial<AiProviderConfig>,
): Promise<AiProviderConfig> {
  // Try to load from MongoDB settings first
  const dbConfig = await loadDbConfig().catch(() => null);

  const config: AiProviderConfig = {
    provider: overrides?.provider ?? dbConfig?.provider ?? autoDetectProvider(),
    model: overrides?.model ?? dbConfig?.model ?? autoDetectModel(dbConfig?.provider ?? autoDetectProvider()),
    apiKey: overrides?.apiKey ?? dbConfig?.apiKey ?? undefined,
    baseUrl: overrides?.baseUrl ?? dbConfig?.baseUrl ?? undefined,
    temperature: overrides?.temperature ?? dbConfig?.temperature ?? 0.3,
    maxOutputTokens: overrides?.maxOutputTokens ?? dbConfig?.maxOutputTokens ?? 2048,
    vertexProjectId: overrides?.vertexProjectId ?? dbConfig?.vertexProjectId ?? undefined,
    vertexLocation: overrides?.vertexLocation ?? dbConfig?.vertexLocation ?? "us-central1",
  };

  // Resolve API key from env if not set
  if (!config.apiKey) {
    config.apiKey = resolveApiKey(config.provider);
  }

  return config;
}

function autoDetectProvider(): AiProviderId {
  if (process.env.GEMINI_API_KEY) return "gemini";
  if (process.env.NVIDIA_NIM_API_KEY || process.env.OPENAI_API_KEY) return "openai-compat";
  if (process.env.VERTEX_PROJECT_ID || process.env.GOOGLE_APPLICATION_CREDENTIALS) return "vertex";
  return "gemini"; // default
}

function autoDetectModel(provider: AiProviderId): string {
  switch (provider) {
    case "gemini": return "gemini-2.0-flash";
    case "openai-compat": return "meta/llama-3.1-70b-instruct";
    case "vertex": return "gemini-2.0-flash";
  }
}

function resolveApiKey(provider: AiProviderId): string | undefined {
  switch (provider) {
    case "gemini": return process.env.GEMINI_API_KEY;
    case "openai-compat": return process.env.NVIDIA_NIM_API_KEY ?? process.env.OPENAI_API_KEY;
    case "vertex": return process.env.VERTEX_API_KEY ?? process.env.GOOGLE_API_KEY;
  }
}

async function loadDbConfig(): Promise<Partial<AiProviderConfig> | null> {
  try {
    const { clientPromise, GLOBAL_SETTINGS_ID } = await import("@/lib/db");
    const mongoClient = await clientPromise;
    const db = mongoClient.db(process.env.MONGODB_DB || "stadium_ops");
    const settings = await db.collection("settings").findOne({ _id: GLOBAL_SETTINGS_ID });
    return settings?.aiProvider ?? null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Gemini provider
// ---------------------------------------------------------------------------

class GeminiProvider {
  private genAI: GoogleGenerativeAI;
  private config: AiProviderConfig;

  constructor(config: AiProviderConfig) {
    if (!config.apiKey) throw new Error("Gemini API key not configured");
    this.genAI = new GoogleGenerativeAI(config.apiKey);
    this.config = config;
  }

  private toGeminiTools(tools?: ToolDeclaration[]) {
    if (!tools || tools.length === 0) return undefined;
    return [{ functionDeclarations: tools }];
  }

  async generate(req: GenerateRequest): Promise<GenerateResult> {
    return withRetry(async () => {
      const model = this.genAI.getGenerativeModel({
        model: this.config.model,
        systemInstruction: req.systemInstruction,
        tools: this.toGeminiTools(req.tools) as never,
      });

      const result = await model.generateContent({
        contents: req.contents,
        generationConfig: {
          temperature: req.temperature ?? this.config.temperature,
          maxOutputTokens: req.maxOutputTokens ?? this.config.maxOutputTokens,
        },
      });

      const response = result.response;
      const candidates = response.candidates ?? [];
      const parts = candidates[0]?.content?.parts ?? [];

      const textParts = parts.filter((p) => p.text).map((p) => p.text!);
      const toolParts = parts
        .filter((p) => p.functionCall)
        .map((p) => ({
          name: p.functionCall!.name,
          args: (p.functionCall!.args ?? {}) as Record<string, unknown>,
        }));

      return {
        text: textParts.join("") || null,
        toolCalls: toolParts.length > 0 ? toolParts : undefined,
      };
    });
  }

  async *generateStream(req: GenerateRequest): AsyncIterable<StreamChunk> {
    const model = this.genAI.getGenerativeModel({
      model: this.config.model,
      systemInstruction: req.systemInstruction,
      tools: this.toGeminiTools(req.tools) as never,
    });

    const stream = await withRetry(() =>
      model.generateContentStream({
        contents: req.contents,
        generationConfig: {
          temperature: req.temperature ?? this.config.temperature,
          maxOutputTokens: req.maxOutputTokens ?? this.config.maxOutputTokens,
        },
      }),
    );

    for await (const chunk of stream.stream) {
      const parts = (chunk.candidates?.[0]?.content?.parts ?? []) as Part[];
      const textParts = parts.filter((p) => p.text).map((p) => p.text!);
      const toolParts = parts
        .filter((p) => p.functionCall)
        .map((p) => ({
          name: p.functionCall!.name,
          args: (p.functionCall!.args ?? {}) as Record<string, unknown>,
        }));

      if (textParts.length > 0 || toolParts.length > 0) {
        yield {
          text: textParts.join("") || undefined,
          toolCalls: toolParts.length > 0 ? toolParts : undefined,
        };
      }
    }
  }
}

// ---------------------------------------------------------------------------
// OpenAI-compatible provider (NVIDIA NIM, vLLM, LM Studio, etc.)
// ---------------------------------------------------------------------------

class OpenAICompatProvider {
  private config: AiProviderConfig;
  private baseUrl: string;

  constructor(config: AiProviderConfig) {
    if (!config.apiKey) throw new Error("OpenAI-compatible API key not configured");
    this.config = config;
    this.baseUrl = config.baseUrl || "https://integrate.api.nvidia.com/v1";
  }

  private toOpenAITools(tools?: ToolDeclaration[]) {
    if (!tools || tools.length === 0) return undefined;
    return tools.map((t) => ({
      type: "function" as const,
      function: {
        name: t.name,
        description: t.description,
        parameters: t.parameters,
      },
    }));
  }

  private mapMessages(contents: Content[], systemInstruction: string) {
    const messages: Array<{ role: string; content: string }> = [
      { role: "system", content: systemInstruction },
    ];
    for (const c of contents) {
      const text = c.parts
        .filter((p): p is { text: string } => "text" in p)
        .map((p) => p.text)
        .join("");
      if (text) {
        messages.push({ role: c.role === "model" ? "assistant" : "user", content: text });
      }
    }
    return messages;
  }

  async generate(req: GenerateRequest): Promise<GenerateResult> {
    const res = await withRetry(() =>
      fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: this.config.model,
          messages: this.mapMessages(req.contents, req.systemInstruction),
          tools: this.toOpenAITools(req.tools),
          temperature: req.temperature ?? this.config.temperature,
          max_tokens: req.maxOutputTokens ?? this.config.maxOutputTokens,
          stream: false,
        }),
      }),
    );

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`OpenAI-compat API error ${res.status}: ${err}`);
    }

    const data = await res.json();
    const choice = data.choices?.[0];
    const msg = choice?.message;

    return {
      text: msg?.content ?? null,
      toolCalls: msg?.tool_calls?.map((tc: { function: { name: string; arguments: string } }) => ({
        name: tc.function.name,
        args: JSON.parse(tc.function.arguments || "{}"),
      })),
    };
  }

  async *generateStream(req: GenerateRequest): AsyncIterable<StreamChunk> {
    const res = await withRetry(() =>
      fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: this.config.model,
          messages: this.mapMessages(req.contents, req.systemInstruction),
          tools: this.toOpenAITools(req.tools),
          temperature: req.temperature ?? this.config.temperature,
          max_tokens: req.maxOutputTokens ?? this.config.maxOutputTokens,
          stream: true,
        }),
      }),
    );

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`OpenAI-compat API error ${res.status}: ${err}`);
    }

    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (data === "[DONE]") return;

          try {
            const parsed = JSON.parse(data);
            const delta = parsed.choices?.[0]?.delta;
            if (!delta) continue;

            if (delta.content) {
              yield { text: delta.content };
            }
            if (delta.tool_calls) {
              // Accumulate tool calls from streaming chunks
              const toolCalls = delta.tool_calls.map((tc: { function?: { name?: string; arguments?: string } }) => ({
                name: tc.function?.name ?? "",
                args: tc.function?.arguments ? JSON.parse(tc.function.arguments) : {},
              }));
              yield { toolCalls };
            }
          } catch {
            // Skip malformed chunks
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
}

// ---------------------------------------------------------------------------
// Vertex AI provider (Google Cloud)
// ---------------------------------------------------------------------------

class VertexAIProvider {
  private config: AiProviderConfig;

  constructor(config: AiProviderConfig) {
    this.config = config;
  }

  private async getAccessToken(): Promise<string> {
    // Use GOOGLE_APPLICATION_CREDENTIALS or GOOGLE_API_KEY
    const key = this.config.apiKey || process.env.GOOGLE_API_KEY;
    if (key) {
      // If an API key is provided, use it directly (works for some Vertex setups)
      return key;
    }

    // Try to get an OAuth2 token from the metadata server (GCE) or service account
    try {
      const res = await fetch(
        "http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token",
        { headers: { "Metadata-Flavor": "Google" } },
      );
      if (res.ok) {
        const data = await res.json();
        return data.access_token;
      }
    } catch {
      // Not on GCE, try gcloud auth
    }

    throw new Error("Vertex AI: No credentials found. Set VERTEX_API_KEY or GOOGLE_APPLICATION_CREDENTIALS.");
  }

  private getEndpoint(): string {
    const project = this.config.vertexProjectId || process.env.VERTEX_PROJECT_ID;
    const location = this.config.vertexLocation || "us-central1";
    if (!project) throw new Error("Vertex AI: VERTEX_PROJECT_ID not set");
    return `https://${location}-aiplatform.googleapis.com/v1/projects/${project}/locations/${location}/publishers/google/models`;
  }

  private toGeminiContents(contents: Content[]) {
    return contents.map((c) => ({
      role: c.role,
      parts: c.parts.map((p) => {
        if ("text" in p) return { text: p.text };
        if ("inlineData" in p) return { inlineData: p.inlineData };
        return p;
      }),
    }));
  }

  async generate(req: GenerateRequest): Promise<GenerateResult> {
    const token = await this.getAccessToken();
    const endpoint = this.getEndpoint();

    const res = await withRetry(() =>
      fetch(`${endpoint}/${this.config.model}:generateContent`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: req.systemInstruction }] },
          contents: this.toGeminiContents(req.contents),
          tools: req.tools?.length
            ? [{ functionDeclarations: req.tools }]
            : undefined,
          generationConfig: {
            temperature: req.temperature ?? this.config.temperature,
            maxOutputTokens: req.maxOutputTokens ?? this.config.maxOutputTokens,
          },
        }),
      }),
    );

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Vertex AI error ${res.status}: ${err}`);
    }

    const data = await res.json();
    const candidates = data.candidates ?? [];
    const parts = candidates[0]?.content?.parts ?? [];

    const textParts = parts.filter((p: Record<string, unknown>) => p.text).map((p: Record<string, unknown>) => p.text as string);
    const toolParts = parts
      .filter((p: Record<string, unknown>) => p.functionCall)
      .map((p: Record<string, unknown>) => {
        const fc = p.functionCall as { name: string; args?: Record<string, unknown> };
        return { name: fc.name, args: fc.args ?? {} };
      });

    return {
      text: textParts.join("") || null,
      toolCalls: toolParts.length > 0 ? toolParts : undefined,
    };
  }

  async *generateStream(req: GenerateRequest): AsyncIterable<StreamChunk> {
    const token = await this.getAccessToken();
    const endpoint = this.getEndpoint();

    const res = await withRetry(() =>
      fetch(`${endpoint}/${this.config.model}:streamGenerateContent?alt=sse`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: req.systemInstruction }] },
          contents: this.toGeminiContents(req.contents),
          tools: req.tools?.length
            ? [{ functionDeclarations: req.tools }]
            : undefined,
          generationConfig: {
            temperature: req.temperature ?? this.config.temperature,
            maxOutputTokens: req.maxOutputTokens ?? this.config.maxOutputTokens,
          },
        }),
      }),
    );

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Vertex AI stream error ${res.status}: ${err}`);
    }

    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (!data) continue;

          try {
            const parsed = JSON.parse(data);
            const parts = parsed.candidates?.[0]?.content?.parts ?? [];
            const textParts = parts.filter((p: Record<string, unknown>) => p.text).map((p: Record<string, unknown>) => p.text as string);
            const toolParts = parts
              .filter((p: Record<string, unknown>) => p.functionCall)
              .map((p: Record<string, unknown>) => {
                const fc = p.functionCall as { name: string; args?: Record<string, unknown> };
                return { name: fc.name, args: fc.args ?? {} };
              });

            if (textParts.length > 0 || toolParts.length > 0) {
              yield {
                text: textParts.join("") || undefined,
                toolCalls: toolParts.length > 0 ? toolParts : undefined,
              };
            }
          } catch {
            // Skip malformed chunks
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export type AiProvider = GeminiProvider | OpenAICompatProvider | VertexAIProvider;

export function createAiProvider(config: AiProviderConfig): AiProvider {
  switch (config.provider) {
    case "gemini":
      return new GeminiProvider(config);
    case "openai-compat":
      return new OpenAICompatProvider(config);
    case "vertex":
      return new VertexAIProvider(config);
    default:
      throw new Error(`Unknown AI provider: ${config.provider}`);
  }
}

// ---------------------------------------------------------------------------
// Quick helper: generate with auto-fallback
// ---------------------------------------------------------------------------

export async function generateWithFallback(
  req: GenerateRequest,
  configOverrides?: Partial<AiProviderConfig>,
): Promise<GenerateResult & { provider: AiProviderId }> {
  const config = await resolveAiConfig(configOverrides);
  const provider = createAiProvider(config);

  try {
    const result = await provider.generate(req);
    return { ...result, provider: config.provider };
  } catch (err) {
    console.error(`[${config.provider}] failed, trying fallback:`, err);

    const allProviders: AiProviderId[] = ["gemini", "openai-compat", "vertex"];
    const fallbacks = allProviders.filter((p) => p !== config.provider);

    for (const fb of fallbacks) {
      const fbKey = resolveApiKey(fb);
      if (!fbKey) continue;

      try {
        const fbConfig: AiProviderConfig = {
          ...config,
          provider: fb,
          apiKey: fbKey,
          model: autoDetectModel(fb),
        };
        const fbProvider = createAiProvider(fbConfig);
        const result = await fbProvider.generate(req);
        return { ...result, provider: fb };
      } catch (fbErr) {
        console.error(`[${fb}] fallback failed:`, fbErr);
      }
    }

    throw new Error("All AI providers failed");
  }
}
