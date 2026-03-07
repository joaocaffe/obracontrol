import { create } from 'zustand';
import { supabase } from './lib/supabase';
import { ProjectData, Stage, LaborCost, MaterialCost, CreditCardExpense, CreditCard, Payment, PlanningItem } from './types';

// Helper to convert snake_case to camelCase
const toCamel = (obj: any): any => {
  if (Array.isArray(obj)) return obj.map(toCamel);
  if (obj !== null && typeof obj === 'object') {
    return Object.keys(obj).reduce((acc, key) => {
      const camelKey = key.replace(/_([a-z])/g, (_, char) => char.toUpperCase());
      acc[camelKey] = toCamel(obj[key]);
      return acc;
    }, {} as any);
  }
  return obj;
};

// Helper to convert camelCase to snake_case
const toSnake = (obj: any): any => {
  if (Array.isArray(obj)) return obj.map(toSnake);
  if (obj !== null && typeof obj === 'object') {
    return Object.keys(obj).reduce((acc, key) => {
      const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
      acc[snakeKey] = toSnake(obj[key]);
      return acc;
    }, {} as any);
  }
  return obj;
};

interface AppState extends ProjectData {
  isLoading: boolean;
  fetchInitialData: () => Promise<void>;

  addStage: (stage: Omit<Stage, 'id'>) => Promise<{ error: any }>;
  updateStage: (id: string, stage: Partial<Stage>) => Promise<{ error: any }>;
  deleteStage: (id: string) => Promise<{ error: any }>;

  addLaborCost: (cost: Omit<LaborCost, 'id'>) => Promise<{ error: any }>;
  updateLaborCost: (id: string, cost: Partial<LaborCost>) => Promise<{ error: any }>;
  deleteLaborCost: (id: string) => Promise<{ error: any }>;

  addLaborRole: (role: string) => Promise<{ error: any }>;
  updateLaborRole: (oldRole: string, newRole: string) => Promise<{ error: any }>;
  deleteLaborRole: (role: string) => Promise<{ error: any }>;

  addMaterialCost: (cost: Omit<MaterialCost, 'id'>) => Promise<{ error: any }>;
  updateMaterialCost: (id: string, cost: Partial<MaterialCost>) => Promise<{ error: any }>;
  deleteMaterialCost: (id: string) => Promise<{ error: any }>;

  addCreditCard: (card: Omit<CreditCard, 'id'>) => Promise<{ error: any }>;
  updateCreditCard: (id: string, card: Partial<CreditCard>) => Promise<{ error: any }>;
  deleteCreditCard: (id: string) => Promise<{ error: any }>;

  addCreditCardExpense: (expense: Omit<CreditCardExpense, 'id'>) => Promise<{ error: any }>;
  updateCreditCardExpense: (id: string, expense: Partial<CreditCardExpense>) => Promise<{ error: any }>;
  deleteCreditCardExpense: (id: string) => Promise<{ error: any }>;

  addPayment: (payment: Omit<Payment, 'id'>) => Promise<{ error: any }>;
  updatePayment: (id: string, payment: Partial<Payment>) => Promise<{ error: any }>;
  deletePayment: (id: string) => Promise<{ error: any }>;

  addPlanningItem: (item: Omit<PlanningItem, 'id' | 'totalValue'>) => Promise<{ error: any }>;
  updatePlanningItem: (id: string, item: Partial<PlanningItem>) => Promise<{ error: any }>;
  deletePlanningItem: (id: string) => Promise<{ error: any }>;

  addPlanningType: (name: string) => Promise<{ error: any }>;
  updatePlanningType: (oldName: string, newName: string) => Promise<{ error: any }>;
  deletePlanningType: (name: string) => Promise<{ error: any }>;
}

export const useStore = create<AppState>((set) => ({
  stages: [],
  laborCosts: [],
  laborRoles: [],
  materialCosts: [],
  creditCards: [],
  creditCardExpenses: [],
  payments: [],
  planningItems: [],
  planningTypes: [],
  isLoading: false,

  fetchInitialData: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    set({ isLoading: true });
    try {
      const [
        { data: stages },
        { data: laborCosts },
        { data: laborRoles },
        { data: materialCosts },
        { data: creditCards },
        { data: creditCardExpenses },
        { data: payments },
        { data: planningItems },
        { data: planningTypes }
      ] = await Promise.all([
        supabase.from('stages').select('*').order('start_date'),
        supabase.from('labor_costs').select('*'),
        supabase.from('labor_roles').select('name'),
        supabase.from('material_costs').select('*'),
        supabase.from('credit_cards').select('*'),
        supabase.from('credit_card_expenses').select('*'),
        supabase.from('payments').select('*'),
        supabase.from('planning_items').select('*').order('week_start_date'),
        supabase.from('planning_types').select('name').order('name')
      ]);

      set({
        stages: toCamel(stages || []),
        laborCosts: toCamel(laborCosts || []),
        laborRoles: (laborRoles || []).map(r => r.name),
        materialCosts: toCamel(materialCosts || []),
        creditCards: toCamel(creditCards || []),
        creditCardExpenses: toCamel(creditCardExpenses || []),
        payments: toCamel(payments || []),
        planningItems: toCamel(planningItems || []),
        planningTypes: (planningTypes || []).map(t => t.name),
      });
    } finally {
      set({ isLoading: false });
    }
  },

  addStage: async (stage) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Not authenticated' };
    const { data, error } = await supabase.from('stages').insert(toSnake({ ...stage, userId: user.id })).select().single();
    if (!error && data) set(state => ({ stages: [...state.stages, toCamel(data)] }));
    return { error };
  },
  updateStage: async (id, stage) => {
    const { error } = await supabase.from('stages').update(toSnake(stage)).eq('id', id);
    if (!error) set(state => ({ stages: state.stages.map(s => s.id === id ? { ...s, ...stage } : s) }));
    return { error };
  },
  deleteStage: async (id) => {
    const { error } = await supabase.from('stages').delete().eq('id', id);
    if (!error) set(state => ({
      stages: state.stages.filter(s => s.id !== id),
      laborCosts: state.laborCosts.filter(l => l.stageId !== id),
      materialCosts: state.materialCosts.filter(m => m.stageId !== id),
    }));
    return { error };
  },

  addLaborCost: async (cost) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Not authenticated' };
    const { data, error } = await supabase.from('labor_costs').insert(toSnake({ ...cost, userId: user.id })).select().single();
    if (!error && data) set(state => ({ laborCosts: [...state.laborCosts, toCamel(data)] }));
    return { error };
  },
  updateLaborCost: async (id, cost) => {
    const { error } = await supabase.from('labor_costs').update(toSnake(cost)).eq('id', id);
    if (!error) set(state => ({ laborCosts: state.laborCosts.map(l => l.id === id ? { ...l, ...cost } : l) }));
    return { error };
  },
  deleteLaborCost: async (id) => {
    const { error } = await supabase.from('labor_costs').delete().eq('id', id);
    if (!error) set(state => ({ laborCosts: state.laborCosts.filter(l => l.id !== id) }));
    return { error };
  },

  addLaborRole: async (role) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Not authenticated' };
    const { error } = await supabase.from('labor_roles').insert({ name: role, user_id: user.id });
    if (!error) set(state => ({ laborRoles: [...state.laborRoles, role] }));
    return { error };
  },
  updateLaborRole: async (oldRole, newRole) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Unauthorized' };

    // Update the role name in labor_roles table
    const { error: roleError } = await supabase
      .from('labor_roles')
      .update({ name: newRole })
      .eq('name', oldRole)
      .eq('user_id', user.id);

    if (roleError) return { error: roleError };

    // Update all labor costs that use this role
    const { error: costError } = await supabase
      .from('labor_costs')
      .update({ role: newRole })
      .eq('role', oldRole)
      .eq('user_id', user.id);

    if (!costError) {
      set(state => ({
        laborRoles: state.laborRoles.map(r => r === oldRole ? newRole : r),
        laborCosts: state.laborCosts.map(c => c.role === oldRole ? { ...c, role: newRole as any } : c)
      }));
    }
    return { error: costError };
  },

  deleteLaborRole: async (role) => {
    const { error } = await supabase.from('labor_roles').delete().eq('name', role);
    if (!error) set(state => ({ laborRoles: state.laborRoles.filter(r => r !== role) }));
    return { error };
  },

  addMaterialCost: async (cost) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Not authenticated' };
    const { data, error } = await supabase.from('material_costs').insert(toSnake({ ...cost, userId: user.id })).select().single();
    if (!error && data) set(state => ({ materialCosts: [...state.materialCosts, toCamel(data)] }));
    return { error };
  },
  updateMaterialCost: async (id, cost) => {
    const { error } = await supabase.from('material_costs').update(toSnake(cost)).eq('id', id);
    if (!error) set(state => ({ materialCosts: state.materialCosts.map(m => m.id === id ? { ...m, ...cost } : m) }));
    return { error };
  },
  deleteMaterialCost: async (id) => {
    const { error } = await supabase.from('material_costs').delete().eq('id', id);
    if (!error) set(state => ({ materialCosts: state.materialCosts.filter(m => m.id !== id) }));
    return { error };
  },

  addCreditCard: async (card) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Not authenticated' };
    const { data, error } = await supabase.from('credit_cards').insert(toSnake({ ...card, userId: user.id })).select().single();
    if (!error && data) set(state => ({ creditCards: [...state.creditCards, toCamel(data)] }));
    return { error };
  },
  updateCreditCard: async (id, card) => {
    const { error } = await supabase.from('credit_cards').update(toSnake(card)).eq('id', id);
    if (!error) set(state => ({ creditCards: state.creditCards.map(c => c.id === id ? { ...c, ...card } : c) }));
    return { error };
  },
  deleteCreditCard: async (id) => {
    const { error } = await supabase.from('credit_cards').delete().eq('id', id);
    if (!error) set(state => ({ creditCards: state.creditCards.filter(c => c.id !== id) }));
    return { error };
  },

  addCreditCardExpense: async (expense) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Not authenticated' };
    const { data, error } = await supabase.from('credit_card_expenses').insert(toSnake({ ...expense, userId: user.id })).select().single();
    if (!error && data) set(state => ({ creditCardExpenses: [...state.creditCardExpenses, toCamel(data)] }));
    return { error };
  },
  updateCreditCardExpense: async (id, expense) => {
    const { error } = await supabase.from('credit_card_expenses').update(toSnake(expense)).eq('id', id);
    if (!error) set(state => ({ creditCardExpenses: state.creditCardExpenses.map(e => e.id === id ? { ...e, ...expense } : e) }));
    return { error };
  },
  deleteCreditCardExpense: async (id) => {
    const { error } = await supabase.from('credit_card_expenses').delete().eq('id', id);
    if (!error) set(state => ({ creditCardExpenses: state.creditCardExpenses.filter(e => e.id !== id) }));
    return { error };
  },

  addPayment: async (payment) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Not authenticated' };
    const { data, error } = await supabase.from('payments').insert(toSnake({ ...payment, userId: user.id })).select().single();
    if (!error && data) set(state => ({ payments: [...state.payments, toCamel(data)] }));
    return { error };
  },
  updatePayment: async (id, payment) => {
    const { error } = await supabase.from('payments').update(toSnake(payment)).eq('id', id);
    if (!error) set(state => ({ payments: state.payments.map(p => p.id === id ? { ...p, ...payment } : p) }));
    return { error };
  },
  deletePayment: async (id) => {
    const { error } = await supabase.from('payments').delete().eq('id', id);
    if (!error) set(state => ({ payments: state.payments.filter(p => p.id !== id) }));
    return { error };
  },

  addPlanningItem: async (item) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Not authenticated' };
    const { data, error } = await supabase.from('planning_items').insert(toSnake({ ...item, userId: user.id })).select().single();
    if (!error && data) set(state => ({ planningItems: [...state.planningItems, toCamel(data)] }));
    return { error };
  },
  updatePlanningItem: async (id, item) => {
    const { data, error } = await supabase.from('planning_items').update(toSnake(item)).eq('id', id).select().single();
    if (!error && data) set(state => ({ planningItems: state.planningItems.map(i => i.id === id ? toCamel(data) : i) }));
    return { error };
  },
  deletePlanningItem: async (id) => {
    const { error } = await supabase.from('planning_items').delete().eq('id', id);
    if (!error) set(state => ({ planningItems: state.planningItems.filter(i => i.id !== id) }));
    return { error };
  },

  addPlanningType: async (name) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Not authenticated' };
    const { error } = await supabase.from('planning_types').insert({ name, user_id: user.id });
    if (!error) set(state => ({ planningTypes: [...state.planningTypes, name].sort() }));
    return { error };
  },

  updatePlanningType: async (oldName, newName) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Unauthorized' };

    const { error: typeError } = await supabase
      .from('planning_types')
      .update({ name: newName })
      .eq('name', oldName)
      .eq('user_id', user.id);

    if (typeError) return { error: typeError };

    const { error: itemError } = await supabase
      .from('planning_items')
      .update({ type: newName })
      .eq('type', oldName)
      .eq('user_id', user.id);

    if (!itemError) {
      set(state => ({
        planningTypes: state.planningTypes.map(t => t === oldName ? newName : t).sort(),
        planningItems: state.planningItems.map(i => i.type === oldName ? { ...i, type: newName } : i)
      }));
    }
    return { error: itemError };
  },

  deletePlanningType: async (name) => {
    const { error } = await supabase.from('planning_types').delete().eq('name', name);
    if (!error) set(state => ({ planningTypes: state.planningTypes.filter(t => t !== name) }));
    return { error };
  },
}));
