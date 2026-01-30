import { getDb } from './db';
import { clients } from '../shared/schema';
import { eq } from 'drizzle-orm';

/**
 * Update existing clients with biometric data
 * Run with: npx tsx server/updateClientsBiometrics.ts
 */

async function updateClients() {
  console.log('🔄 Updating existing clients with biometric data...');

  const db = await getDb();

  try {
    // Get all existing clients
    const existingClients = await db.select().from(clients);
    console.log(`Found ${existingClients.length} existing clients`);

    // Biometric data mapping by name
    const biometricData: Record<string, any> = {
      'Sarah Johnson': {
        age: 32,
        gender: 'female',
        height: '165',
        weight: '72',
        activityLevel: 'moderately_active',
        neckCircumference: '32',
        waistCircumference: '78',
        hipCircumference: '98'
      },
      'Mike Chen': {
        age: 28,
        gender: 'male',
        height: '178',
        weight: '75',
        activityLevel: 'active',
        neckCircumference: '38',
        waistCircumference: '82',
        hipCircumference: '95'
      },
      'Emily Rodriguez': {
        age: 29,
        gender: 'female',
        height: '168',
        weight: '58',
        activityLevel: 'very_active',
        neckCircumference: '30',
        waistCircumference: '68',
        hipCircumference: '88'
      },
      'James Williams': {
        age: 45,
        gender: 'male',
        height: '175',
        weight: '82',
        activityLevel: 'lightly_active',
        neckCircumference: '39',
        waistCircumference: '92',
        hipCircumference: '100'
      },
      'Lisa Thompson': {
        age: 34,
        gender: 'female',
        height: '162',
        weight: '68',
        activityLevel: 'lightly_active',
        neckCircumference: '31',
        waistCircumference: '75',
        hipCircumference: '95'
      },
      'David Martinez': {
        age: 36,
        gender: 'male',
        height: '183',
        weight: '88',
        activityLevel: 'active',
        neckCircumference: '40',
        waistCircumference: '87',
        hipCircumference: '98'
      },
      'Jessica Lee': {
        age: 38,
        gender: 'female',
        height: '160',
        weight: '85',
        activityLevel: 'moderately_active',
        neckCircumference: '33',
        waistCircumference: '92',
        hipCircumference: '108'
      },
      'Robert Taylor': {
        age: 52,
        gender: 'male',
        height: '172',
        weight: '78',
        activityLevel: 'moderately_active',
        neckCircumference: '37',
        waistCircumference: '88',
        hipCircumference: '96'
      },
      'Amanda White': {
        age: 27,
        gender: 'female',
        height: '170',
        weight: '65',
        activityLevel: 'active',
        neckCircumference: '31',
        waistCircumference: '70',
        hipCircumference: '92'
      },
      'Chris Anderson': {
        age: 24,
        gender: 'male',
        height: '180',
        weight: '79',
        activityLevel: 'very_active',
        neckCircumference: '38',
        waistCircumference: '78',
        hipCircumference: '94'
      },
      'Jennifer Brown': {
        age: 41,
        gender: 'female',
        height: '166',
        weight: '62',
        activityLevel: 'moderately_active',
        neckCircumference: '30',
        waistCircumference: '72',
        hipCircumference: '90'
      },
      'Daniel Garcia': {
        age: 31,
        gender: 'male',
        height: '176',
        weight: '92',
        activityLevel: 'very_active',
        neckCircumference: '42',
        waistCircumference: '90',
        hipCircumference: '102'
      }
    };

    // Update each client
    let updatedCount = 0;
    for (const client of existingClients) {
      const data = biometricData[client.name];

      if (data) {
        await db.update(clients)
          .set(data)
          .where(eq(clients.id, client.id));

        console.log(`✅ Updated ${client.name} with biometric data`);
        updatedCount++;
      } else {
        // Add generic biometric data for unknown clients
        const genericData = {
          age: 30 + Math.floor(Math.random() * 20),
          gender: Math.random() > 0.5 ? 'male' : 'female',
          height: (160 + Math.floor(Math.random() * 25)).toString(),
          weight: (60 + Math.floor(Math.random() * 30)).toString(),
          activityLevel: ['sedentary', 'lightly_active', 'moderately_active', 'active', 'very_active'][Math.floor(Math.random() * 5)],
          neckCircumference: (30 + Math.floor(Math.random() * 12)).toString(),
          waistCircumference: (70 + Math.floor(Math.random() * 25)).toString(),
          hipCircumference: (85 + Math.floor(Math.random() * 25)).toString()
        };

        await db.update(clients)
          .set(genericData)
          .where(eq(clients.id, client.id));

        console.log(`✅ Updated ${client.name} with generic biometric data`);
        updatedCount++;
      }
    }

    console.log(`\n✨ Successfully updated ${updatedCount} clients with biometric data!`);

  } catch (error) {
    console.error('❌ Error updating clients:', error);
    throw error;
  }
}

// Run the update
updateClients().catch(console.error);
