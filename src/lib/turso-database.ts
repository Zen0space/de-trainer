// Turso database configuration
const TURSO_DATABASE_URL = process.env.EXPO_PUBLIC_TURSO_DATABASE_URL;
const TURSO_AUTH_TOKEN = process.env.EXPO_PUBLIC_TURSO_AUTH_TOKEN;

if (!TURSO_DATABASE_URL || !TURSO_AUTH_TOKEN) {
  throw new Error('Missing Turso environment variables. Please check EXPO_PUBLIC_TURSO_DATABASE_URL and EXPO_PUBLIC_TURSO_AUTH_TOKEN');
}

// Convert libsql:// URL to HTTP API endpoint
const getHttpApiUrl = (libsqlUrl: string): string => {
  // Convert libsql://database-name-org.turso.io to https://database-name-org.turso.io/v2/pipeline
  const httpUrl = libsqlUrl.replace('libsql://', 'https://') + '/v2/pipeline';
  return httpUrl;
};

const HTTP_API_URL = getHttpApiUrl(TURSO_DATABASE_URL);

// Execute SQL using Turso HTTP API
async function executeSql(sql: string, params: any[] = []): Promise<any> {
  const response = await fetch(HTTP_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${TURSO_AUTH_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      requests: [
        {
          type: 'execute',
          stmt: {
            sql,
            args: params.map(param => ({ type: 'text', value: String(param) })),
          },
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`Turso API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  
  if (data.results?.[0]?.error) {
    throw new Error(`SQL error: ${data.results[0].error.message}`);
  }

  return data.results?.[0]?.response?.result || { rows: [], cols: [], rows_affected: 0, last_insert_rowid: null };
}

// Database helper functions that match the existing SQLite interface
export const tursoDbHelpers = {
  // Execute a query that returns data (SELECT)
  async get(sql: string, params: any[] = []): Promise<any> {
    try {
      const result = await executeSql(sql, params);
      
      // Return the first row or null if no results
      if (result.rows && result.rows.length > 0) {
        const row = result.rows[0];
        // Convert array format to object format
        const columns = result.cols || [];
        const rowObject: any = {};
        columns.forEach((col: any, index: number) => {
          rowObject[col.name] = row[index]?.value;
        });
        return rowObject;
      }
      return null;
    } catch (error) {
      console.error('Turso get error:', error);
      throw error;
    }
  },

  // Execute a query that returns multiple rows (SELECT)
  async all(sql: string, params: any[] = []): Promise<any[]> {
    try {
      const result = await executeSql(sql, params);
      
      if (result.rows) {
        const columns = result.cols || [];
        return result.rows.map((row: any[]) => {
          const rowObject: any = {};
          columns.forEach((col: any, index: number) => {
            rowObject[col.name] = row[index]?.value;
          });
          return rowObject;
        });
      }
      
      return [];
    } catch (error) {
      console.error('Turso all error:', error);
      throw error;
    }
  },

  // Execute a query that modifies data (INSERT, UPDATE, DELETE)
  async run(sql: string, params: any[] = []): Promise<{ lastInsertRowid: number; changes: number }> {
    try {
      const result = await executeSql(sql, params);
      
      return {
        lastInsertRowid: Number(result.last_insert_rowid) || 0,
        changes: Number(result.affected_row_count) || 0,
      };
    } catch (error) {
      console.error('Turso run error:', error);
      throw error;
    }
  },

  // Execute multiple statements in a transaction
  async transaction(statements: Array<{ sql: string; params?: any[] }>): Promise<any[]> {
    try {
      const requests = statements.map(stmt => ({
        type: 'execute',
        stmt: {
          sql: stmt.sql,
          args: (stmt.params || []).map(param => ({ type: 'text', value: String(param) })),
        },
      }));

      const response = await fetch(HTTP_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${TURSO_AUTH_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requests,
        }),
      });

      if (!response.ok) {
        throw new Error(`Turso API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data.results || [];
    } catch (error) {
      console.error('Turso transaction error:', error);
      throw error;
    }
  },

  // Execute raw SQL (for schema operations, etc.)
  async exec(sql: string): Promise<void> {
    try {
      await executeSql(sql);
    } catch (error) {
      console.error('Turso exec error:', error);
      throw error;
    }
  },
};

// Test connection function
export async function testTursoConnection(): Promise<boolean> {
  try {
    const result = await executeSql('SELECT 1 as test');
    console.log('✅ Turso connection successful:', result);
    return true;
  } catch (error) {
    console.error('❌ Turso connection failed:', error);
    return false;
  }
}

// Initialize and test connection
export async function initializeTursoConnection(): Promise<void> {
  console.log('🔗 Connecting to Turso database...');
  console.log('Database URL:', TURSO_DATABASE_URL?.substring(0, 50) + '...');
  console.log('HTTP API URL:', HTTP_API_URL);
  
  const isConnected = await testTursoConnection();
  
  if (!isConnected) {
    throw new Error('Failed to connect to Turso database');
  }
  
  console.log('✅ Turso database connection established');
}
