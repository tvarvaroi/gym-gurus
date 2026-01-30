import { getDb } from './db';
import { clients } from '../shared/schema';
import { eq } from 'drizzle-orm';

async function deleteDuplicate() {
  const db = await getDb();

  console.log('🗑️  Deleting duplicate John Smith record (mock-client-1)...');
  await db.delete(clients).where(eq(clients.id, 'mock-client-1'));
  console.log('✅ Deleted successfully');

  const remaining = await db.select().from(clients).where(eq(clients.email, 'john.smith@example.com'));
  console.log('\n📋 Remaining John Smith records:', remaining.length);
  remaining.forEach((record) => {
    console.log('  Client ID:', record.id);
    console.log('  Name:', record.name);
  });
}

deleteDuplicate().catch(console.error);
