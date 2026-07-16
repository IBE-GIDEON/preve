// At-rest encryption for OAuth tokens stored in connected_accounts.metadata.
// Server-only. AES-256-GCM via Web Crypto (available in Node 18+ and edge).
//
// Opt-in: set TOKEN_ENCRYPTION_KEY (any long random string) and new tokens
// are sealed as "enc:v1:<iv>:<ciphertext>". openToken() transparently reads
// both sealed and legacy plaintext values, so enabling the key later needs
// no data migration.

const PREFIX = "enc:v1:";

function keyMaterial(): string | null {
  const raw = process.env.TOKEN_ENCRYPTION_KEY?.trim();
  return raw && raw.length >= 16 ? raw : null;
}

async function deriveKey(raw: string): Promise<CryptoKey> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw));
  return crypto.subtle.importKey("raw", digest, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

function toBase64(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("base64");
}

function fromBase64(text: string) {
  // Copy into a plain-ArrayBuffer-backed view (Buffer's ArrayBufferLike
  // backing doesn't satisfy the BufferSource type crypto.subtle expects).
  const buf = Buffer.from(text, "base64");
  const out = new Uint8Array(new ArrayBuffer(buf.length));
  out.set(buf);
  return out;
}

/** Encrypt a token for storage. Returns it unchanged when no key is set. */
export async function sealToken(plain: string): Promise<string> {
  const raw = keyMaterial();
  if (!raw) return plain;

  const key = await deriveKey(raw);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(plain),
  );
  return `${PREFIX}${toBase64(iv)}:${toBase64(new Uint8Array(ciphertext))}`;
}

/** Read a stored token: decrypts sealed values, passes legacy plaintext through. */
export async function openToken(stored: string): Promise<string> {
  if (!stored.startsWith(PREFIX)) return stored;

  const raw = keyMaterial();
  if (!raw) {
    throw new Error("This account's tokens are encrypted — TOKEN_ENCRYPTION_KEY is missing on the server.");
  }

  const [ivPart, dataPart] = stored.slice(PREFIX.length).split(":");
  if (!ivPart || !dataPart) throw new Error("Stored token is malformed.");

  const key = await deriveKey(raw);
  try {
    const plain = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: fromBase64(ivPart) },
      key,
      fromBase64(dataPart),
    );
    return new TextDecoder().decode(plain);
  } catch {
    throw new Error("Couldn't decrypt the stored token (was TOKEN_ENCRYPTION_KEY changed?). Reconnect the account.");
  }
}
