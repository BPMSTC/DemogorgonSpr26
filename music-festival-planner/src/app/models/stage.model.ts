export interface Stage {
  id: string;
  type: string; // e.g., 'main', 'indie', 'side'
  festivalId: string; // Reference to the associated festival
  capacity?: number;
  artist: string;
  status: string; // e.g., 'active', 'inactive', 'maintenance'
  environment?: string; // e.g., 'outdoor', 'indoor'
}