// Authentication API Routes
import { Router, Request, Response } from 'express';
import { z } from 'zod';
import {
  registerUser,
  loginUser,
  createPasswordResetToken,
  resetPassword,
  changePassword,
  getUserById,
  verifyUserEmail,
} from '../auth';
import { sendPasswordResetEmail, sendWelcomeEmail } from '../email';
import { validateAccessCode } from '../services/accessCode';

const router = Router();

// Validation schemas
const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password is too long'),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  role: z.enum(['trainer', 'client', 'solo']).optional(),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password is too long'),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z
    .string()
    .min(8, 'New password must be at least 8 characters')
    .max(100, 'Password is too long'),
});

/**
 * POST /api/auth/register
 * Register a new user with email and password
 */
router.post('/register', async (req: Request, res: Response) => {
  try {
    // Validate request body
    const validation = registerSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validation.error.errors,
      });
    }

    const { email, password, firstName, lastName, role } = validation.data;

    // Register user
    const { user, error } = await registerUser({
      email,
      password,
      firstName,
      lastName,
      role,
    });

    if (error) {
      return res.status(400).json({ error });
    }

    // Create session — explicitly save before responding to avoid race conditions
    (req as any).session.userId = user.id;
    (req as any).session.save((err: any) => {
      if (err) {
        console.error('Session save error (register):', err);
        return res.status(500).json({ error: 'Failed to save session' });
      }

      // Send welcome email (async, don't wait)
      if (user.email && user.firstName) {
        sendWelcomeEmail(user.email, user.firstName, user.role).catch((saveErr) =>
          console.error('Failed to send welcome email:', saveErr)
        );
      }

      // Return user without password
      const { password: _, ...userWithoutPassword } = user;
      res.status(201).json({ user: userWithoutPassword });
    });
  } catch (error) {
    console.error('Error in register route:', error);
    res.status(500).json({ error: 'Failed to register user' });
  }
});

/**
 * POST /api/auth/login
 * Authenticate user with email and password
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    // Validate request body
    const validation = loginSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validation.error.errors,
      });
    }

    const { email, password } = validation.data;

    // Authenticate user
    const { user, error } = await loginUser(email, password);

    if (error || !user) {
      return res.status(401).json({ error: error || 'Authentication failed' });
    }

    // Create session — explicitly save before responding to avoid race conditions
    (req as any).session.userId = user.id;
    (req as any).session.save((err: any) => {
      if (err) {
        console.error('Session save error (login):', err);
        return res.status(500).json({ error: 'Failed to save session' });
      }
      const { password: _, ...userWithoutPassword } = user;
      res.json({ user: userWithoutPassword });
    });
  } catch (error) {
    console.error('Error in login route:', error);
    res.status(500).json({ error: 'Failed to log in' });
  }
});

/**
 * POST /api/auth/logout
 * Destroy user session
 */
router.post('/logout', async (req: Request, res: Response) => {
  try {
    (req as any).session.destroy((err: any) => {
      if (err) {
        console.error('Error destroying session:', err);
        return res.status(500).json({ error: 'Failed to log out' });
      }
      res.json({ success: true });
    });
  } catch (error) {
    console.error('Error in logout route:', error);
    res.status(500).json({ error: 'Failed to log out' });
  }
});

/**
 * GET /api/auth/user
 * Primary endpoint used by the frontend — returns flat User object without password.
 * Lives here (inside authRoutes, mounted WITHOUT secureAuth) so the global
 * app.use('/api', secureAuth, ...) middleware doesn't intercept it first.
 */
router.get('/user', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).session?.userId;

    if (!userId) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const user = await getUserById(userId);

    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    const { password: _, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  } catch (error) {
    console.error('Error in /api/auth/user route:', error);
    res.status(500).json({ message: 'Failed to fetch user' });
  }
});

/**
 * GET /api/auth/me
 * Get current authenticated user
 */
router.get('/me', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).session?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const user = await getUserById(userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Return user without password
    const { password: _, ...userWithoutPassword } = user;
    res.json({ user: userWithoutPassword });
  } catch (error) {
    console.error('Error in me route:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

/**
 * POST /api/auth/forgot-password
 * Request a password reset token
 */
router.post('/forgot-password', async (req: Request, res: Response) => {
  try {
    // Validate request body
    const validation = forgotPasswordSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validation.error.errors,
      });
    }

    const { email } = validation.data;

    // Create reset token
    const { token } = await createPasswordResetToken(email);

    // Send password reset email
    if (token) {
      await sendPasswordResetEmail(email, token);
    }

    // Always return success to prevent email enumeration
    res.json({
      success: true,
      message: 'If an account exists with this email, a password reset link has been sent',
    });
  } catch (error) {
    console.error('Error in forgot-password route:', error);
    res.status(500).json({ error: 'Failed to process request' });
  }
});

/**
 * POST /api/auth/reset-password
 * Reset password using a valid token
 */
router.post('/reset-password', async (req: Request, res: Response) => {
  try {
    // Validate request body
    const validation = resetPasswordSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validation.error.errors,
      });
    }

    const { token, password } = validation.data;

    // Reset password
    const { success, error } = await resetPassword(token, password);

    if (!success) {
      return res.status(400).json({ error: error || 'Failed to reset password' });
    }

    res.json({ success: true, message: 'Password reset successfully' });
  } catch (error) {
    console.error('Error in reset-password route:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

/**
 * POST /api/auth/change-password
 * Change password for authenticated user
 */
router.post('/change-password', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).session?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Validate request body
    const validation = changePasswordSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validation.error.errors,
      });
    }

    const { currentPassword, newPassword } = validation.data;

    // Change password
    const { success, error } = await changePassword(userId, currentPassword, newPassword);

    if (!success) {
      return res.status(400).json({ error: error || 'Failed to change password' });
    }

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    console.error('Error in change-password route:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

/**
 * POST /api/auth/verify-email/:token
 * Verify user email address
 */
router.post('/verify-email/:token', async (req: Request, res: Response) => {
  try {
    const { token } = req.params;

    // TODO: Implement email verification token validation
    // This will be similar to password reset but for email verification
    // For now, returning placeholder response

    res.json({
      success: false,
      error: 'Email verification not yet implemented',
    });
  } catch (error) {
    console.error('Error in verify-email route:', error);
    res.status(500).json({ error: 'Failed to verify email' });
  }
});

/**
 * POST /api/auth/disciple-login
 * Log in a client/disciple using their trainer-issued access code
 */
const discipleLoginSchema = z.object({
  accessCode: z.string().min(1, 'Access code is required'),
});

router.post('/disciple-login', async (req: Request, res: Response) => {
  try {
    const validation = discipleLoginSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validation.error.errors,
      });
    }

    const { accessCode } = validation.data;
    const user = await validateAccessCode(accessCode);

    if (!user) {
      return res.status(401).json({
        error: 'Invalid or expired access code. Contact your trainer.',
      });
    }

    // Create session — explicitly save before responding to avoid race conditions
    (req as any).session.userId = user.id;
    (req as any).session.save((err: any) => {
      if (err) {
        console.error('Session save error (disciple-login):', err);
        return res.status(500).json({ error: 'Failed to save session' });
      }
      const { password: _, ...userWithoutPassword } = user;
      res.json({ user: userWithoutPassword });
    });
  } catch (error) {
    console.error('Error in disciple-login route:', error);
    res.status(500).json({ error: 'Failed to log in' });
  }
});

export default router;
