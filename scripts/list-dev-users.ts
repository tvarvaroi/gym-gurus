import { getDb } from '../server/db';
import { users } from '../shared/schema';

(async () => {
  const db = await getDb();
  const u = await db.select({ id: users.id, email: users.email, role: users.role }).from(users);
  console.log(JSON.stringify(u, null, 2));
  process.exit(0);
})();
