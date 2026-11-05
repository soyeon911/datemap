import { Alert } from 'react-native';

import type { DatePlaceConflict } from '@/sync/cloud-sync';
import { describeConflict } from '@/sync/date-place-merge';

// Not dismissable: leaving without an answer would keep the edit stuck on this device.
export function askConflictChoice({ groups, merged, theirs }: DatePlaceConflict) {
  return new Promise<'mine' | 'theirs'>((resolve) => {
    Alert.alert(
      '다른 기기에서 먼저 수정했어요',
      `어느 내용을 남길까요?\n\n${describeConflict(groups, merged, theirs)}`,
      [
        { text: '다른 기기 수정 사용', onPress: () => resolve('theirs') },
        { text: '내 수정 유지', onPress: () => resolve('mine') },
      ],
      { cancelable: false }
    );
  });
}
