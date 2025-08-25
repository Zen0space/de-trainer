import bcrypt from 'bcryptjs';
import { 
  LoginCredentials, 
  RegisterTrainerData, 
  RegisterAthleteData, 
  AuthResponse, 
  AuthUser,
  UserRow,
  TrainerRow,
  AthleteRow
} from '../types/auth';
import { tursoDbHelpers as dbHelpers } from './turso-database';

// Hash password using bcrypt (optimized for mobile performance)
async function hashPassword(password: string): Promise<string> {
  const saltRounds = 8; // Reduced from 12 for mobile performance (8 = ~40ms vs 12 = ~1000ms)
  return bcrypt.hash(password, saltRounds);
}

// Verify password using bcrypt
async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

// Convert database row to AuthUser
function convertToAuthUser(userRow: any, trainerRow?: any, athleteRow?: any): AuthUser {
  const baseUser: AuthUser = {
    id: userRow.id,
    email: userRow.email,
    full_name: userRow.full_name,
    role: userRow.role as 'trainer' | 'athlete',
    created_at: userRow.created_at,
    is_verified: Boolean(userRow.is_verified)
  };

  if (userRow.role === 'trainer' && trainerRow) {
    baseUser.trainer_data = {
      trainer_code: trainerRow.trainer_code,
      certification_id: trainerRow.certification_id || undefined,
      specialization: trainerRow.specialization || undefined,
      verification_status: trainerRow.verification_status as 'pending' | 'verified' | 'rejected'
    };
  }

  if (userRow.role === 'athlete' && athleteRow) {
    baseUser.athlete_data = {
      sport: athleteRow.sport,
      level: athleteRow.level || 'beginner'
    };
  }

  return baseUser;
}

export async function loginUser(credentials: LoginCredentials): Promise<AuthResponse> {
  try {
    console.log('🔐 Login attempt for:', credentials.email);
    
    // Find user by email
    const userRow = await dbHelpers.get(
      'SELECT * FROM users WHERE email = ?',
      [credentials.email]
    );

    console.log('📋 User found:', userRow);

    if (!userRow) {
      console.log('❌ No user found');
      return { success: false, error: 'Invalid email or password' };
    }

    // Verify password
    const hashedPassword = (userRow as any).password as string;
    console.log('🔑 Hash from DB:', hashedPassword.substring(0, 15) + '...');
    console.log('🔑 Input password:', credentials.password);
    
    const isValidPassword = await verifyPassword(credentials.password, hashedPassword);
    console.log('✅ Password valid:', isValidPassword);
    
    if (!isValidPassword) {
      return { success: false, error: 'Invalid email or password' };
    }

    // Get role-specific data
    let trainerRow = null;
    let athleteRow = null;

    if ((userRow as any).role === 'trainer') {
      trainerRow = await dbHelpers.get(
        'SELECT * FROM trainers WHERE user_id = ?',
        [(userRow as any).id]
      );
    } else if ((userRow as any).role === 'athlete') {
      athleteRow = await dbHelpers.get(
        'SELECT * FROM athletes WHERE user_id = ?',
        [(userRow as any).id]
      );
    }

    const user = convertToAuthUser(userRow, trainerRow, athleteRow);

    return {
      success: true,
      user,
      message: 'Login successful'
    };

  } catch (error) {
    console.error('Login error:', error);
    return { 
      success: false, 
      error: 'An error occurred during login. Please try again.' 
    };
  }
}

export async function registerUser(userData: RegisterTrainerData | RegisterAthleteData): Promise<AuthResponse> {
  try {
    // Check if user already exists
    const existingUser = await dbHelpers.get(
      'SELECT id FROM users WHERE email = ?',
      [userData.email]
    );

    if (existingUser) {
      return { success: false, error: 'An account with this email already exists' };
    }

    // Hash password
    const hashedPassword = await hashPassword(userData.password);

    // Insert user
    const userResult = await dbHelpers.run(
      'INSERT INTO users (email, password, full_name, role) VALUES (?, ?, ?, ?)',
      [userData.email, hashedPassword, userData.full_name, userData.role]
    );

    const userId = Number(userResult.lastInsertRowid);

    // Insert role-specific data
    if (userData.role === 'trainer') {
      const trainerData = userData as RegisterTrainerData;
      await dbHelpers.run(
        'INSERT INTO trainers (user_id, trainer_code, certification_id, specialization) VALUES (?, ?, ?, ?)',
        [
          userId,
          trainerData.trainer_code,
          trainerData.certification_id || null,
          trainerData.specialization || null
        ]
      );
    } else if (userData.role === 'athlete') {
      const athleteData = userData as RegisterAthleteData;
      await dbHelpers.run(
        'INSERT INTO athletes (user_id, sport, level) VALUES (?, ?, ?)',
        [userId, athleteData.sport, athleteData.level]
      );
    }

    // Get the created user with role data
    const newUserRow = await dbHelpers.get(
      'SELECT * FROM users WHERE id = ?',
      [userId]
    );

    let trainerRow = null;
    let athleteRow = null;

    if (userData.role === 'trainer') {
      trainerRow = await dbHelpers.get(
        'SELECT * FROM trainers WHERE user_id = ?',
        [userId]
      );
    } else if (userData.role === 'athlete') {
      athleteRow = await dbHelpers.get(
        'SELECT * FROM athletes WHERE user_id = ?',
        [userId]
      );
    }

    const user = convertToAuthUser(newUserRow, trainerRow, athleteRow);

    return {
      success: true,
      user,
      message: 'Account created successfully'
    };

  } catch (error) {
    console.error('Registration error:', error);
    return { 
      success: false, 
      error: 'An error occurred during registration. Please try again.' 
    };
  }
}

export async function refreshUserData(userId: number): Promise<AuthResponse> {
  try {
    const user = await getUserById(userId);
    
    if (user) {
      return {
        success: true,
        user: user,
        message: 'User data refreshed successfully'
      };
    } else {
      return {
        success: false,
        error: 'User not found or session expired'
      };
    }
  } catch (error) {
    console.error('Refresh user data error:', error);
    return {
      success: false,
      error: 'Failed to refresh user data'
    };
  }
}

export async function getUserById(userId: number): Promise<AuthUser | null> {
  try {
    const userRow = await dbHelpers.get(
      'SELECT * FROM users WHERE id = ?',
      [userId]
    );

    if (!userRow) {
      return null;
    }

    let trainerRow = null;
    let athleteRow = null;

    if ((userRow as any).role === 'trainer') {
      trainerRow = await dbHelpers.get(
        'SELECT * FROM trainers WHERE user_id = ?',
        [(userRow as any).id]
      );
    } else if ((userRow as any).role === 'athlete') {
      athleteRow = await dbHelpers.get(
        'SELECT * FROM athletes WHERE user_id = ?',
        [(userRow as any).id]
      );
    }

    return convertToAuthUser(userRow, trainerRow, athleteRow);

  } catch (error) {
    console.error('Get user error:', error);
    return null;
  }
}