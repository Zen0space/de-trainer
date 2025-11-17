import * as SQLite from 'expo-sqlite';

// Local SQLite database for offline-first functionality
let db: SQLite.SQLiteDatabase | null = null;

// Initialize local database
export async function initializeLocalDatabase(): Promise<void> {
  try {
    // Open or create the database
    db = await SQLite.openDatabaseAsync('de-trainer-local.db');
    
    // Create tables with the same schema as Turso
    await createTables();
  } catch (error) {
    console.error('❌ Failed to initialize local database:', error);
    throw error;
  }
}

// Create all necessary tables
async function createTables(): Promise<void> {
  if (!db) throw new Error('Database not initialized');
  
  try {
    // Users table
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        full_name TEXT NOT NULL,
        role TEXT NOT NULL CHECK (role IN ('trainer', 'athlete')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        is_verified BOOLEAN DEFAULT FALSE,
        username TEXT UNIQUE,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        synced_at DATETIME,
        is_dirty BOOLEAN DEFAULT FALSE
      );
    `);

    // Trainers table
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS trainers (
        user_id INTEGER PRIMARY KEY,
        trainer_code TEXT NOT NULL UNIQUE,
        certification_id TEXT,
        specialization TEXT,
        verification_status TEXT DEFAULT 'pending' CHECK (verification_status IN ('pending', 'approved', 'rejected')),
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        synced_at DATETIME,
        is_dirty BOOLEAN DEFAULT FALSE,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      );
    `);

    // Athletes table
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS athletes (
        user_id INTEGER PRIMARY KEY,
        sport TEXT NOT NULL,
        level TEXT DEFAULT 'beginner' CHECK (level IN ('beginner', 'intermediate', 'advanced', 'elite')),
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        synced_at DATETIME,
        is_dirty BOOLEAN DEFAULT FALSE,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      );
    `);

    // Fitness components table
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS fitness_components (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        synced_at DATETIME,
        is_dirty BOOLEAN DEFAULT FALSE
      );
    `);

    // Tests table
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS tests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        component_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        unit TEXT,
        description TEXT,
        improvement_direction TEXT DEFAULT 'higher' CHECK (improvement_direction IN ('higher', 'lower')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        synced_at DATETIME,
        is_dirty BOOLEAN DEFAULT FALSE,
        FOREIGN KEY (component_id) REFERENCES fitness_components (id) ON DELETE CASCADE,
        UNIQUE(component_id, name)
      );
    `);

    // Enrollments table
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS enrollments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        athlete_id INTEGER NOT NULL,
        trainer_id INTEGER NOT NULL,
        status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
        requested_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        responded_at DATETIME,
        notes TEXT,
        viewed_at DATETIME,
        accepting_at DATETIME,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        synced_at DATETIME,
        is_dirty BOOLEAN DEFAULT FALSE,
        FOREIGN KEY (athlete_id) REFERENCES users (id) ON DELETE CASCADE,
        FOREIGN KEY (trainer_id) REFERENCES users (id) ON DELETE CASCADE,
        UNIQUE(athlete_id, trainer_id)
      );
    `);

    // Test results table
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS test_results (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        athlete_id INTEGER NOT NULL,
        test_id INTEGER NOT NULL,
        result_value REAL,
        result_text TEXT,
        notes TEXT,
        test_date DATE NOT NULL,
        input_unit TEXT,
        is_best_record BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        synced_at DATETIME,
        is_dirty BOOLEAN DEFAULT FALSE,
        FOREIGN KEY (athlete_id) REFERENCES users (id) ON DELETE CASCADE,
        FOREIGN KEY (test_id) REFERENCES tests (id) ON DELETE CASCADE
      );
    `);

    // Notifications table
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        data TEXT,
        is_read BOOLEAN DEFAULT FALSE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        read_at DATETIME,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        synced_at DATETIME,
        is_dirty BOOLEAN DEFAULT FALSE,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      );
    `);

    // Workout templates table (MVP - simplified)
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS workout_templates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        trainer_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        synced_at DATETIME,
        is_dirty BOOLEAN DEFAULT FALSE,
        FOREIGN KEY (trainer_id) REFERENCES users (id) ON DELETE CASCADE
      );
    `);

    // Exercises table (MVP - system exercises only)
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS exercises (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        muscle_group TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        synced_at DATETIME,
        is_dirty BOOLEAN DEFAULT FALSE
      );
    `);

    // Workout exercises table (MVP - simplified)
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS workout_exercises (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        workout_template_id INTEGER NOT NULL,
        exercise_id INTEGER NOT NULL,
        order_index INTEGER NOT NULL,
        sets INTEGER NOT NULL,
        reps INTEGER NOT NULL,
        rest_time INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        synced_at DATETIME,
        is_dirty BOOLEAN DEFAULT FALSE,
        FOREIGN KEY (workout_template_id) REFERENCES workout_templates (id) ON DELETE CASCADE,
        FOREIGN KEY (exercise_id) REFERENCES exercises (id) ON DELETE CASCADE
      );
    `);

    // Workout assignments table
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS workout_assignments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        workout_template_id INTEGER NOT NULL,
        athlete_id INTEGER NOT NULL,
        trainer_id INTEGER NOT NULL,
        scheduled_date DATE NOT NULL,
        status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'skipped', 'cancelled')),
        started_at DATETIME,
        completed_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        synced_at DATETIME,
        is_dirty BOOLEAN DEFAULT FALSE,
        FOREIGN KEY (workout_template_id) REFERENCES workout_templates (id) ON DELETE CASCADE,
        FOREIGN KEY (athlete_id) REFERENCES users (id) ON DELETE CASCADE,
        FOREIGN KEY (trainer_id) REFERENCES users (id) ON DELETE CASCADE
      );
    `);

    // Workout session progress table (MVP - simplified)
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS workout_session_progress (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        workout_assignment_id INTEGER NOT NULL,
        workout_exercise_id INTEGER NOT NULL,
        set_number INTEGER NOT NULL,
        completed BOOLEAN DEFAULT FALSE,
        completed_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        synced_at DATETIME,
        is_dirty BOOLEAN DEFAULT FALSE,
        FOREIGN KEY (workout_assignment_id) REFERENCES workout_assignments (id) ON DELETE CASCADE,
        FOREIGN KEY (workout_exercise_id) REFERENCES workout_exercises (id) ON DELETE CASCADE
      );
    `);

    // Indexes for workout tables
    await db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_workout_templates_trainer ON workout_templates (trainer_id);
      CREATE INDEX IF NOT EXISTS idx_exercises_muscle_group ON exercises (muscle_group);
      CREATE INDEX IF NOT EXISTS idx_workout_exercises_template ON workout_exercises (workout_template_id);
      CREATE INDEX IF NOT EXISTS idx_workout_exercises_order ON workout_exercises (workout_template_id, order_index);
      CREATE INDEX IF NOT EXISTS idx_workout_assignments_athlete ON workout_assignments (athlete_id);
      CREATE INDEX IF NOT EXISTS idx_workout_assignments_trainer ON workout_assignments (trainer_id);
      CREATE INDEX IF NOT EXISTS idx_workout_assignments_status ON workout_assignments (status);
      CREATE INDEX IF NOT EXISTS idx_workout_assignments_date ON workout_assignments (scheduled_date);
      CREATE INDEX IF NOT EXISTS idx_workout_session_progress_assignment ON workout_session_progress (workout_assignment_id);
    `);

    // Sync metadata table to track sync status
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS sync_metadata (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        last_sync_at DATETIME,
        sync_status TEXT DEFAULT 'idle' CHECK (sync_status IN ('idle', 'syncing', 'error')),
        last_error TEXT,
        total_synced INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Insert initial sync metadata if not exists
    await db.execAsync(`
      INSERT OR IGNORE INTO sync_metadata (id, last_sync_at, sync_status)
      VALUES (1, NULL, 'idle');
    `);

    // Seed exercises if table is empty
    await seedExercises();
  } catch (error) {
    console.error('❌ Error creating tables:', error);
    throw error;
  }
}

// Seed exercises table with common exercises
async function seedExercises(): Promise<void> {
  if (!db) throw new Error('Database not initialized');
  
  try {
    // Check if exercises already exist
    const existingExercises = await db.getFirstAsync('SELECT COUNT(*) as count FROM exercises');
    if (existingExercises && (existingExercises as any).count > 0) {
      console.log('✅ Exercises already seeded');
      return;
    }

    // Seed exercises covering major muscle groups
    const exercises = [
      // Chest exercises
      { name: 'Barbell Bench Press', muscle_group: 'chest' },
      { name: 'Dumbbell Bench Press', muscle_group: 'chest' },
      { name: 'Push-ups', muscle_group: 'chest' },
      { name: 'Incline Dumbbell Press', muscle_group: 'chest' },
      { name: 'Cable Chest Fly', muscle_group: 'chest' },
      
      // Back exercises
      { name: 'Pull-ups', muscle_group: 'back' },
      { name: 'Barbell Rows', muscle_group: 'back' },
      { name: 'Lat Pulldown', muscle_group: 'back' },
      { name: 'Dumbbell Rows', muscle_group: 'back' },
      { name: 'Deadlift', muscle_group: 'back' },
      
      // Legs exercises
      { name: 'Barbell Squat', muscle_group: 'legs' },
      { name: 'Leg Press', muscle_group: 'legs' },
      { name: 'Lunges', muscle_group: 'legs' },
      { name: 'Romanian Deadlift', muscle_group: 'legs' },
      { name: 'Leg Curl', muscle_group: 'legs' },
      { name: 'Calf Raises', muscle_group: 'legs' },
      
      // Shoulders exercises
      { name: 'Overhead Press', muscle_group: 'shoulders' },
      { name: 'Dumbbell Shoulder Press', muscle_group: 'shoulders' },
      { name: 'Lateral Raises', muscle_group: 'shoulders' },
      { name: 'Front Raises', muscle_group: 'shoulders' },
      { name: 'Face Pulls', muscle_group: 'shoulders' },
      
      // Arms exercises
      { name: 'Barbell Curl', muscle_group: 'arms' },
      { name: 'Dumbbell Curl', muscle_group: 'arms' },
      { name: 'Tricep Dips', muscle_group: 'arms' },
      { name: 'Tricep Pushdown', muscle_group: 'arms' },
      { name: 'Hammer Curls', muscle_group: 'arms' },
      
      // Core exercises
      { name: 'Plank', muscle_group: 'core' },
      { name: 'Crunches', muscle_group: 'core' },
      { name: 'Russian Twists', muscle_group: 'core' },
      { name: 'Leg Raises', muscle_group: 'core' },
      { name: 'Mountain Climbers', muscle_group: 'core' },
    ];

    // Insert exercises
    for (const exercise of exercises) {
      await db.runAsync(
        'INSERT INTO exercises (name, muscle_group) VALUES (?, ?)',
        [exercise.name, exercise.muscle_group]
      );
    }

    console.log(`✅ Seeded ${exercises.length} exercises`);
  } catch (error) {
    console.error('❌ Error seeding exercises:', error);
    throw error;
  }
}

// Get database instance
export function getLocalDatabase(): SQLite.SQLiteDatabase {
  if (!db) {
    throw new Error('Local database not initialized. Call initializeLocalDatabase() first.');
  }
  return db;
}

// Local database helper functions (similar to turso-database.ts)
export const localDbHelpers = {
  // Execute a query that returns a single row
  async get(sql: string, params: any[] = []): Promise<any> {
    const db = getLocalDatabase();
    try {
      const result = await db.getFirstAsync(sql, params);
      return result || null;
    } catch (error) {
      console.error('❌ Local DB get error:', error);
      throw error;
    }
  },

  // Execute a query that returns multiple rows
  async all(sql: string, params: any[] = []): Promise<any[]> {
    const db = getLocalDatabase();
    try {
      const result = await db.getAllAsync(sql, params);
      return result || [];
    } catch (error) {
      console.error('❌ Local DB all error:', error);
      throw error;
    }
  },

  // Execute a query that modifies data (INSERT, UPDATE, DELETE)
  async run(sql: string, params: any[] = []): Promise<{ lastInsertRowid: number; changes: number }> {
    const db = getLocalDatabase();
    try {
      const result = await db.runAsync(sql, params);
      return {
        lastInsertRowid: result.lastInsertRowId || 0,
        changes: result.changes || 0,
      };
    } catch (error) {
      console.error('❌ Local DB run error:', error);
      throw error;
    }
  },

  // Execute raw SQL
  async exec(sql: string): Promise<void> {
    const db = getLocalDatabase();
    try {
      await db.execAsync(sql);
    } catch (error) {
      console.error('❌ Local DB exec error:', error);
      throw error;
    }
  },

  // Mark a record as dirty (needs sync)
  async markDirty(table: string, primaryKey: string, primaryKeyValue: any): Promise<void> {
    const db = getLocalDatabase();
    try {
      await db.runAsync(
        `UPDATE ${table} SET is_dirty = TRUE, updated_at = datetime('now') WHERE ${primaryKey} = ?`,
        [primaryKeyValue]
      );
    } catch (error) {
      console.error('❌ Error marking record as dirty:', error);
      throw error;
    }
  },

  // Get all dirty records from a table
  async getDirtyRecords(table: string): Promise<any[]> {
    const db = getLocalDatabase();
    try {
      const result = await db.getAllAsync(
        `SELECT * FROM ${table} WHERE is_dirty = TRUE`
      );
      return result || [];
    } catch (error) {
      console.error('❌ Error getting dirty records:', error);
      throw error;
    }
  },

  // Mark a record as synced
  async markSynced(table: string, primaryKey: string, primaryKeyValue: any): Promise<void> {
    const db = getLocalDatabase();
    try {
      await db.runAsync(
        `UPDATE ${table} SET is_dirty = FALSE, synced_at = datetime('now') WHERE ${primaryKey} = ?`,
        [primaryKeyValue]
      );
    } catch (error) {
      console.error('❌ Error marking record as synced:', error);
      throw error;
    }
  },
};

// Get sync metadata
export async function getSyncMetadata(): Promise<any> {
  const db = getLocalDatabase();
  try {
    const result = await db.getFirstAsync('SELECT * FROM sync_metadata WHERE id = 1');
    return result;
  } catch (error) {
    console.error('❌ Error getting sync metadata:', error);
    throw error;
  }
}

// Update sync metadata
export async function updateSyncMetadata(data: {
  last_sync_at?: string;
  sync_status?: 'idle' | 'syncing' | 'error';
  last_error?: string | null;
  total_synced?: number;
}): Promise<void> {
  const db = getLocalDatabase();
  try {
    const updates: string[] = [];
    const params: any[] = [];

    if (data.last_sync_at !== undefined) {
      updates.push('last_sync_at = ?');
      params.push(data.last_sync_at);
    }
    if (data.sync_status !== undefined) {
      updates.push('sync_status = ?');
      params.push(data.sync_status);
    }
    if (data.last_error !== undefined) {
      updates.push('last_error = ?');
      params.push(data.last_error);
    }
    if (data.total_synced !== undefined) {
      updates.push('total_synced = ?');
      params.push(data.total_synced);
    }

    updates.push('updated_at = datetime(\'now\')');

    const sql = `UPDATE sync_metadata SET ${updates.join(', ')} WHERE id = 1`;
    await db.runAsync(sql, params);
  } catch (error) {
    console.error('❌ Error updating sync metadata:', error);
    throw error;
  }
}

// Clear all local data (for testing or reset)
export async function clearLocalDatabase(): Promise<void> {
  const db = getLocalDatabase();
  try {
    // Delete all data from tables (order matters due to foreign keys)
    await db.execAsync(`
      DELETE FROM workout_session_progress;
      DELETE FROM workout_assignments;
      DELETE FROM workout_exercises;
      DELETE FROM workout_templates;
      DELETE FROM notifications;
      DELETE FROM test_results;
      DELETE FROM enrollments;
      DELETE FROM tests;
      DELETE FROM fitness_components;
      DELETE FROM athletes;
      DELETE FROM trainers;
      DELETE FROM users;
      UPDATE sync_metadata SET last_sync_at = NULL, sync_status = 'idle', last_error = NULL, total_synced = 0;
    `);
    
    // Note: We don't delete exercises as they are system data that should persist
  } catch (error) {
    console.error('❌ Error clearing local database:', error);
    throw error;
  }
}
