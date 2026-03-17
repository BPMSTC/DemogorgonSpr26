export type StageStatus = 'active' | 'inactive' | 'under-repair';
export type StageEnvironment = 'indoor' | 'outdoor';
 
export interface Stage {
  id: string;
  festivalId: string;
  name: string;
  capacity: number;
  environment: StageEnvironment;
  status: StageStatus;
  notes?: string;
}