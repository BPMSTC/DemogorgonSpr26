import { InjectionToken } from '@angular/core';

/**
 * InjectionToken for browser localStorage.
 * Tests can override this token with in-memory storage implementations.
 */
export const LOCAL_STORAGE = new InjectionToken<Storage>('localStorage', {
  providedIn: 'root',
  factory: () => localStorage,
});
