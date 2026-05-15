import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

// Prevents non-admin users from accessing admin-only routes.
export const adminGuard: CanActivateFn = () => {
  // Grab the auth service so we can check the current user's role.
  const auth = inject(AuthService);
  // Grab the router so we can redirect the user if they are not allowed in.
  const router = inject(Router);
  // If the current user is an admin, allow navigation to proceed.
  if (auth.isAdmin) return true;
  // If nobody is logged in at all, send them to the login page.
  if (!auth.isLoggedIn) return router.createUrlTree(['/login']);
  // The user is logged in but not an admin — redirect them to the home page.
  return router.createUrlTree(['/']);
};
