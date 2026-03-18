/**
 * Represents a single artist performance slot on a festival stage.
 */
export interface Performance {
  /** Unique identifier (assigned by ScheduleService). */
  id: string;
  /** ID of the festival this performance belongs to. References Festival.id. */
  festivalId: string;
  /** Name of the performing artist or band. */
  artistName: string;
  /** Name of the stage where the performance takes place. References Stage.name. */
  stageName: string;
  /** Performance date in ISO 8601 format (YYYY-MM-DD). */
  date: string;
  /** Start time in 24-hour HH:mm format (e.g. "18:00"). */
  startTime: string;
  /** End time in 24-hour HH:mm format (e.g. "19:30"). Must be after startTime. */
  endTime: string;
}
