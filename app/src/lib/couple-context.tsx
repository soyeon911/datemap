import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';

export type Couple = {
  id: string;
  isOwner: boolean;
  inviteCode: string;
  partnerUserId: string | null;
};

type CoupleContextValue = {
  couple: Couple | null;
  loading: boolean;
  createInvite: () => Promise<Couple>;
  joinWithCode: (code: string) => Promise<Couple>;
  leaveCouple: () => Promise<void>;
};

type CoupleRow = {
  id: string;
  owner_user_id: string;
  partner_user_id: string | null;
  invite_code: string;
};

const CoupleContext = createContext<CoupleContextValue | null>(null);

const INVITE_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I

function generateInviteCode() {
  let code = '';

  for (let index = 0; index < 6; index += 1) {
    code += INVITE_CODE_ALPHABET[Math.floor(Math.random() * INVITE_CODE_ALPHABET.length)];
  }

  return code;
}

function toCouple(row: CoupleRow, userId: string): Couple {
  return {
    id: row.id,
    isOwner: row.owner_user_id === userId,
    inviteCode: row.invite_code,
    partnerUserId: row.partner_user_id,
  };
}

async function loadMyCouple(userId: string | null): Promise<Couple | null> {
  if (!userId) {
    return null;
  }

  const { data } = await supabase
    .from('couples')
    .select('*')
    .or(`owner_user_id.eq.${userId},partner_user_id.eq.${userId}`)
    .maybeSingle();

  return data ? toCouple(data as CoupleRow, userId) : null;
}

export function CoupleProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const userId = session?.user.id ?? null;
  const [couple, setCouple] = useState<Couple | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    loadMyCouple(userId).then((result) => {
      if (isMounted) {
        setCouple(result);
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [userId]);

  async function createInvite(): Promise<Couple> {
    if (!userId) {
      throw new Error('NOT_SIGNED_IN');
    }

    if (couple) {
      return couple;
    }

    let lastError: unknown = null;

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const { data, error } = await supabase
        .from('couples')
        .insert({ owner_user_id: userId, invite_code: generateInviteCode() })
        .select()
        .single();

      if (!error && data) {
        const next = toCouple(data as CoupleRow, userId);
        setCouple(next);
        return next;
      }

      lastError = error;

      if (error && error.code !== '23505') {
        throw error;
      }
    }

    throw lastError instanceof Error ? lastError : new Error('INVITE_CODE_GENERATION_FAILED');
  }

  async function joinWithCode(code: string): Promise<Couple> {
    if (!userId) {
      throw new Error('NOT_SIGNED_IN');
    }

    const { data, error } = await supabase.rpc('join_couple', { code });

    if (error || !data) {
      throw error ?? new Error('JOIN_FAILED');
    }

    const next = toCouple(data as CoupleRow, userId);
    setCouple(next);
    return next;
  }

  async function leaveCouple() {
    if (!couple) {
      return;
    }

    const { error } = await supabase.from('couples').delete().eq('id', couple.id);

    if (error) {
      throw error;
    }

    setCouple(null);
  }

  return (
    <CoupleContext.Provider value={{ couple, loading, createInvite, joinWithCode, leaveCouple }}>
      {children}
    </CoupleContext.Provider>
  );
}

export function useCouple() {
  const context = useContext(CoupleContext);

  if (!context) {
    throw new Error('useCouple must be used within a CoupleProvider');
  }

  return context;
}
