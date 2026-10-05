export function buildGraphUrl(endpoint: string): string {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  return `https://graph.microsoft.com/v1.0/${cleanEndpoint}`;
}

export function parseGraphError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return 'An unknown Microsoft Graph error occurred';
}
