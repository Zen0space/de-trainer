import * as SQLite from 'expo-sqlite';

// Database configuration
const DATABASE_NAME = 'de_trainer.db';
const DATABASE_VERSION = 1;

// Initialize database connection
export const db = SQLite.openDatabaseSync(DATABASE_NAME);

// Initialize database schema
export async function initializeDatabase() {
  try {
    console.log('Initializing database schema...');
    
    // Enable foreign keys
    await db.execAsync('PRAGMA foreign_keys = ON');
    
    // Create users table
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        full_name TEXT NOT NULL,
        role TEXT NOT NULL CHECK (role IN ('trainer', 'athlete')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        is_verified BOOLEAN DEFAULT FALSE
      )
    `);

    // Create trainers table
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS trainers (
        user_id INTEGER PRIMARY KEY,
        trainer_code TEXT NOT NULL,
        certification_id TEXT,
        specialization TEXT,
        verification_status TEXT DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected')),
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      )
    `);

    // Create athletes table
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS athletes (
        user_id INTEGER PRIMARY KEY,
        sport TEXT NOT NULL,
        level TEXT DEFAULT 'beginner' CHECK (level IN ('beginner', 'intermediate', 'advanced', 'professional')),
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      )
    `);

    // Create enrollments table (for trainer-athlete relationships)
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS enrollments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        athlete_id INTEGER NOT NULL,
        trainer_id INTEGER NOT NULL,
        status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
        requested_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        responded_at DATETIME,
        FOREIGN KEY (athlete_id) REFERENCES users (id) ON DELETE CASCADE,
        FOREIGN KEY (trainer_id) REFERENCES users (id) ON DELETE CASCADE,
        UNIQUE (athlete_id, trainer_id)
      )
    `);

    console.log('Database schema initialized successfully');
    return { success: true };
    
  } catch (error) {
    console.error('Database initialization error:', error);
    throw error;
  }
}

// Database helper functions
export const dbHelpers = {
  // Execute a query and return results
  async execute(query: string, params: any[] = []) {
    try {
      const statement = await db.prepareAsync(query);
      const result = await statement.executeAsync(params);
      await statement.finalizeAsync();
      return result;
    } catch (error) {
      console.error('Database execute error:', error);
      throw error;
    }
  },

  // Execute a query and return the first row
  async get(query: string, params: any[] = []) {
    try {
      const statement = await db.prepareAsync(query);
      const result = await statement.executeAsync(params);
      const firstRow = await result.getFirstAsync();
      await statement.finalizeAsync();
      return firstRow;
    } catch (error) {
      console.error('Database get error:', error);
      throw error;
    }
  },

  // Execute a query and return all rows
  async all(query: string, params: any[] = []) {
    try {
      const statement = await db.prepareAsync(query);
      const result = await statement.executeAsync(params);
      const allRows = await result.getAllAsync();
      await statement.finalizeAsync();
      return allRows;
    } catch (error) {
      console.error('Database all error:', error);
      throw error;
    }
  },

  // Execute a query and return execution info
  async run(query: string, params: any[] = []) {
    try {
      const statement = await db.prepareAsync(query);
      const result = await statement.executeAsync(params);
      const changes = result.changes;
      const lastInsertRowId = result.lastInsertRowId;
      await statement.finalizeAsync();
      
      return {
        changes,
        lastInsertRowId
      };
    } catch (error) {
      console.error('Database run error:', error);
      throw error;
    }
  }
};

// Initialize database on import
initializeDatabase().catch(console.error);

export default dbHelpers;
