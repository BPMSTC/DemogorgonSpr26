import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

// Blocks access to protected routes for users who are not logged in.
export const authGuard: CanActivateFn = () => {
  // Grab the auth service so we can check whether someone is currently logged in.
  const auth = inject(AuthService);
  // Grab the router so we can redirect the user if they are not allowed in.
  const router = inject(Router);
  // If someone is logged in, allow navigation to the requested route.
  if (auth.isLoggedIn) return true;
  // Nobody is logged in — send them to the login page instead.
  return router.createUrlTree(['/login']);
};
