import { eq, and } from 'drizzle-orm';
import { getDb } from '../db';
import { clientAccessCodes, clients, users } from '../../shared/schema';

// Characters excluding ambiguous ones: 0, O, 1, I, L
const VALID_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

function generateSegment(length: number): string {
  let result = '';
  for (let i = 0; i < length; i++) {
    result += VALID_CHARS[Math.floor(Math.random() * VALID_CHARS.length)];
  }
  return result;
}

/**
 * Generate a unique access code in format GG-XXXX-XXXX
 * Checks uniqueness against the database before returning
 */
export async function generateAccessCode(): Promise<string> {
  const db = await getDb();
  let code: string;
  let attempts = 0;

  do {
    code = `GG-${generateSegment(4)}-${generateSegment(4)}`;
    const existing = await db
      .select({ id: clientAccessCodes.id })
      .from(clientAccessCodes)
      .where(eq(clientAccessCodes.accessCode, code))
      .limit(1);

    if (existing.length === 0) break;
    attempts++;
  } while (attempts < 10);

  return code;
}

/**
 * Create an access code for a client.
 * Deactivates any existing active code first.
 */
export async function createAccessCodeForClient(
  clientId: string,
  trainerId: string
): Promise<string> {
  const db = await getDb();

  // Deactivate existing active codes for this client
  await db
    .update(clientAccessCodes)
    .set({ isActive: false })
    .where(and(eq(clientAccessCodes.clientId, clientId), eq(clientAccessCodes.isActive, true)));

  const code = await generateAccessCode();

  await db.insert(clientAccessCodes).values({
    clientId,
    accessCode: code,
    isActive: true,
    createdBy: trainerId,
  });

  return code;
}

/**
 * Validate an access code and return the associated user record.
 * Creates a user account for the client if one doesn't exist yet.
 */
export async function validateAccessCode(code: string): Promise<typeof users.$inferSelect | null> {
  const db = await getDb();
  const normalized = code.toUpperCase().trim();

  const [accessCode] = await db
    .select()
    .from(clientAccessCodes)
    .where(and(eq(clientAccessCodes.accessCode, normalized), eq(clientAccessCodes.isActive, true)))
    .limit(1);

  if (!accessCode) return null;

  // Check expiry
  if (accessCode.expiresAt && accessCode.expiresAt < new Date()) return null;

  // Get the client record
  const [client] = await db
    .select()
    .from(clients)
    .where(eq(clients.id, accessCode.clientId))
    .limit(1);

  if (!client) return null;

  // Update lastUsedAt
  await db
    .update(clientAccessCodes)
    .set({ lastUsedAt: new Date() })
    .where(eq(clientAccessCodes.id, accessCode.id));

  // Find or create user account for this client
  const [existingUser] = await db
    .select()
    .from(users)
    .where(and(eq(users.email, client.email.toLowerCase()), eq(users.role, 'client')))
    .limit(1);

  if (existingUser) return existingUser;

  // Parse first/last name from client.name
  const nameParts = client.name.trim().split(/\s+/);
  const firstName = nameParts[0] || client.name;
  const lastName = nameParts.slice(1).join(' ') || '';

  const [newUser] = await db
    .insert(users)
    .values({
      email: client.email.toLowerCase(),
      role: 'client',
      trainerId: client.trainerId,
      firstName,
      lastName,
      authProvider: 'access_code',
      emailVerified: false,
      isIndependent: false,
      onboardingCompleted: true,
    })
    .returning();

  return newUser;
}

/**
 * Regenerate an access code for a client (trainer only).
 */
export async function regenerateAccessCode(
  clientId: string,
  trainerId: string
): Promise<string | null> {
  const db = await getDb();

  // Verify trainer owns this client
  const [client] = await db
    .select()
    .from(clients)
    .where(and(eq(clients.id, clientId), eq(clients.trainerId, trainerId)))
    .limit(1);

  if (!client) return null;

  return createAccessCodeForClient(clientId, trainerId);
}

/**
 * Revoke an access code for a client (trainer only).
 */
export async function revokeAccessCode(clientId: string, trainerId: string): Promise<boolean> {
  const db = await getDb();

  // Verify trainer owns this client
  const [client] = await db
    .select()
    .from(clients)
    .where(and(eq(clients.id, clientId), eq(clients.trainerId, trainerId)))
    .limit(1);

  if (!client) return false;

  await db
    .update(clientAccessCodes)
    .set({ isActive: false })
    .where(and(eq(clientAccessCodes.clientId, clientId), eq(clientAccessCodes.isActive, true)));

  return true;
}

/**
 * Get the current active access code for a client.
 */
export async function getActiveAccessCode(
  clientId: string,
  trainerId: string
): Promise<typeof clientAccessCodes.$inferSelect | null> {
  const db = await getDb();

  // Verify trainer owns this client
  const [client] = await db
    .select()
    .from(clients)
    .where(and(eq(clients.id, clientId), eq(clients.trainerId, trainerId)))
    .limit(1);

  if (!client) return null;

  const [code] = await db
    .select()
    .from(clientAccessCodes)
    .where(and(eq(clientAccessCodes.clientId, clientId), eq(clientAccessCodes.isActive, true)))
    .limit(1);

  return code ?? null;
}
