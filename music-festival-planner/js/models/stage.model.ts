/** Operational status of a stage. */
export type StageStatus = 'active' | 'inactive' | 'under-repair';

/** Physical setting of a stage. */
export type StageEnvironment = 'indoor' | 'outdoor';

/**
 * Represents a physical performance stage within a festival.
 */
export interface Stage {
  /** Unique identifier (assigned by StageService). */
  id: string;
  /** ID of the festival this stage belongs to. References Festival.id. */
  festivalId: string;
  /** Display name of the stage (unique per festival, case-insensitive). */
  name: string;
  /** Maximum number of attendees the stage can hold. Must be a positive integer (enforced by StageService). */
  capacity: number;
  /** Whether the stage is indoors or outdoors. */
  environment: StageEnvironment;
  /** Current operational status of the stage. */
  status: StageStatus;
  /** Optional free-text notes (e.g. production details, restrictions). */
  notes?: string;
}
