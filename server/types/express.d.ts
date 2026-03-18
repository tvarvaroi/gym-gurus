import { type User } from '../../shared/schema';

declare global {
  namespace Express {
    interface Request {
      user?: User;
      session?: {
        userId?: string;
        destroy: (cb?: (err?: Error) => void) => void;
      } & Record<string, unknown>;
    }
  }
}

export {};
