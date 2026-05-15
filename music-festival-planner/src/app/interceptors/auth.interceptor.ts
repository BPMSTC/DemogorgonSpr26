import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

// Attaches the user's authentication token to every outgoing HTTP request.
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // Retrieve the current authentication token from the auth service.
  const token = inject(AuthService).getToken();
  // If a token exists, clone the request and add it as a Bearer authorization header.
  if (token) {
    req = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
  }
  // Pass the (possibly modified) request along to the next handler in the chain.
  return next(req);
};
