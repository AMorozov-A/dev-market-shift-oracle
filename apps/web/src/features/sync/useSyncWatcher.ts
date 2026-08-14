import { useDispatch } from 'react-redux';
import { useEffect, useState } from 'react';
import { message } from 'antd';
import { SyncStatus } from '@dev-market-oracle/shared-types';
import type { AppDispatch } from '../../app/store';
import { SYNC_STATUS_LABELS } from '../../shared/lib/labels';
import { baseApi } from '../api/baseApi';
import { useGetSyncRunQuery, useListSyncRunsQuery } from './syncApi';

const ACTIVE: SyncStatus[] = [SyncStatus.QUEUED, SyncStatus.RUNNING];
const notifiedRunIds = new Set<string>();

export function useSyncWatcher(listPageSize = 1) {
  const dispatch = useDispatch<AppDispatch>();
  const [watchedId, setWatchedId] = useState<string | null>(null);

  const listQuery = useListSyncRunsQuery({ page: 1, pageSize: listPageSize });
  const latest = listQuery.data?.items[0];
  const watchId =
    watchedId ?? (latest && ACTIVE.includes(latest.status) ? latest.id : null) ?? null;
  const isBusy = Boolean(watchId);

  const activeQuery = useGetSyncRunQuery(watchId ?? '', {
    skip: !watchId,
    pollingInterval: watchId ? 2000 : 0,
  });

  useEffect(() => {
    const run = activeQuery.data;
    if (!run || ACTIVE.includes(run.status)) {
      return;
    }

    const startedThisSession = watchedId === run.id;
    if (startedThisSession) {
      setWatchedId(null);
    }

    if (startedThisSession && !notifiedRunIds.has(run.id)) {
      notifiedRunIds.add(run.id);
      const label = SYNC_STATUS_LABELS[run.status] ?? run.status;
      if (run.status === SyncStatus.FAILED) {
        message.error(`Синхронизация завершилась с ошибкой: ${label}`);
      } else {
        message.success(`Данные обновлены: ${label}`);
      }
      dispatch(
        baseApi.util.invalidateTags([
          'SyncRuns',
          'Overview',
          'Trends',
          'Compare',
          'Skills',
          'Forecasts',
        ]),
      );
    }
  }, [activeQuery.data, watchedId, dispatch]);

  return {
    listQuery,
    latest,
    watchId,
    isBusy,
    activeRun: activeQuery.data,
    watchStarted: (id: string) => setWatchedId(id),
  };
}
