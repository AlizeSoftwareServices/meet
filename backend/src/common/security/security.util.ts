import * as crypto from 'crypto';

/**
 * Validates whether a webhook destination URL is safe from SSRF attacks.
 * Blocks loopback addresses, cloud metadata services, and internal RFC1918 private IPs.
 */
export function isSafeWebhookUrl(rawUrl: string): boolean {
  if (!rawUrl || typeof rawUrl !== 'string') return false;

  try {
    const parsed = new URL(rawUrl);

    // Only allow HTTP and HTTPS protocols
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return false;
    }

    const hostname = parsed.hostname.toLowerCase().trim();

    // Block loopbacks and local names
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '0.0.0.0' ||
      hostname === '::1' ||
      hostname === '[::1]' ||
      hostname.endsWith('.localhost') ||
      hostname.endsWith('.local')
    ) {
      return false;
    }

    // Block Cloud instance metadata services (AWS, GCP, Azure, DigitalOcean)
    if (hostname === '169.254.169.254' || hostname.startsWith('169.254.')) {
      return false;
    }

    // Block RFC1918 Private IPv4 Ranges:
    // 10.0.0.0/8
    if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)) {
      return false;
    }
    // 172.16.0.0/12 (172.16.0.0 - 172.31.255.255)
    if (/^172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}$/.test(hostname)) {
      return false;
    }
    // 192.168.0.0/16
    if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(hostname)) {
      return false;
    }
    // Carrier Grade NAT 100.64.0.0/10
    if (/^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\.\d{1,3}\.\d{1,3}$/.test(hostname)) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Escapes unsafe characters for HTML context to prevent HTML injection in transactional emails.
 */
export function escapeHtml(str: string | null | undefined): string {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Derives a 32-byte encryption key from environment variables.
 */
function getEncryptionKey(): Buffer {
  const secret = process.env.ENCRYPTION_KEY || process.env.JWT_SECRET || 'meet-secure-vault-encryption-key-32b!';
  return crypto.createHash('sha256').update(secret).digest();
}

const ENCRYPTION_PREFIX = 'enc_gcm:';

/**
 * Encrypts a sensitive string using AES-256-GCM authenticated encryption.
 */
export function encryptToken(plainText: string): string {
  if (!plainText) return plainText;
  if (plainText.startsWith(ENCRYPTION_PREFIX)) return plainText; // already encrypted

  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12); // Standard 96-bit IV for GCM
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return `${ENCRYPTION_PREFIX}${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

/**
 * Decrypts an AES-256-GCM encrypted token. If not encrypted, returns as-is for backwards compatibility.
 */
export function decryptToken(cipherText: string | null | undefined): string {
  if (!cipherText) return '';
  if (!cipherText.startsWith(ENCRYPTION_PREFIX)) {
    return cipherText; // legacy plaintext support
  }

  try {
    const parts = cipherText.slice(ENCRYPTION_PREFIX.length).split(':');
    if (parts.length !== 3) return cipherText;

    const [ivHex, authTagHex, encryptedHex] = parts;
    const key = getEncryptionKey();
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const encrypted = Buffer.from(encryptedHex, 'hex');

    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return decrypted.toString('utf8');
  } catch (err) {
    console.error('Failed to decrypt token:', err);
    return cipherText;
  }
}
