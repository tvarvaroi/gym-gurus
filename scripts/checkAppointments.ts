if (process.env.NODE_ENV === 'production') {
  console.error('This script must not be run in production');
  process.exit(1);
}

import { getDb } from '../server/db.js';
import { appointments, workoutAssignments } from '../shared/schema.js';

async function checkAppointments() {
  const db = await getDb();

  console.log('\n=== APPOINTMENTS ===');
  const appts = await db.select().from(appointments).limit(10);
  console.log(JSON.stringify(appts, null, 2));

  console.log('\n=== WORKOUT ASSIGNMENTS (with scheduledDate) ===');
  const assigns = await db.select().from(workoutAssignments).limit(10);
  console.log(
    JSON.stringify(
      assigns.map((a) => ({
        id: a.id,
        workoutId: a.workoutId,
        clientId: a.clientId,
        scheduledDate: a.scheduledDate,
        scheduledTime: a.scheduledTime,
        customTitle: a.customTitle,
      })),
      null,
      2
    )
  );

  process.exit(0);
}

checkAppointments().catch(console.error);
