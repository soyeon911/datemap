import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useRef, useState } from 'react';

import { countDateCards, getSavedDatePlaces, type SavedDatePlace } from '@/db/date-cards';
import { useAuth } from '@/lib/auth-context';
import { useCouple } from '@/lib/couple-context';
import { pullRemoteChanges } from '@/sync/cloud-sync';

type DatabaseState = 'checking' | 'ready' | 'failed';

// Loads saved places from SQLite and pulls remote changes once per login and per
// couple link, then again on pull-to-refresh.
export function useSavedPlaces() {
  const db = useSQLiteContext();
  const { session } = useAuth();
  const { couple } = useCouple();
  const pulledUserIdRef = useRef<string | null>(null);
  const pulledCoupleIdRef = useRef<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [databaseState, setDatabaseState] = useState<DatabaseState>('checking');
  const [datePlaceCount, setDatePlaceCount] = useState(0);
  const [savedPlaces, setSavedPlaces] = useState<SavedDatePlace[]>([]);

  useEffect(() => {
    let isMounted = true;

    async function loadDatabaseStatus() {
      try {
        const [count, places] = await Promise.all([countDateCards(db), getSavedDatePlaces(db)]);

        if (isMounted) {
          setDatePlaceCount(count);
          setSavedPlaces(places);
          setDatabaseState('ready');
        }
      } catch {
        if (isMounted) {
          setDatabaseState('failed');
        }
      }
    }

    loadDatabaseStatus();

    return () => {
      isMounted = false;
    };
  }, [db]);

  useEffect(() => {
    const userId = session?.user.id ?? null;

    if (!userId || pulledUserIdRef.current === userId) {
      return;
    }

    pulledUserIdRef.current = userId;

    pullRemoteChanges(db).then(() => refreshDatePlaces());
    // refreshDatePlaces intentionally omitted: it's redefined every render, and the
    // pulledUserIdRef guard above already ensures this only runs once per login.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db, session]);

  useEffect(() => {
    const coupleId = couple?.id ?? null;

    if (!coupleId || pulledCoupleIdRef.current === coupleId) {
      return;
    }

    pulledCoupleIdRef.current = coupleId;

    pullRemoteChanges(db).then(() => refreshDatePlaces());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db, couple]);

  async function refreshDatePlaces() {
    const [count, places] = await Promise.all([countDateCards(db), getSavedDatePlaces(db)]);
    setDatePlaceCount(count);
    setSavedPlaces(places);
    setDatabaseState('ready');
  }

  async function handlePullToRefresh() {
    setIsRefreshing(true);

    try {
      await pullRemoteChanges(db);
      await refreshDatePlaces();
    } finally {
      setIsRefreshing(false);
    }
  }

  return { savedPlaces, datePlaceCount, databaseState, isRefreshing, refreshDatePlaces, handlePullToRefresh };
}
