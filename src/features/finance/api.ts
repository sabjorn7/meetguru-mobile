import { supabase } from '@/lib/supabase';

/** A purchase (order placed by the user). */
export type Purchase = {
  id: string;
  createdAt: string;
  summ: number;
  paid: boolean;
  subscription: boolean;
  /** A human-readable position label if the order carries one (e.g. a subscription). */
  label: string | null;
};

/** A sale (the user earned money as a seller). */
export type Sale = {
  id: string;
  createdAt: string;
  name: string;
  category: string | null;
  amount: number;
  price: number;
  refund: boolean;
  subscription: boolean;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Orders placed by the user, newest first. */
export async function fetchPurchases(userId: string): Promise<Purchase[]> {
  const { data, error } = await supabase
    .from('order')
    .select('id,created_at,summ,paid,subscription,course_positions')
    .eq('owner', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []).map((o) => {
    // course_positions mixes opaque ids and human labels; surface a label if present.
    const label = (o.course_positions ?? []).find((p) => p && !UUID_RE.test(p)) ?? null;
    return {
      id: o.id,
      createdAt: o.created_at,
      summ: o.summ ?? 0,
      paid: o.paid === true,
      subscription: o.subscription === true,
      label,
    };
  });
}

/** Sales earned by the user (as a seller), newest first. */
export async function fetchSales(userId: string): Promise<Sale[]> {
  const { data, error } = await supabase
    .from('sales')
    .select('id,created_at,position_name,position_category,amount,price,back,sub')
    .eq('user', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []).map((s) => ({
    id: s.id,
    createdAt: s.created_at,
    name: s.position_name ?? 'Продажа',
    category: s.position_category,
    amount: s.amount ?? 0,
    price: s.price ?? 0,
    refund: s.back === true,
    subscription: s.sub === true,
  }));
}

/** The user's balance (users.Ammount), read-only. */
export async function fetchBalance(userId: string): Promise<number> {
  const { data, error } = await supabase
    .from('users')
    .select('Ammount')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw error;
  return data?.Ammount ?? 0;
}
