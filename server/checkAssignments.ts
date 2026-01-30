import { getDb } from './db';
import { clients, workoutAssignments, workouts, progressEntries, trainingSessions } from '../shared/schema';
import { eq } from 'drizzle-orm';

async function checkAssignments() {
  const db = await getDb();

  const johnSmith = await db.select().from(clients).where(eq(clients.email, 'john.smith@example.com'));
  if (johnSmith.length === 0) {
    console.log('❌ No John Smith found');
    return;
  }

  const clientId = johnSmith[0].id;
  console.log('\n📋 Checking data for John Smith');
  console.log('   Client ID:', clientId);
  console.log('   Email:', johnSmith[0].email);

  // Check workout assignments
  const assignments = await db.select({
    workoutId: workoutAssignments.workoutId,
    workoutTitle: workouts.title,
    assignedAt: workoutAssignments.assignedAt,
    completedAt: workoutAssignments.completedAt,
  })
  .from(workoutAssignments)
  .leftJoin(workouts, eq(workouts.id, workoutAssignments.workoutId))
  .where(eq(workoutAssignments.clientId, clientId));

  console.log(`\n💪 Workout Assignments: ${assignments.length}`);
  assignments.forEach((a) => {
    console.log(`   - ${a.workoutTitle} (${a.completedAt ? 'Completed' : 'Pending'})`);
  });

  // Check progress entries
  const progress = await db.select().from(progressEntries).where(eq(progressEntries.clientId, clientId));
  console.log(`\n📈 Progress Entries: ${progress.length}`);
  if (progress.length > 0) {
    console.log(`   Latest: ${progress[0].type} = ${progress[0].value} ${progress[0].unit}`);
  }

  // Check sessions
  const sessions = await db.select().from(trainingSessions).where(eq(trainingSessions.clientId, clientId));
  console.log(`\n📅 Training Sessions: ${sessions.length}`);
  const completed = sessions.filter(s => s.status === 'completed').length;
  const scheduled = sessions.filter(s => s.status === 'scheduled').length;
  console.log(`   Completed: ${completed}, Scheduled: ${scheduled}`);
}

checkAssignments().catch(console.error);
