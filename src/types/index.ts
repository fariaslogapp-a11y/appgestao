export interface Vehicle {
  id: string;
  plate: string;
  type: '3/4' | 'toco' | 'truck' | 'bitruck' | 'cavalo' | 'carreta';
  brand: string;
  model: string;
  year: number;
  current_km: number;
  is_refrigerated: boolean;
  status: 'active' | 'maintenance' | 'inactive';
  notes: string;
  coupled_vehicle_id: string | null;
  created_at: string;
}

export interface Driver {
  id: string;
  name: string;
  cpf: string;
  phone: string;
  email: string;
  cnh_number: string;
  cnh_validity: string;
  status: string;
  notes: string;
  created_at: string;
}

export interface Maintenance {
  id: string;
  vehicle_id: string;
  maintenance_date: string;
  km_at_maintenance: number;
  type: 'preventiva' | 'corretiva' | 'revisão';
  description: string;
  cost: number;
  next_maintenance_km: number | null;
  notes: string;
  status: 'in_progress' | 'completed';
  created_at: string;
}

export interface TireChange {
  id: string;
  vehicle_id: string;
  change_date: string;
  km_at_change: number;
  tire_position: string;
  tire_brand: string;
  cost: number;
  notes: string;
  created_at: string;
}

export interface Trip {
  id: string;
  vehicle_id: string;
  driver_id: string | null;
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled';
  origin: string;
  destination: string;
  departure_date: string;
  arrival_date: string | null;
  freight_value: number;
  driver_commission: number | null;
  cte: string;
  nfe: string;
  pallet_term: string;
  mdfe: string;
  receipt: string;
  notes: string;
  created_at: string;
}

export interface TireInspectionForm {
  id: string;
  vehicle_id: string;
  driver_name: string;
  driver_cpf: string;
  status: 'pending' | 'completed';
  token: string;
  expires_at: string;
  completed_at: string | null;
  current_km: number;
  created_at: string;
}

export interface TireInspectionResponse {
  id: string;
  form_id: string;
  tire_position: string;
  tire_brand: string | null;
  tire_size: string | null;
  groove_depth: string | null;
  is_retreaded: boolean;
  notes: string | null;
  created_at: string;
}

export interface CommissionRule {
  id: string;
  origin: string;
  destination: string;
  commission_value: number;
  created_at: string;
}

export interface ManualCommission {
  id: string;
  driver_id: string;
  description: string;
  origin: string;
  commission_value: number;
  notes: string;
  date: string;
  created_at: string;
}
