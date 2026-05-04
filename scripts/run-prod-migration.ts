// Production-safe migration runner for Railway.
//
// Usage:
//   railway run -- npx tsx scripts/run-prod-migration.ts <up|down> <migration-name>
//
// Why this exists (not server/runMigration.ts):
//   server/runMigration.ts loads the local `.env` file and unconditionally
//   overwrites process.env. When invoked under `railway run`, that means
//   the local Neon dev DATABASE_URL clobbers the Railway-injected prod URL,
//   and the migration silently routes to dev. Caught during the 2026-05-04
//   migration session.
//
//   This script does NOT load .env. It relies on Railway-injected env vars
//   only. db.ts loads .env conditionally (only sets vars that aren't
//   already in process.env), so the Railway-injected DATABASE_URL survives.
//
//   Hard fail-safe: refuses to run if the resolved DB host doesn't look
//   like a Railway proxy host. Converts "wrong database" silent routing
//   into a loud, actionable refusal.
//
// Cleanup ticket (post-Sprint-2 tooling pass):
//   - Fix server/runMigration.ts to respect existing process.env
//   - Standardize CLI invocation across all server/migrations/ files
//   - Once both are done, this script can probably be retired.

const command = process.argv[2];
const migrationName = process.argv[3];

if (!command || !migrationName) {
  console.error('Usage: tsx scripts/run-prod-migration.ts <up|down> <migration-name>');
  process.exit(1);
}

(async () => {
  console.log(`Running ${command} on ${migrationName}`);

  // Pre-flight: parse and print DATABASE_URL host AND database name. Host
  // alone (e.g. gondola.proxy.rlwy.net) doesn't distinguish prod from a
  // future staging environment — printing the database name lets the
  // operator visually confirm "yes that's the prod database" before DDL
  // fires.
  const url = process.env.DATABASE_URL ?? '';
  const match = url.match(/@([^/]+)\/([^?]+)/);
  const dbHost = match?.[1] ?? 'UNSET';
  const dbName = match?.[2] ?? 'UNSET';
  console.log(`DATABASE_URL host: ${dbHost}, database: ${dbName}`);

  // Hard fail-safe: refuse to run if the host doesn't look like Railway.
  // Two failure modes in two attempts both routed to Neon dev silently;
  // this turns the silent failure into a loud refusal.
  if (!dbHost.includes('rlwy.net') && !dbHost.includes('railway')) {
    console.error(`REFUSING — DATABASE_URL host "${dbHost}" doesn't look like Railway prod.`);
    console.error(
      'Expected a Railway proxy host (e.g. gondola.proxy.rlwy.net). ' +
        "If you meant to target a different database, run that environment's tooling instead."
    );
    process.exit(2);
  }

  // 3-second confirmation pause. Cheap insurance — gives the operator a
  // window to Ctrl-C if the printed host/database looks wrong before any
  // DDL fires. The fail-safe above catches non-Railway hosts; this catches
  // "wrong Railway environment" (prod vs staging once that exists).
  console.log('✓ Host check passed. Pausing 3s — Ctrl-C now if this is the wrong database.');
  await new Promise((r) => setTimeout(r, 3000));

  // Dynamic import resolves the .ts source via tsx; the .js extension is
  // the ESM convention and tsx handles the transpilation.
  const mod = await import(`../server/migrations/${migrationName}.js`);

  if (command === 'up') {
    await mod.up();
  } else if (command === 'down') {
    await mod.down();
  } else {
    console.error('Invalid command. Use "up" or "down".');
    process.exit(1);
  }

  console.log('✅ Done');
  process.exit(0);
})().catch((err) => {
  console.error('❌ Failed:', err);
  process.exit(1);
});
