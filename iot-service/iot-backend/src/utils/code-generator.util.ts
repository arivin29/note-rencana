/**
 * Generate a unique 5-digit alphanumeric code
 * Format: Uppercase letters and numbers (e.g., "A1B2C", "XYZ12")
 */
export function generateOwnerCode(): string {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  
  for (let i = 0; i < 5; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    code += characters[randomIndex];
  }
  
  return code;
}

/**
 * Generate a unique code with retry logic
 * @param checkExists - Function to check if code already exists
 * @param maxAttempts - Maximum number of generation attempts
 * @returns A unique 5-digit code
 */
export async function generateUniqueOwnerCode(
  checkExists: (code: string) => Promise<boolean>,
  maxAttempts: number = 100,
): Promise<string> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const code = generateOwnerCode();
    const exists = await checkExists(code);
    
    if (!exists) {
      return code;
    }
  }
  
  throw new Error(
    `Failed to generate unique owner code after ${maxAttempts} attempts`,
  );
}
