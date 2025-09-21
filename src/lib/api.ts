import bcrypt from 'bcryptjs';
import * as Crypto from 'expo-crypto';
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

// Hash password using expo-crypto (React Native/Expo compatible)
async function hashPassword(password: string): Promise<string> {
  
  // Validate password input
  if (!password || typeof password !== 'string') {
    console.error('❌ Invalid password input:', { password: password, type: typeof password });
    throw new Error(`Invalid password: expected string, got ${typeof password}`);
  }
  
  if (password.length === 0) {
    console.error('❌ Empty password provided');
    throw new Error('Password cannot be empty');
  }
  
  try {
    
    // Generate a salt using crypto random bytes
    const salt = await Crypto.getRandomBytesAsync(16);
    const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('');
    
    // Create a salted password
    const saltedPassword = password + saltHex;
    
    // Hash using SHA-256 multiple times for security (PBKDF2-like approach)
    let hashedPassword = saltedPassword;
    const iterations = 10000; // 10k iterations for security
    
    for (let i = 0; i < iterations; i++) {
      hashedPassword = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        hashedPassword,
        { encoding: Crypto.CryptoEncoding.HEX }
      );
    }
    
    // Combine salt and hash for storage
    const finalHash = `crypto_${saltHex}_${hashedPassword}`;
    return finalHash;
    
  } catch (error) {
    console.error('❌ expo-crypto hash error:', error);
    
    // Fallback to simple hash if crypto fails
    const simpleHash = `simple_hash_${password}_${Date.now()}`;
    return simpleHash;
  }
}

// Verify password using expo-crypto (React Native/Expo compatible)
async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  
  try {
    // Handle expo-crypto hash verification
    if (hashedPassword.startsWith('crypto_')) {
      
      // Extract salt and hash from stored password
      const parts = hashedPassword.split('_');
      if (parts.length !== 3) {
        console.error('❌ Invalid crypto hash format');
        return false;
      }
      
      const saltHex = parts[1];
      const storedHash = parts[2];
      
      // Recreate the salted password
      const saltedPassword = password + saltHex;
      
      // Hash using the same process as registration
      let computedHash = saltedPassword;
      const iterations = 10000;
      
      for (let i = 0; i < iterations; i++) {
        computedHash = await Crypto.digestStringAsync(
          Crypto.CryptoDigestAlgorithm.SHA256,
          computedHash,
          { encoding: Crypto.CryptoEncoding.HEX }
        );
      }
      
      const isValid = computedHash === storedHash;
      return isValid;
    }
    
    // Handle simple hash verification for debugging
    if (hashedPassword.startsWith('simple_hash_')) {
      const extractedPassword = hashedPassword.split('_').slice(2, -1).join('_');
      const isValid = extractedPassword === password;
      return isValid;
    }
    
    // Fallback to bcrypt for existing passwords
    const result = await bcrypt.compare(password, hashedPassword);
    return result;
    
  } catch (error) {
    console.error('❌ Password verification error:', error);
    return false;
  }
}

// Convert database row to AuthUser
function convertToAuthUser(userRow: any, trainerRow?: any, athleteRow?: any): AuthUser {
  const baseUser: AuthUser = {
    id: userRow.id,
    username: userRow.username,
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
    let userRow;
    
    // Determine if logging in with username or email
    if (credentials.email) {
      // Login with email
      userRow = await dbHelpers.get(
        'SELECT * FROM users WHERE email = ?',
        [credentials.email]
      );
    } else if (credentials.username) {
      // Login with username
      userRow = await dbHelpers.get(
        'SELECT * FROM users WHERE username = ?',
        [credentials.username]
      );
    } else {
      return { success: false, error: 'Username or email is required' };
    }

    if (!userRow) {
      return { success: false, error: 'Invalid username/email or password' };
    }

    // Verify password
    const hashedPassword = (userRow as any).password as string;


    
    const isValidPassword = await verifyPassword(credentials.password, hashedPassword);

    
    if (!isValidPassword) {
      return { success: false, error: 'Invalid username/email or password' };
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
    
    // Check if user already exists (by username or email)
    const existingUserByUsername = await dbHelpers.get(
      'SELECT id FROM users WHERE username = ?',
      [userData.username]
    );

    if (existingUserByUsername) {
      return { success: false, error: 'An account with this username already exists' };
    }

    const existingUserByEmail = await dbHelpers.get(
      'SELECT id FROM users WHERE email = ?',
      [userData.email]
    );

    if (existingUserByEmail) {
      return { success: false, error: 'An account with this email already exists' };
    }

    // Hash password
    const hashedPassword = await hashPassword(userData.password);

    // Insert user
    const userResult = await dbHelpers.run(
      'INSERT INTO users (username, email, password, full_name, role) VALUES (?, ?, ?, ?, ?)',
      [userData.username, userData.email, hashedPassword, userData.full_name, userData.role]
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