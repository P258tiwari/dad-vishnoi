// Count streamed bytes too: Content-Length alone can be absent or forged.
export async function boundedRequest(request: Request, maxBytes: number): Promise<Request> {
  const reader = request.body?.getReader();
  if (!reader) throw new Error("Missing request body");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) {
        await reader.cancel();
        throw new Error("Request body exceeds limit");
      }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  return new Request(request.url, {
    method: request.method,
    headers: request.headers,
    body: Buffer.concat(chunks),
  });
}
