import jwt from 'jsonwebtoken';
import { Config } from '../config';

// List of all available endpoints in the API
const ALL_ENDPOINTS = ['*'];

/**
 * Generate an admin JWT token for a specific user
 * Grants access to all available endpoints in the system
 */
function generateAdminToken(userId: string, username: string, expiresIn: string = '30d'): string {
  const payload = {
    sub: userId,
    username: username,
    authorizedEndpoints: ALL_ENDPOINTS,
  };

  return jwt.sign(payload, Config.JWT_SECRET, {
    expiresIn: expiresIn as jwt.SignOptions['expiresIn'],
  });
}

// Command line execution
if (require.main === module) {
  // Parse command line arguments
  const args = process.argv.slice(2);
  const userId = args[0];
  const username = args[1];
  const expiresIn = args[2] || '30d';

  if (!userId || !username) {
    console.error(
      'Usage: ts-node src/scripts/generate-admin-token.ts <userId> <username> [expiresIn]'
    );
    console.error('Example: ts-node src/scripts/generate-admin-token.ts user123 admin 30d');
    process.exit(1);
  }

  try {
    const token = generateAdminToken(userId, username, expiresIn);
    console.log('\nAdmin JWT Token generated successfully:\n');
    console.log(token);
    console.log('\nToken details:');
    console.log('- User ID:', userId);
    console.log('- Username:', username);
    console.log('- Expiration:', expiresIn);
    console.log('- Authorized endpoints:', ALL_ENDPOINTS.join(', '));
    console.log('\nUse this token in the Authorization header as:');
    console.log(`Bearer ${token}`);
    console.log('\nOr it will be automatically read from cookies if set as:');
    console.log(`${Config.COOKIE_NAME}=${token}`);
  } catch (error) {
    console.error('Error generating token:', error);
    process.exit(1);
  }
}

export { generateAdminToken };
