const PBKDF2_ITERATIONS = 100_000;
const SALT_LENGTH = 16;
const KEY_LENGTH = 32;
const ALGORITHM = "PBKDF2";

async function deriveKey(
  password: string,
  salt: Uint8Array,
): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    ALGORITHM,
    false,
    ["deriveBits"],
  );
  return crypto.subtle.deriveBits(
    { name: ALGORITHM, salt: salt.buffer as ArrayBuffer, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    keyMaterial,
    KEY_LENGTH * 8,
  );
}

function toHex(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  return [...bytes]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function fromHex(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let index = 0; index < hex.length; index += 2) {
    bytes[index / 2] = parseInt(hex.substring(index, index + 2), 16);
  }
  return bytes;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  const derivedKey = await deriveKey(password, salt);
  return `pbkdf2:${toHex(salt)}:${toHex(derivedKey)}`;
}

export async function verifyPassword({
  hash,
  password,
}: {
  hash: string;
  password: string;
}): Promise<boolean> {
  if (hash.startsWith("pbkdf2:")) {
    const [, saltHex, keyHex] = hash.split(":");
    if (!saltHex || !keyHex) return false;
    const salt = fromHex(saltHex);
    const derivedKey = await deriveKey(password, salt);
    return toHex(derivedKey) === keyHex;
  }

  // Fallback: legacy scrypt hash from better-auth (format: "salt:key")
  const { verifyPassword: verifyScrypt } = await import(
    "better-auth/crypto"
  );
  return verifyScrypt({ hash, password });
}
