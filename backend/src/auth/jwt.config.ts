export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  
  if (process.env.NODE_ENV === 'production') {
    if (!secret || secret === 'super-secret-key-change-in-production') {
      throw new Error('FATAL: JWT_SECRET environment variable is missing or insecure in production.');
    }
    return secret;
  }
  
  return secret || 'super-secret-key-change-in-production';
}
