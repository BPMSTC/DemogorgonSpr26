/**
 * Barrel export for all domain model interfaces and types.
 *
 * Import from here instead of individual model files:
 *   import { Festival, Stage, Performance } from '../../models';
 */
export type { Festival } from './festival.model';
export type { Stage, StageStatus, StageEnvironment } from './stage.model';
export type { Performance } from './performance.model';
