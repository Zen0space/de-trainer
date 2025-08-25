import { dbHelpers, initializeDatabase } from './database';
import { registerUser, loginUser } from './api';
import { RegisterAthleteData, RegisterTrainerData } from '../types/auth';

// Test database functionality
export async function testDatabaseSetup() {
  try {
    console.log('🧪 Testing database setup...');
    
    // Initialize database
    await initializeDatabase();
    console.log('✅ Database initialized');
    
    // Test basic query
    const result = await dbHelpers.get('SELECT 1 as test');
    console.log('✅ Basic query test:', result);
    
    // Check tables exist
    const tables = await dbHelpers.all(`
      SELECT name FROM sqlite_master 
      WHERE type='table' 
      ORDER BY name
    `);
    console.log('✅ Tables found:', tables.map(t => t.name));
    
    return { success: true, message: 'Database setup successful' };
    
  } catch (error) {
    console.error('❌ Database setup failed:', error);
    return { success: false, error: error.message };
  }
}

// Test authentication flow
export async function testAuthenticationFlow() {
  try {
    console.log('🧪 Testing authentication flow...');
    
    // Test data
    const testAthlete: RegisterAthleteData = {
      email: 'test.athlete@example.com',
      password: 'testpassword123',
      full_name: 'Test Athlete',
      role: 'athlete',
      sport: 'Running',
      level: 'intermediate'
    };
    
    const testTrainer: RegisterTrainerData = {
      email: 'test.trainer@example.com',
      password: 'testpassword456',
      full_name: 'Test Trainer',
      role: 'trainer',
      trainer_code: 'TR001',
      certification_id: 'CERT123',
      specialization: 'Strength Training'
    };
    
    // Test athlete registration
    console.log('📝 Testing athlete registration...');
    const athleteResult = await registerUser(testAthlete);
    if (athleteResult.success) {
      console.log('✅ Athlete registration successful:', athleteResult.user?.full_name);
    } else {
      console.log('❌ Athlete registration failed:', athleteResult.error);
    }
    
    // Test trainer registration
    console.log('📝 Testing trainer registration...');
    const trainerResult = await registerUser(testTrainer);
    if (trainerResult.success) {
      console.log('✅ Trainer registration successful:', trainerResult.user?.full_name);
    } else {
      console.log('❌ Trainer registration failed:', trainerResult.error);
    }
    
    // Test athlete login
    console.log('🔐 Testing athlete login...');
    const athleteLogin = await loginUser({
      email: testAthlete.email,
      password: testAthlete.password
    });
    if (athleteLogin.success) {
      console.log('✅ Athlete login successful:', athleteLogin.user?.full_name);
    } else {
      console.log('❌ Athlete login failed:', athleteLogin.error);
    }
    
    // Test trainer login
    console.log('🔐 Testing trainer login...');
    const trainerLogin = await loginUser({
      email: testTrainer.email,
      password: testTrainer.password
    });
    if (trainerLogin.success) {
      console.log('✅ Trainer login successful:', trainerLogin.user?.full_name);
    } else {
      console.log('❌ Trainer login failed:', trainerLogin.error);
    }
    
    return { 
      success: true, 
      results: {
        athleteRegistration: athleteResult.success,
        trainerRegistration: trainerResult.success,
        athleteLogin: athleteLogin.success,
        trainerLogin: trainerLogin.success
      }
    };
    
  } catch (error) {
    console.error('❌ Authentication test failed:', error);
    return { success: false, error: error.message };
  }
}

// Get current database stats
export async function getDatabaseStats() {
  try {
    const userCount = await dbHelpers.get('SELECT COUNT(*) as count FROM users');
    const trainerCount = await dbHelpers.get('SELECT COUNT(*) as count FROM trainers');
    const athleteCount = await dbHelpers.get('SELECT COUNT(*) as count FROM athletes');
    
    return {
      users: userCount?.count || 0,
      trainers: trainerCount?.count || 0,
      athletes: athleteCount?.count || 0
    };
  } catch (error) {
    console.error('Error getting database stats:', error);
    return { users: 0, trainers: 0, athletes: 0 };
  }
}
