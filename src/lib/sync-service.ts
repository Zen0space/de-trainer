import { localDbHelpers, getSyncMetadata, updateSyncMetadata } from './local-database';
import { tursoDbHelpers } from './turso-database';

// Sync status type
export type SyncStatus = 'idle' | 'syncing' | 'error' | 'success';

// Sync result interface
export interface SyncResult {
  success: boolean;
  message: string;
  pushedCount: number;
  pulledCount: number;
  errors: string[];
}

// Tables to sync (in order of dependencies)
const SYNC_TABLES = [
  'users',
  'trainers',
  'athletes',
  'fitness_components',
  'tests',
  'enrollments',
  'test_results',
  'notifications',
];

// Primary key mapping for each table
const TABLE_PRIMARY_KEYS: Record<string, string> = {
  'users': 'id',
  'trainers': 'user_id',
  'athletes': 'user_id',
  'fitness_components': 'id',
  'tests': 'id',
  'enrollments': 'id',
  'test_results': 'id',
  'notifications': 'id',
};

// Get primary key for a table
function getPrimaryKey(table: string): string {
  return TABLE_PRIMARY_KEYS[table] || 'id';
}

// Sync service for bidirectional data synchronization
export class SyncService {
  private isSyncing = false;
  private currentUserId: number | null = null;
  private currentUserRole: 'trainer' | 'athlete' | null = null;

  // Set current user context for scoped sync
  setUserContext(userId: number, userRole: 'trainer' | 'athlete'): void {
    this.currentUserId = userId;
    this.currentUserRole = userRole;
  }

  // Clear user context
  clearUserContext(): void {
    this.currentUserId = null;
    this.currentUserRole = null;
  }

  // Main sync function - performs bidirectional sync (user-scoped)
  async sync(userId?: number, userRole?: 'trainer' | 'athlete'): Promise<SyncResult> {
    if (this.isSyncing) {
      return {
        success: false,
        message: 'Sync already in progress',
        pushedCount: 0,
        pulledCount: 0,
        errors: ['Sync already in progress'],
      };
    }

    // Use provided userId/role or fall back to context
    const syncUserId = userId || this.currentUserId;
    const syncUserRole = userRole || this.currentUserRole;

    if (!syncUserId || !syncUserRole) {
      return {
        success: false,
        message: 'User context required for sync. Please log in.',
        pushedCount: 0,
        pulledCount: 0,
        errors: ['No user context available'],
      };
    }

    this.isSyncing = true;
    const errors: string[] = [];
    let pushedCount = 0;
    let pulledCount = 0;

    try {
      // Update sync status to syncing
      await updateSyncMetadata({
        sync_status: 'syncing',
        last_error: null,
      });

      // Step 1: Push local changes to Turso (user-scoped)
      const pushResult = await this.pushLocalChanges(syncUserId, syncUserRole);
      pushedCount = pushResult.count;
      errors.push(...pushResult.errors);

      // Step 2: Pull remote changes from Turso (user-scoped)
      const pullResult = await this.pullRemoteChanges(syncUserId, syncUserRole);
      pulledCount = pullResult.count;
      errors.push(...pullResult.errors);

      // Update sync metadata
      const now = new Date().toISOString();
      await updateSyncMetadata({
        last_sync_at: now,
        sync_status: errors.length > 0 ? 'error' : 'idle',
        last_error: errors.length > 0 ? errors.join('; ') : null,
        total_synced: pushedCount + pulledCount,
      });

      const success = errors.length === 0;
      const message = success
        ? `Sync completed successfully. Pushed ${pushedCount}, pulled ${pulledCount} records.`
        : `Sync completed with errors. Pushed ${pushedCount}, pulled ${pulledCount} records.`;

      return {
        success,
        message,
        pushedCount,
        pulledCount,
        errors,
      };
    } catch (error) {
      console.error('❌ Sync failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      await updateSyncMetadata({
        sync_status: 'error',
        last_error: errorMessage,
      });

      return {
        success: false,
        message: `Sync failed: ${errorMessage}`,
        pushedCount,
        pulledCount,
        errors: [errorMessage, ...errors],
      };
    } finally {
      this.isSyncing = false;
    }
  }

  // Push local changes to Turso (user-scoped)
  private async pushLocalChanges(userId: number, userRole: 'trainer' | 'athlete'): Promise<{ count: number; errors: string[] }> {
    let count = 0;
    const errors: string[] = [];

    try {
      // For each table, get dirty records and push to Turso (filtered by user)
      for (const table of SYNC_TABLES) {
        try {
          // Get user-scoped dirty records
          const dirtyRecords = await this.getUserScopedDirtyRecords(table, userId, userRole);
          
          if (dirtyRecords.length === 0) {
            continue;
          }

          for (const record of dirtyRecords) {
            try {
              const primaryKey = getPrimaryKey(table);
              const primaryKeyValue = record[primaryKey];
              
              await this.pushRecord(table, record);
              await localDbHelpers.markSynced(table, primaryKey, primaryKeyValue);
              count++;
            } catch (error) {
              const primaryKey = getPrimaryKey(table);
              const primaryKeyValue = record[primaryKey];
              const errorMsg = `Failed to push ${table} record ${primaryKeyValue}: ${error}`;
              console.error(`  ❌ ${errorMsg}`);
              errors.push(errorMsg);
            }
          }
        } catch (error) {
          const errorMsg = `Failed to process ${table}: ${error}`;
          console.error(`  ❌ ${errorMsg}`);
          errors.push(errorMsg);
        }
      }
    } catch (error) {
      const errorMsg = `Push failed: ${error}`;
      console.error(`❌ ${errorMsg}`);
      errors.push(errorMsg);
    }

    return { count, errors };
  }

  // Push a single record to Turso
  private async pushRecord(table: string, record: any): Promise<void> {
    // Remove sync-related fields
    const { is_dirty, synced_at, updated_at, ...data } = record;
    
    // Get the primary key for this table
    const primaryKey = getPrimaryKey(table);
    const primaryKeyValue = record[primaryKey];

    // Check if record exists in Turso
    const existingRecord = await tursoDbHelpers.get(
      `SELECT ${primaryKey} FROM ${table} WHERE ${primaryKey} = ?`,
      [primaryKeyValue]
    );

    if (existingRecord) {
      // Update existing record
      const fields = Object.keys(data).filter(key => key !== primaryKey);
      const setClause = fields.map(field => `${field} = ?`).join(', ');
      const values = fields.map(field => data[field]);
      
      await tursoDbHelpers.run(
        `UPDATE ${table} SET ${setClause} WHERE ${primaryKey} = ?`,
        [...values, primaryKeyValue]
      );
    } else {
      // Insert new record
      const fields = Object.keys(data);
      const placeholders = fields.map(() => '?').join(', ');
      const values = fields.map(field => data[field]);
      
      await tursoDbHelpers.run(
        `INSERT INTO ${table} (${fields.join(', ')}) VALUES (${placeholders})`,
        values
      );
    }
  }

  // Pull remote changes from Turso (user-scoped)
  private async pullRemoteChanges(userId: number, userRole: 'trainer' | 'athlete'): Promise<{ count: number; errors: string[] }> {
    let count = 0;
    const errors: string[] = [];

    try {
      // For each table, pull user-scoped records
      for (const table of SYNC_TABLES) {
        try {
          // Get user-scoped records from Turso
          const remoteRecords = await this.getUserScopedRemoteRecords(table, userId, userRole);

          if (remoteRecords.length === 0) {
            continue;
          }

          for (const record of remoteRecords) {
            try {
              await this.pullRecord(table, record);
              count++;
            } catch (error) {
              const primaryKey = getPrimaryKey(table);
              const primaryKeyValue = record[primaryKey];
              const errorMsg = `Failed to pull ${table} record ${primaryKeyValue}: ${error}`;
              console.error(`  ❌ ${errorMsg}`);
              errors.push(errorMsg);
            }
          }
        } catch (error) {
          const errorMsg = `Failed to process ${table}: ${error}`;
          console.error(`  ❌ ${errorMsg}`);
          errors.push(errorMsg);
        }
      }
    } catch (error) {
      const errorMsg = `Pull failed: ${error}`;
      console.error(`❌ ${errorMsg}`);
      errors.push(errorMsg);
    }

    return { count, errors };
  }

  // Pull a single record from Turso to local
  private async pullRecord(table: string, record: any): Promise<void> {
    // Get the primary key for this table
    const primaryKey = getPrimaryKey(table);
    const primaryKeyValue = record[primaryKey];
    
    // Check if record exists locally
    const existingRecord = await localDbHelpers.get(
      `SELECT ${primaryKey}, updated_at FROM ${table} WHERE ${primaryKey} = ?`,
      [primaryKeyValue]
    );

    // Add sync metadata
    const now = new Date().toISOString();
    const dataWithSync = {
      ...record,
      updated_at: now,
      synced_at: now,
      is_dirty: false,
    };

    if (existingRecord) {
      // Conflict resolution: last-write-wins
      // If local record is dirty, keep local changes (don't overwrite)
      const localIsDirty = await localDbHelpers.get(
        `SELECT is_dirty FROM ${table} WHERE ${primaryKey} = ?`,
        [primaryKeyValue]
      );

      if (localIsDirty?.is_dirty) {
        return;
      }

      // Update existing record
      const fields = Object.keys(dataWithSync).filter(key => key !== primaryKey);
      const setClause = fields.map(field => `${field} = ?`).join(', ');
      const values = fields.map(field => dataWithSync[field]);
      
      await localDbHelpers.run(
        `UPDATE ${table} SET ${setClause} WHERE ${primaryKey} = ?`,
        [...values, primaryKeyValue]
      );
    } else {
      // Insert new record
      const fields = Object.keys(dataWithSync);
      const placeholders = fields.map(() => '?').join(', ');
      const values = fields.map(field => dataWithSync[field]);
      
      await localDbHelpers.run(
        `INSERT INTO ${table} (${fields.join(', ')}) VALUES (${placeholders})`,
        values
      );
    }
  }

  // Get sync status
  async getSyncStatus(): Promise<{
    status: SyncStatus;
    lastSyncAt: string | null;
    lastError: string | null;
    totalSynced: number;
  }> {
    try {
      const metadata = await getSyncMetadata();
      return {
        status: metadata?.sync_status || 'idle',
        lastSyncAt: metadata?.last_sync_at || null,
        lastError: metadata?.last_error || null,
        totalSynced: metadata?.total_synced || 0,
      };
    } catch (error) {
      console.error('❌ Error getting sync status:', error);
      return {
        status: 'error',
        lastSyncAt: null,
        lastError: error instanceof Error ? error.message : 'Unknown error',
        totalSynced: 0,
      };
    }
  }

  // Check if sync is in progress
  isSyncInProgress(): boolean {
    return this.isSyncing;
  }

  // Get user-scoped dirty records from local database
  private async getUserScopedDirtyRecords(table: string, userId: number, userRole: 'trainer' | 'athlete'): Promise<any[]> {
    try {
      let query = '';
      let params: any[] = [];

      switch (table) {
        case 'users':
          // Only sync current user's record
          query = `SELECT * FROM ${table} WHERE id = ? AND is_dirty = TRUE`;
          params = [userId];
          break;

        case 'trainers':
          // Only if user is a trainer
          if (userRole === 'trainer') {
            query = `SELECT * FROM ${table} WHERE user_id = ? AND is_dirty = TRUE`;
            params = [userId];
          } else {
            return [];
          }
          break;

        case 'athletes':
          // Only if user is an athlete
          if (userRole === 'athlete') {
            query = `SELECT * FROM ${table} WHERE user_id = ? AND is_dirty = TRUE`;
            params = [userId];
          } else {
            return [];
          }
          break;

        case 'enrollments':
          // Trainer: their enrollments, Athlete: their enrollments
          if (userRole === 'trainer') {
            query = `SELECT * FROM ${table} WHERE trainer_id = ? AND is_dirty = TRUE`;
            params = [userId];
          } else {
            query = `SELECT * FROM ${table} WHERE athlete_id = ? AND is_dirty = TRUE`;
            params = [userId];
          }
          break;

        case 'test_results':
          // Trainer: their athletes' results, Athlete: their own results
          if (userRole === 'trainer') {
            query = `
              SELECT tr.* FROM ${table} tr
              JOIN enrollments e ON tr.athlete_id = e.athlete_id
              WHERE e.trainer_id = ? AND e.status = 'approved' AND tr.is_dirty = TRUE
            `;
            params = [userId];
          } else {
            query = `SELECT * FROM ${table} WHERE athlete_id = ? AND is_dirty = TRUE`;
            params = [userId];
          }
          break;

        case 'notifications':
          // Only user's own notifications
          query = `SELECT * FROM ${table} WHERE user_id = ? AND is_dirty = TRUE`;
          params = [userId];
          break;

        case 'fitness_components':
        case 'tests':
          // These are shared data - sync all dirty records
          query = `SELECT * FROM ${table} WHERE is_dirty = TRUE`;
          params = [];
          break;

        default:
          return [];
      }

      return await localDbHelpers.all(query, params);
    } catch (error) {
      console.error(`❌ Error getting user-scoped dirty records for ${table}:`, error);
      return [];
    }
  }

  // Get user-scoped records from Turso
  private async getUserScopedRemoteRecords(table: string, userId: number, userRole: 'trainer' | 'athlete'): Promise<any[]> {
    try {
      let query = '';
      let params: any[] = [];

      switch (table) {
        case 'users':
          // Only sync current user's record
          query = `SELECT * FROM ${table} WHERE id = ?`;
          params = [userId];
          break;

        case 'trainers':
          // Only if user is a trainer
          if (userRole === 'trainer') {
            query = `SELECT * FROM ${table} WHERE user_id = ?`;
            params = [userId];
          } else {
            return [];
          }
          break;

        case 'athletes':
          // Only if user is an athlete
          if (userRole === 'athlete') {
            query = `SELECT * FROM ${table} WHERE user_id = ?`;
            params = [userId];
          } else {
            return [];
          }
          break;

        case 'enrollments':
          // Trainer: their enrollments, Athlete: their enrollments
          if (userRole === 'trainer') {
            query = `SELECT * FROM ${table} WHERE trainer_id = ?`;
            params = [userId];
          } else {
            query = `SELECT * FROM ${table} WHERE athlete_id = ?`;
            params = [userId];
          }
          break;

        case 'test_results':
          // Trainer: their athletes' results, Athlete: their own results
          if (userRole === 'trainer') {
            query = `
              SELECT tr.* FROM ${table} tr
              JOIN enrollments e ON tr.athlete_id = e.athlete_id
              WHERE e.trainer_id = ? AND e.status = 'approved'
            `;
            params = [userId];
          } else {
            query = `SELECT * FROM ${table} WHERE athlete_id = ?`;
            params = [userId];
          }
          break;

        case 'notifications':
          // Only user's own notifications
          query = `SELECT * FROM ${table} WHERE user_id = ?`;
          params = [userId];
          break;

        case 'fitness_components':
        case 'tests':
          // These are shared data - sync all records
          query = `SELECT * FROM ${table}`;
          params = [];
          break;

        default:
          return [];
      }

      return await tursoDbHelpers.all(query, params);
    } catch (error) {
      console.error(`❌ Error getting user-scoped remote records for ${table}:`, error);
      return [];
    }
  }
}

// Export singleton instance
export const syncService = new SyncService();
