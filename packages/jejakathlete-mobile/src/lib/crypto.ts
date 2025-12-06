import * as Crypto from 'expo-crypto';

/**
 * Generate a random salt using expo-crypto
 */
async function generateSalt(): Promise<string> {
  // Generate 16 random bytes for the salt
  const randomBytes = await Crypto.getRandomBytesAsync(16);
  
  // Convert to hex string
  return Array.from(randomBytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Hash a password with a salt using SHA-256
 * Format: crypto_[salt]_[hash]
 */
export async function hashPassword(password: string): Promise<string> {
  try {
    // Generate a random salt
    const salt = await generateSalt();
    
    // Hash the password with the salt
    const hash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      password + salt
    );
    
    return `crypto_${salt}_${hash}`;
  } catch (error) {
    console.error('❌ Error hashing password:', error);
    throw new Error('Failed to hash password');
  }
}

/**
 * Verify a password against a stored hash
 * @param password - The plain text password to verify
 * @param storedHash - The stored hash in format: crypto_[salt]_[hash]
 */
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  try {
    // Check if the stored hash has the expected format
    if (!storedHash.startsWith('crypto_')) {
      console.warn('⚠️ Stored hash does not have expected format');
      return false;
    }
    
    // Extract salt and hash from stored value
    const parts = storedHash.split('_');
    if (parts.length !== 3) {
      console.warn('⚠️ Invalid hash format');
      return false;
    }
    
    const [, salt, expectedHash] = parts;
    
    // Hash the provided password with the stored salt
    const computedHash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      password + salt
    );
    
    // Compare the hashes
    return computedHash === expectedHash;
  } catch (error) {
    console.error('❌ Error verifying password:', error);
    return false;
  }
}

