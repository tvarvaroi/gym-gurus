---
globs: ['server/**/*.ts']
---

# Backend Rules

- All API routes must validate input with Zod schemas
- Wrap database operations in try/catch, return proper HTTP status codes
- Use Drizzle ORM only, never raw SQL queries
- Log errors with: endpoint, error, userId, timestamp
- Authentication: check req.isAuthenticated() before protected routes
- Role checks: verify user role matches required permission
