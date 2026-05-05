/**
 * Notifications settings tab — Sprint 2 BATCH 5
 *
 * Orchestrates the 5 cards + the summary line:
 *   1. Push permission card (gating — must be solved first)
 *   2. Categories (most-likely-to-be-touched control)
 *   2.5  Preferences summary line (bridge)
 *   3. Quiet hours
 *   4. Email backup (failsafe)
 *   5. Active devices (admin/audit)
 *
 * Layout reads top-to-bottom: enable → tune what arrives → tune when → failsafe →
 * see what's connected. Order locked by user during BATCH 4 brainstorm.
 */

import { PushPermissionCard } from './PushPermissionCard';
import { NotificationCategoriesCard } from './NotificationCategoriesCard';
import { PreferencesSummaryLine } from './PreferencesSummaryLine';
import { QuietHoursCard } from './QuietHoursCard';
import { EmailBackupCard } from './EmailBackupCard';
import { ActiveDevicesCard } from './ActiveDevicesCard';

export function NotificationsTab() {
  return (
    <div className="space-y-4" data-testid="notifications-tab">
      <PushPermissionCard />
      <NotificationCategoriesCard />
      <PreferencesSummaryLine />
      <QuietHoursCard />
      <EmailBackupCard />
      <ActiveDevicesCard />
    </div>
  );
}
