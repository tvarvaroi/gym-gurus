import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";
import { env, isDevelopment, isProduction } from "./env";

// Check if we have proper Replit Auth configuration
const hasReplitAuth = !!(process.env.ISSUER_URL && process.env.REPL_ID && process.env.REPLIT_DOMAINS);

// Only require REPLIT_DOMAINS if we have other Replit Auth config
if (hasReplitAuth && !process.env.REPLIT_DOMAINS) {
  throw new Error("Environment variable REPLIT_DOMAINS not provided");
}

const getOidcConfig = memoize(
  async () => {
    if (!hasReplitAuth) {
      // Replit Auth disabled for development
      return null;
    }
    return await client.discovery(
      new URL(process.env.ISSUER_URL!),
      process.env.REPL_ID!
    );
  },
  { maxAge: 3600 * 1000 }
);

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week

  // In development mode, always use memory store to avoid database dependency issues
  let sessionStore: any = undefined;

  if (!isDevelopment && process.env.DATABASE_URL) {
    // Production mode with database - try to use PostgreSQL store
    try {
      const pgStore = connectPg(session);
      sessionStore = new pgStore({
        conString: process.env.DATABASE_URL,
        createTableIfMissing: true, // Allow creation of express-session table
        ttl: sessionTtl,
        tableName: "sessions", // Match the table name defined in schema.ts
      });
    } catch (error) {
      console.warn("Failed to create PostgreSQL session store, using memory store");
      sessionStore = undefined; // Fall back to MemoryStore
    }
  } else {
    // Use default memory store for development or when no DATABASE_URL
    console.warn("Using memory session store for development");
  }
  
  return session({
    secret: env.SESSION_SECRET,
    ...(sessionStore && { store: sessionStore }), // Only add store if it exists
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: isProduction,
      maxAge: sessionTtl,
      sameSite: 'lax'
    },
  });
}

function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

async function upsertUser(
  claims: any,
  role?: 'trainer' | 'client'
) {
  try {
    await storage.upsertUser({
      id: claims["sub"],
      email: claims["email"],
      firstName: claims["first_name"],
      lastName: claims["last_name"],
      profileImageUrl: claims["profile_image_url"],
      role: role,
      trainerId: role === 'client' ? 'demo-trainer-123' : null,
    });
  } catch (error) {
    // If database is unavailable (development mode), continue without persisting
    console.warn("Could not persist user to database (likely in development mode):", error);
    // Authentication will still work with session-based user data
  }
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  // If Replit Auth is not available, set up development auth
  if (!hasReplitAuth) {
    setupDevAuth(app);
    return;
  }

  const config = await getOidcConfig();
  if (!config) {
    throw new Error("Failed to get OIDC configuration");
  }

  const verify: VerifyFunction = async (
    tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
    verified: passport.AuthenticateCallback
  ) => {
    const claims = tokens.claims();
    if (!claims || !claims.sub) {
      return verified(null, false);
    }

    const user: Express.User = {
      id: claims.sub as string,
      email: (claims.email || '') as string,
      firstName: (claims.given_name || null) as string | null,
      lastName: (claims.family_name || null) as string | null,
      profileImageUrl: (claims.picture || null) as string | null,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    updateUserSession(user, tokens);
    // Note: Role will be saved in the callback handler using upsertUser
    verified(null, user);
  };

  const domains = process.env.REPLIT_DOMAINS?.split(",") || [];
  for (const domain of domains) {
    const strategy = new Strategy(
      {
        name: `replitauth:${domain}`,
        config,
        scope: "openid email profile offline_access",
        callbackURL: `https://${domain}/api/callback`,
      },
      verify,
    );
    passport.use(strategy);
  }

  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  app.get("/api/login", (req, res, next) => {
    // Store the role in session before starting OAuth flow
    const role = req.query.role === 'client' ? 'client' : 'trainer';
    (req.session as any).pendingRole = role;

    passport.authenticate(`replitauth:${req.hostname}`, {
      prompt: "login consent",
      scope: ["openid", "email", "profile", "offline_access"],
    })(req, res, next);
  });

  app.get("/api/callback", (req, res, next) => {
    passport.authenticate(`replitauth:${req.hostname}`, async (err, user) => {
      if (err || !user) {
        return res.redirect("/api/login");
      }

      // Get the role from session that was stored in /api/login
      const role = (req.session as any).pendingRole || 'trainer';

      // Clear the pending role from session
      delete (req.session as any).pendingRole;

      // Update user with role in database
      if (user && (user as any).claims) {
        await upsertUser((user as any).claims, role);
      }

      // Log in the user
      req.logIn(user, (loginErr) => {
        if (loginErr) {
          return next(loginErr);
        }
        return res.redirect("/dashboard");
      });
    })(req, res, next);
  });

  app.get("/api/logout", (req, res) => {
    req.logout(() => {
      res.redirect(
        client.buildEndSessionUrl(config, {
          client_id: process.env.REPL_ID!,
          post_logout_redirect_uri: `${req.protocol}://${req.hostname}`,
        }).href
      );
    });
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const user = req.user as any;

  if (!req.isAuthenticated() || !user?.expires_at) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const now = Math.floor(Date.now() / 1000);
  if (now <= user.expires_at) {
    return next();
  }

  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const config = await getOidcConfig();
    if (!config) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }
    const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
    updateUserSession(user, tokenResponse);
    return next();
  } catch (error) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
};

/**
 * Get authenticated user ID from session - secure replacement for header-based auth
 */
export function getAuthenticatedUserId(req: any): string | null {
  const user = req.user as any;
  if (!req.isAuthenticated() || !user?.claims?.sub) {
    return null;
  }
  return user.claims.sub;
}

/**
 * Secure WebSocket authentication helper
 * Verifies session and returns user ID from authenticated session
 */
export async function authenticateWebSocketSession(sessionId: string, sessionStore: any): Promise<string | null> {
  return new Promise((resolve) => {
    sessionStore.get(sessionId, (err: any, session: any) => {
      if (err || !session || !session.passport?.user?.claims?.sub) {
        resolve(null);
        return;
      }
      
      // Verify session hasn't expired
      const now = Math.floor(Date.now() / 1000);
      if (session.passport.user.expires_at && now > session.passport.user.expires_at) {
        resolve(null);
        return;
      }
      
      resolve(session.passport.user.claims.sub);
    });
  });
}

// Development authentication setup when Replit Auth is not available
function setupDevAuth(app: Express) {
  // Create a mock user for development
  const devUser = {
    id: "demo-trainer-123",
    email: "trainer@example.com",
    firstName: "Demo",
    lastName: "Trainer",
    profileImageUrl: null,
    claims: {
      sub: "demo-trainer-123",
      email: "trainer@example.com",
      first_name: "Demo",
      last_name: "Trainer"
    },
    expires_at: Math.floor(Date.now() / 1000) + 86400 // 24 hours from now
  };

  // Set up passport serialization for development
  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  // Development login route
  app.get("/api/login", async (req: any, res) => {
    // Get role from query parameter (defaults to trainer)
    const role = req.query.role === 'client' ? 'client' : 'trainer';

    // Create role-specific demo user
    const demoUser = role === 'client' ? {
      id: "mock-client-1", // Use actual client from trainer's list
      email: "john.smith@example.com",
      firstName: "John",
      lastName: "Smith",
      profileImageUrl: null,
      claims: {
        sub: "mock-client-1",
        email: "john.smith@example.com",
        first_name: "John",
        last_name: "Smith"
      },
      expires_at: Math.floor(Date.now() / 1000) + 86400 // 24 hours from now
    } : devUser;

    // Skip database upsert in development mode when database is unavailable
    try {
      // Try to upsert user if database is available
      await storage.upsertUser({
        id: demoUser.id,
        email: demoUser.email,
        firstName: demoUser.firstName,
        lastName: demoUser.lastName,
        profileImageUrl: demoUser.profileImageUrl,
        role: role, // Set the user's role (trainer or client)
        trainerId: role === 'client' ? 'demo-trainer-123' : null, // Assign trainer to clients
      });

      // If logging in as mock-client-1 (John Smith), ensure client record exists
      if (role === 'client' && demoUser.id === 'mock-client-1') {
        const existingClient = await storage.getClient(demoUser.id);
        if (!existingClient) {
          console.log('Creating client record for John Smith (mock-client-1)...');
          await storage.createClient({
            id: 'mock-client-1',
            trainerId: 'demo-trainer-123',
            name: 'John Smith',
            email: 'john.smith@example.com',
            phone: '+1234567890',
            goal: 'Build muscle and increase strength',
            status: 'active',
            age: 28,
            gender: 'male',
            height: '180',
            weight: '85',
            activityLevel: 'active',
            neckCircumference: '38',
            waistCircumference: '85',
            hipCircumference: null,
            lastSession: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
            nextSession: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)  // 2 days from now
          });
          console.log('✅ Client record created for John Smith');
        }
      }
    } catch (error: any) {
      // Database unavailable - continue without database
      console.warn("Database unavailable in development mode, continuing without user persistence");
    }

    // Set up session
    req.session.passport = { user: demoUser };
    req.session.save((err: any) => {
      if (err) {
        return res.status(500).json({ error: "Failed to create session" });
      }
      res.redirect("/dashboard");
    });
  });

  // Development logout route
  app.get("/api/logout", (req: any, res) => {
    req.session.destroy((err: any) => {
      if (err) {
        console.error('Session destruction error:', err);
        return res.status(500).json({ error: 'Failed to logout' });
      }
      // Clear the session cookie
      res.clearCookie('connect.sid');
      res.json({ success: true });
    });
  });
}