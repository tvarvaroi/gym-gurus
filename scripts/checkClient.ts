if (process.env.NODE_ENV === 'production') {
  console.error('This script must not be run in production');
  process.exit(1);
}

import { getDb } from '../server/db';
import { clients } from '../shared/schema';
import { eq } from 'drizzle-orm';

async function checkClient() {
  const db = await getDb();
  const johnSmithRecords = await db
    .select()
    .from(clients)
    .where(eq(clients.email, 'john.smith@example.com'));
  console.log('\n📋 John Smith client records found:', johnSmithRecords.length);
  johnSmithRecords.forEach((record) => {
    console.log('\n  Client ID:', record.id);
    console.log('  Name:', record.name);
    console.log('  Email:', record.email);
    console.log('  Trainer ID:', record.trainerId);
    console.log('  Goal:', record.goal);
  });
}

checkClient().catch(console.error);
