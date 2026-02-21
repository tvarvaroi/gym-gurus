import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { eq, and } from 'drizzle-orm';
import { db } from './db';
import { users, passwordResetTokens, type User } from '../shared/schema';

// Authentication configuration
const SALT_ROUNDS = 10;
const RESET_TOKEN_EXPIRY_HOURS = 1; // Password reset tokens expire in 1 hour
const RESET_TOKEN_LENGTH = 32; // Length of reset token in bytes

/**
 * Hash a plain text password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Verify a password against a hashed password
 */
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

/**
 * Generate a secure random token for password reset
 */
function generateResetToken(): string {
  return crypto.randomBytes(RESET_TOKEN_LENGTH).toString('hex');
}

/**
 * Register a new user with email and password
 */
export async function registerUser(data: {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  role?: 'trainer' | 'client' | 'solo';
}): Promise<{ user: User; error?: string }> {
  try {
    // Check if user already exists
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, data.email.toLowerCase()),
    });

    if (existingUser) {
      return {
        user: existingUser,
        error: 'User with this email already exists',
      };
    }

    // Hash password
    const hashedPassword = await hashPassword(data.password);

    // Create user
    const [newUser] = await db
      .insert(users)
      .values({
        email: data.email.toLowerCase(),
        password: hashedPassword,
        firstName: data.firstName,
        lastName: data.lastName,
        role: data.role || 'solo',
        authProvider: 'local',
        emailVerified: false, // Require email verification
        trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14-day free trial
      })
      .returning();

    return { user: newUser };
  } catch (error) {
    console.error('Error registering user:', error);
    throw new Error('Failed to register user');
  }
}

/**
 * Authenticate user with email and password
 */
export async function loginUser(
  email: string,
  password: string
): Promise<{ user: User | null; error?: string }> {
  try {
    // Find user by email
    const user = await db.query.users.findFirst({
      where: eq(users.email, email.toLowerCase()),
    });

    if (!user) {
      return { user: null, error: 'Invalid email or password' };
    }

    // Check if user has a password (not OAuth-only user)
    if (!user.password) {
      return {
        user: null,
        error: 'Please sign in with Google or reset your password',
      };
    }

    // Verify password
    const isValid = await verifyPassword(password, user.password);

    if (!isValid) {
      return { user: null, error: 'Invalid email or password' };
    }

    return { user };
  } catch (error) {
    console.error('Error logging in user:', error);
    throw new Error('Failed to log in');
  }
}

/**
 * Create or register OAuth user (Google, etc.)
 */
export async function registerOAuthUser(data: {
  email: string;
  firstName?: string;
  lastName?: string;
  profileImageUrl?: string;
  authProvider: string;
  authProviderId: string;
  role?: 'trainer' | 'client' | 'solo';
}): Promise<User> {
  try {
    // Check if user exists by email
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, data.email.toLowerCase()),
    });

    if (existingUser) {
      // Update OAuth info if needed
      if (
        existingUser.authProvider !== data.authProvider ||
        existingUser.authProviderId !== data.authProviderId
      ) {
        const [updatedUser] = await db
          .update(users)
          .set({
            authProvider: data.authProvider,
            authProviderId: data.authProviderId,
            emailVerified: true, // OAuth emails are pre-verified
            profileImageUrl: data.profileImageUrl || existingUser.profileImageUrl,
            updatedAt: new Date(),
          })
          .where(eq(users.id, existingUser.id))
          .returning();

        return updatedUser;
      }

      return existingUser;
    }

    // Create new OAuth user
    const [newUser] = await db
      .insert(users)
      .values({
        email: data.email.toLowerCase(),
        firstName: data.firstName,
        lastName: data.lastName,
        profileImageUrl: data.profileImageUrl,
        authProvider: data.authProvider,
        authProviderId: data.authProviderId,
        emailVerified: true, // OAuth emails are pre-verified
        role: data.role || 'solo',
        password: null, // OAuth users don't have passwords
        trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14-day free trial
      })
      .returning();

    return newUser;
  } catch (error) {
    console.error('Error registering OAuth user:', error);
    throw new Error('Failed to register OAuth user');
  }
}

/**
 * Create a password reset token for a user
 */
export async function createPasswordResetToken(
  email: string
): Promise<{ token: string | null; error?: string }> {
  try {
    // Find user by email
    const user = await db.query.users.findFirst({
      where: eq(users.email, email.toLowerCase()),
    });

    if (!user) {
      // Don't reveal if user exists or not (security)
      return { token: null };
    }

    // Generate reset token
    const token = generateResetToken();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + RESET_TOKEN_EXPIRY_HOURS);

    // Store token in database
    await db.insert(passwordResetTokens).values({
      userId: user.id,
      token,
      expiresAt,
      used: false,
    });

    return { token };
  } catch (error) {
    console.error('Error creating password reset token:', error);
    throw new Error('Failed to create password reset token');
  }
}

/**
 * Verify a password reset token
 */
export async function verifyPasswordResetToken(
  token: string
): Promise<{ valid: boolean; userId?: string; error?: string }> {
  try {
    const resetToken = await db.query.passwordResetTokens.findFirst({
      where: eq(passwordResetTokens.token, token),
    });

    if (!resetToken) {
      return { valid: false, error: 'Invalid reset token' };
    }

    if (resetToken.used) {
      return { valid: false, error: 'Reset token has already been used' };
    }

    if (new Date() > new Date(resetToken.expiresAt)) {
      return { valid: false, error: 'Reset token has expired' };
    }

    return { valid: true, userId: resetToken.userId };
  } catch (error) {
    console.error('Error verifying password reset token:', error);
    throw new Error('Failed to verify reset token');
  }
}

/**
 * Reset a user's password using a valid reset token
 */
export async function resetPassword(
  token: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Verify token
    const { valid, userId, error } = await verifyPasswordResetToken(token);

    if (!valid || !userId) {
      return { success: false, error };
    }

    // Hash new password
    const hashedPassword = await hashPassword(newPassword);

    // Update user password
    await db
      .update(users)
      .set({
        password: hashedPassword,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    // Mark token as used
    await db
      .update(passwordResetTokens)
      .set({ used: true })
      .where(eq(passwordResetTokens.token, token));

    return { success: true };
  } catch (error) {
    console.error('Error resetting password:', error);
    throw new Error('Failed to reset password');
  }
}

/**
 * Mark user email as verified
 */
export async function verifyUserEmail(userId: string): Promise<void> {
  try {
    await db
      .update(users)
      .set({
        emailVerified: true,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  } catch (error) {
    console.error('Error verifying user email:', error);
    throw new Error('Failed to verify email');
  }
}

/**
 * Change user password (for authenticated users)
 */
export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get user
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user) {
      return { success: false, error: 'User not found' };
    }

    if (!user.password) {
      return {
        success: false,
        error: 'Cannot change password for OAuth-only accounts',
      };
    }

    // Verify current password
    const isValid = await verifyPassword(currentPassword, user.password);

    if (!isValid) {
      return { success: false, error: 'Current password is incorrect' };
    }

    // Hash new password
    const hashedPassword = await hashPassword(newPassword);

    // Update password
    await db
      .update(users)
      .set({
        password: hashedPassword,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    return { success: true };
  } catch (error) {
    console.error('Error changing password:', error);
    throw new Error('Failed to change password');
  }
}

/**
 * Get user by ID (for session management)
 */
export async function getUserById(userId: string): Promise<User | null> {
  try {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    return user || null;
  } catch (error) {
    console.error('Error getting user by ID:', error);
    return null;
  }
}

/**
 * Get user by email
 */
export async function getUserByEmail(email: string): Promise<User | null> {
  try {
    const user = await db.query.users.findFirst({
      where: eq(users.email, email.toLowerCase()),
    });

    return user || null;
  } catch (error) {
    console.error('Error getting user by email:', error);
    return null;
  }
}

/**
 * Authenticate WebSocket session
 * Returns userId if session is valid, null otherwise
 */
export async function authenticateWebSocketSession(
  sessionId: string,
  sessionStore: any
): Promise<string | null> {
  return new Promise((resolve) => {
    sessionStore.get(sessionId, (err: any, session: any) => {
      if (err || !session || !session.userId) {
        resolve(null);
      } else {
        resolve(session.userId);
      }
    });
  });
}
