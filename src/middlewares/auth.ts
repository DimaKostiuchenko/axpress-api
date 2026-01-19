import type { Request, Response, NextFunction } from 'express';

/**
 * Authentication middleware skeleton
 *
 * TODO: Implement authentication logic based on your requirements:
 * - API Key authentication
 * - JWT token validation
 * - OAuth2/OIDC integration
 * - Session-based authentication
 *
 * Example implementations:
 *
 * 1. API Key Authentication:
 *    - Extract API key from header: req.headers['x-api-key']
 *    - Validate against database or environment variable
 *    - Return 401 if invalid
 *
 * 2. JWT Token Authentication:
 *    - Extract token from Authorization header: req.headers.authorization
 *    - Verify token signature and expiration
 *    - Attach user info to req.user
 *    - Return 401 if invalid
 *
 * 3. OAuth2/OIDC:
 *    - Use passport.js or similar library
 *    - Validate access tokens
 *    - Check token scopes/permissions
 */

/**
 * Placeholder authentication middleware
 * Currently allows all requests - implement actual auth logic here
 *
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 */
export const authenticate = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // TODO: Implement authentication logic
  // Example structure:
  // const apiKey = req.headers['x-api-key'];
  // if (!apiKey || !isValidApiKey(apiKey)) {
  //   return res.status(401).json({
  //     error: 'Unauthorized',
  //     requestId: req.id,
  //   });
  // }

  // For now, allow all requests
  next();
};

/**
 * Authorization middleware factory
 * Creates middleware to check if user has required permissions
 *
 * @param requiredPermissions - Array of required permission strings
 * @returns Middleware function
 *
 * TODO: Implement permission checking logic
 * Example:
 * - Check req.user.permissions against requiredPermissions
 * - Return 403 if user lacks required permissions
 */
export const authorize =
  (_requiredPermissions: string[]) =>
  (req: Request, res: Response, next: NextFunction): void => {
    // TODO: Implement authorization logic
    // Example structure:
    // const userPermissions = req.user?.permissions || [];
    // const hasPermission = requiredPermissions.every(perm =>
    //   userPermissions.includes(perm)
    // );
    // if (!hasPermission) {
    //   return res.status(403).json({
    //     error: 'Forbidden',
    //     requestId: req.id,
    //   });
    // }

    // For now, allow all requests
    next();
  };

/**
 * Extend Express Request type to include user information
 * Uncomment and customize when implementing authentication
 */
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface Request {
      // user?: {
      //   id: string;
      //   email?: string;
      //   permissions?: string[];
      //   roles?: string[];
      // };
    }
  }
}
