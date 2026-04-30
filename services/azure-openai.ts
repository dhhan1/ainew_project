import { AzureOpenAI } from "openai";

let cachedClient: AzureOpenAI | null = null;

interface AzureConfig {
  apiKey: string;
  endpoint: string;
  apiVersion: string;
  chatDeployment: string;
  embeddingDeployment?: string;
}

export class AzureConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AzureConfigError";
  }
}

export function readAzureConfig(env: NodeJS.ProcessEnv = process.env): AzureConfig {
  const apiKey = env.AZURE_API_KEY;
  const endpoint = env.AZURE_ENDPOINT;
  const apiVersion = env.AZURE_API_VERSION;
  const chatDeployment = env.AZURE_DEPLOYMENT_NAME;
  const embeddingDeployment = env.AZURE_EMBEDDING_DEPLOYMENT;

  if (!apiKey) throw new AzureConfigError("AZURE_API_KEY is missing");
  if (!endpoint) throw new AzureConfigError("AZURE_ENDPOINT is missing");
  if (!apiVersion) throw new AzureConfigError("AZURE_API_VERSION is missing");
  if (!chatDeployment) throw new AzureConfigError("AZURE_DEPLOYMENT_NAME is missing");

  return {
    apiKey,
    endpoint,
    apiVersion,
    chatDeployment,
    embeddingDeployment,
  };
}

// Hard cap a single Azure call so unreachable / slow endpoints can't stall
// the page render. The summarize layer adds 1 retry on top of this.
const REQUEST_TIMEOUT_MS = 15_000;

export function getAzureClient(env: NodeJS.ProcessEnv = process.env): AzureOpenAI {
  if (cachedClient) return cachedClient;
  const cfg = readAzureConfig(env);
  cachedClient = new AzureOpenAI({
    apiKey: cfg.apiKey,
    endpoint: cfg.endpoint,
    apiVersion: cfg.apiVersion,
    timeout: REQUEST_TIMEOUT_MS,
    maxRetries: 0,
  });
  return cachedClient;
}

export function getChatDeployment(env: NodeJS.ProcessEnv = process.env): string {
  return readAzureConfig(env).chatDeployment;
}

export function resetAzureClientForTests(): void {
  cachedClient = null;
}
