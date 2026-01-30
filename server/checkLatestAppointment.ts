import { getDb } from './db.js';
import { appointments, workoutAssignments } from '../shared/schema.js';
import { desc } from 'drizzle-orm';

async function checkLatest() {
  const db = await getDb();

  console.log('\n=== LATEST APPOINTMENT ===');
  const latestApt = await db.select().from(appointments).orderBy(desc(appointments.createdAt)).limit(1);
  console.log(JSON.stringify(latestApt[0], null, 2));

  console.log('\n=== LATEST WORKOUT ASSIGNMENT ===');
  const latestWA = await db.select().from(workoutAssignments).orderBy(desc(workoutAssignments.assignedAt)).limit(1);
  console.log(JSON.stringify(latestWA[0], null, 2));

  process.exit(0);
}

checkLatest().catch(console.error);
