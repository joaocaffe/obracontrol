export type Status = 'A iniciar' | 'Em andamento' | 'Atrasada' | 'Concluída';

export type LaborRole = 'Mestre' | 'Pedreiro' | 'Ajudante' | 'Eletricista' | 'Encanador';
export type ContractType = 'Diária' | 'Empreitada';
export type PaymentMethod = 'Dinheiro' | 'PIX' | 'Cartão de Crédito' | 'Cartão de Débito' | 'Boleto' | 'Transferência' | (string & {});

export interface LaborCost {
  id: string;
  stageId: string;
  role: LaborRole;
  workerName: string; // New field
  contractType: ContractType;

  // Planned
  plannedDays: number;
  plannedDailyRate: number; // Or total for Empreitada

  // Real
  realDays: number;
  realDailyRate: number; // Or total paid for Empreitada
  startDate?: string;
  endDate?: string;
  isHidden?: boolean;
}

export interface MaterialCost {
  id: string;
  stageId: string;
  description: string;
  unit: string; // m², un, kg, saco, litro
  paymentMethod?: PaymentMethod;

  // Planned
  plannedQuantity: number;
  plannedUnitPrice: number;

  // Real
  realQuantity: number;
  realUnitPrice: number;
  date?: string; // YYYY-MM-DD
  isHidden?: boolean;
}

export interface Stage {
  id: string;
  name: string;
  status: Status;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  progress: number; // 0-100
  dependencies: string[]; // Array of Stage IDs
  isHidden?: boolean;
}

export interface CreditCard {
  id: string;
  name: string;
}

export interface CreditCardExpense {
  id: string;
  creditCardId: string;
  purchaseDate: string;
  invoiceDate: string;
  location: string;
  description: string;
  totalValue: number;
  installments: string;
  isHidden?: boolean;
}

export interface Payment {
  id: string;
  date: string;
  recipient: string;
  description: string;
  amount: number;
  paymentMethod: PaymentMethod;
  isHidden?: boolean;
}

export interface ProjectData {
  stages: Stage[];
  laborCosts: LaborCost[];
  materialCosts: MaterialCost[];
  laborRoles: string[];
  creditCards: CreditCard[];
  creditCardExpenses: CreditCardExpense[];
  payments: Payment[];
}
