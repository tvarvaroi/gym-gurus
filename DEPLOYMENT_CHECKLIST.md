# 🚀 Production Deployment Checklist

Use this checklist before deploying GymGurus to production.

## Pre-Deployment

### Environment Setup
- [ ] Create `.env` file with production values
- [ ] Set `NODE_ENV=production`
- [ ] Generate secure `SESSION_SECRET` (min 32 characters)
- [ ] Configure `DATABASE_URL` for production database
- [ ] Verify all environment variables with `npm run dev` (will fail if missing required vars)

### Database
- [ ] Run migrations: `npm run db:push`
- [ ] Verify all new indexes are created
- [ ] Set up database backups (automated daily)
- [ ] Test database connection from production server
- [ ] Configure connection pooling (max 20 connections)

### Security
- [ ] SSL certificate installed and configured
- [ ] HTTPS enforced (HTTP redirects to HTTPS)
- [ ] Firewall configured (only ports 80, 443 open)
- [ ] Security headers verified (Helmet.js)
- [ ] Rate limiting tested
- [ ] Input sanitization validated

### Code Quality
- [ ] All tests passing: `npm run test:run`
- [ ] Coverage > 80%: `npm run test:coverage`
- [ ] No linting errors: `npm run lint`
- [ ] Code formatted: `npm run format:check`
- [ ] TypeScript check: `npm run check`

### Build & Performance
- [ ] Production build successful: `npm run build`
- [ ] Bundle size analyzed: `npm run build:analyze`
- [ ] Bundle size < 200KB gzipped
- [ ] Test production build locally: `npm start`
- [ ] Lighthouse score > 90
- [ ] Web Vitals thresholds met

### Security Audit
- [ ] Run: `npm audit fix`
- [ ] No critical vulnerabilities
- [ ] Dependencies up to date
- [ ] Review and fix moderate vulnerabilities

## Deployment

### Server Setup
- [ ] Node.js 20.x installed
- [ ] npm packages installed: `npm ci --production`
- [ ] Process manager configured (PM2, systemd)
- [ ] Auto-restart on crash configured
- [ ] Logs directory created and writable
- [ ] Static files served with proper cache headers

### Application
- [ ] Build artifacts copied to server
- [ ] Environment variables set
- [ ] Database connection verified
- [ ] WebSocket endpoint working
- [ ] Session storage working
- [ ] File upload directory writable (if applicable)

### Monitoring
- [ ] Error monitoring configured (Sentry recommended)
- [ ] Performance monitoring enabled (Web Vitals)
- [ ] Uptime monitoring configured (UptimeRobot, etc.)
- [ ] Log aggregation set up (optional)
- [ ] Alerts configured for errors/downtime

### DNS & CDN
- [ ] Domain pointing to server
- [ ] CDN configured for static assets (optional)
- [ ] DNS propagation complete
- [ ] www redirect configured (if needed)

## Post-Deployment

### Verification
- [ ] Application accessible at domain
- [ ] SSL certificate valid (no warnings)
- [ ] Login/signup working
- [ ] WebSocket connection working
- [ ] Real-time messaging working
- [ ] File uploads working (if applicable)
- [ ] All features tested in production

### Performance
- [ ] Run Lighthouse audit
- [ ] Check Web Vitals metrics
- [ ] Test page load times
- [ ] Test on mobile devices
- [ ] Test with slow 3G connection

### Security
- [ ] Security headers present (check with https://securityheaders.com)
- [ ] No sensitive data in client-side code
- [ ] No credentials in logs
- [ ] Rate limiting working
- [ ] CSRF protection working

### Monitoring Setup
- [ ] Error tracking verified (Sentry)
- [ ] Performance monitoring verified
- [ ] Uptime monitoring verified
- [ ] Alerts tested

## Rollback Plan

If something goes wrong:

1. **Immediate**:
   ```bash
   # Stop the application
   pm2 stop gymgurus

   # Revert to previous version
   git checkout <previous-tag>
   npm ci --production
   npm run build
   pm2 restart gymgurus
   ```

2. **Database Rollback** (if needed):
   ```bash
   # Restore from backup
   psql $DATABASE_URL < backup.sql
   ```

3. **Verify Rollback**:
   - [ ] Application working
   - [ ] No errors in logs
   - [ ] Database intact

## Production Commands

```bash
# Start application
npm start

# View logs (if using PM2)
pm2 logs gymgurus

# Restart application
pm2 restart gymgurus

# Stop application
pm2 stop gymgurus

# Database migrations
npm run db:push

# Check application status
pm2 status
```

## Environment Variables Template

```env
# Production Environment Variables
NODE_ENV=production
PORT=5000

# Database
DATABASE_URL=postgresql://user:password@host:5432/gymgurus

# Session
SESSION_SECRET=your-secure-32-character-secret-key-here

# Error Monitoring (Optional)
SENTRY_DSN=your-sentry-dsn

# Analytics (Optional)
ANALYTICS_ID=your-analytics-id
```

## Health Check Endpoint

Add this to verify deployment:

```bash
curl https://yourdomain.com/api/health
# Should return: {"status":"ok","uptime":12345}
```

## Common Issues

### Issue: Database connection fails
**Solution**: Check `DATABASE_URL`, firewall rules, and database server status

### Issue: WebSocket not connecting
**Solution**: Verify WebSocket support in reverse proxy (nginx/caddy)

### Issue: High memory usage
**Solution**: Reduce database connection pool size, check for memory leaks

### Issue: Slow response times
**Solution**: Check database indexes, enable query logging, optimize slow queries

## Support

- **Documentation**: See `OPTIMIZATION_SUMMARY.md`
- **Issues**: Check server logs and error monitoring dashboard
- **Database**: Review query performance in database logs

---

## Quick Deployment (First Time)

```bash
# 1. Clone repository
git clone <repo-url>
cd GymGurus

# 2. Install dependencies
npm ci --production

# 3. Set environment variables
cp .env.example .env
nano .env  # Edit with production values

# 4. Build application
npm run build

# 5. Run database migrations
npm run db:push

# 6. Start application
npm start

# 7. Verify deployment
curl http://localhost:5000/api/health
```

---

*Last updated: November 15, 2025*
