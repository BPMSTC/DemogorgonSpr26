/**
 * Represents a music festival event.
 */
export interface Festival {
  /** Unique identifier (assigned by FestivalService). */
  id: string;
  /** Public display name of the festival. */
  name: string;
  /** Opening date in ISO 8601 format (YYYY-MM-DD). */
  startDate: string;
  /** Closing date in ISO 8601 format (YYYY-MM-DD). Must be >= startDate (enforced by FestivalService). */
  endDate: string;
  /** City, venue, or region where the festival takes place. */
  location: string;
  /** Optional image URL used for festival card visuals. */
  imageUrl?: string;
  /** Primary music genre (e.g. "Rock", "Electronic"). Optional. */
  genre?: string;
  /** Maximum total attendee capacity across all stages. Optional. */
  capacity?: number;
}
