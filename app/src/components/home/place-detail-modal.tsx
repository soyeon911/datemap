import { useMemo, useState } from 'react';
import { Image, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { savedPlaceStyles } from '@/components/home/saved-place-card';
import type { SavedDatePlace } from '@/db/date-cards';
import { getOrderedPhotoUris, stepPhotoIndex } from '@/utils/photo';
import { canEditPlace } from '@/utils/place-permission';

type PlaceDetailActions = {
  currentUserId: string | undefined;
  onClose: () => void;
  onEdit: (place: SavedDatePlace) => void;
  onDelete: (place: SavedDatePlace) => void;
  onOpenPhoto: (uri: string) => void;
};

export function PlaceDetailModal({ place, ...actions }: { place: SavedDatePlace | null } & PlaceDetailActions) {
  return (
    <Modal animationType="fade" transparent visible={place !== null} onRequestClose={actions.onClose}>
      <Pressable style={styles.detailOverlay} onPress={actions.onClose}>
        {/* Keyed and mounted only while open, so each opening starts on the first photo. */}
        {place ? <PlaceDetailSheet key={place.id} place={place} {...actions} /> : null}
      </Pressable>
    </Modal>
  );
}

function PlaceDetailSheet({
  place,
  currentUserId,
  onClose,
  onEdit,
  onDelete,
  onOpenPhoto,
}: { place: SavedDatePlace } & PlaceDetailActions) {
  const [detailPhotoIndex, setDetailPhotoIndex] = useState(0);
  const detailPhotoUris = useMemo(() => getOrderedPhotoUris(place), [place]);

  return (
    <Pressable style={styles.detailSheet} onPress={(event) => event.stopPropagation()}>
      <View style={styles.detailActionBar}>
        <Pressable style={styles.detailActionButton} onPress={onClose}>
          <Text style={styles.detailActionText}>닫기</Text>
        </Pressable>
        {canEditPlace(place, currentUserId) ? (
          <>
            <Pressable
              style={styles.detailActionButton}
              onPress={() => onEdit(place)}>
              <Text style={styles.detailActionText}>수정</Text>
            </Pressable>
            <Pressable style={styles.detailDeleteButton} onPress={() => onDelete(place)}>
              <Text style={styles.detailDeleteText}>삭제</Text>
            </Pressable>
          </>
        ) : (
          <Text style={styles.detailActionText}>상대방이 남긴 기록이에요</Text>
        )}
      </View>

      {detailPhotoUris.length > 0 ? (
        <View style={styles.detailImageFrame}>
          <Pressable
            style={styles.detailImageButton}
            onPress={(event) => {
              event.stopPropagation();
              onOpenPhoto(detailPhotoUris[detailPhotoIndex]);
            }}>
            <Image
              source={{ uri: detailPhotoUris[detailPhotoIndex] }}
              style={styles.detailImage}
              resizeMode="contain"
            />
          </Pressable>
          {detailPhotoUris.length > 1 ? (
            <>
              <Pressable
                accessibilityLabel="이전 사진"
                style={[styles.photoNavButton, styles.photoNavButtonLeft]}
                onPress={() =>
                  setDetailPhotoIndex((currentIndex) => stepPhotoIndex(currentIndex, -1, detailPhotoUris.length))
                }>
                <Text style={styles.photoNavButtonText}>‹</Text>
              </Pressable>
              <Pressable
                accessibilityLabel="다음 사진"
                style={[styles.photoNavButton, styles.photoNavButtonRight]}
                onPress={() =>
                  setDetailPhotoIndex((currentIndex) => stepPhotoIndex(currentIndex, 1, detailPhotoUris.length))
                }>
                <Text style={styles.photoNavButtonText}>›</Text>
              </Pressable>
              <View style={styles.photoPager}>
                {detailPhotoUris.map((uri, index) => (
                  <Pressable
                    key={`${uri}_${index}`}
                    accessibilityLabel={`${index + 1}번째 사진 보기`}
                    style={[styles.photoPagerDot, index === detailPhotoIndex && styles.photoPagerDotActive]}
                    onPress={() => setDetailPhotoIndex(index)}
                  />
                ))}
              </View>
            </>
          ) : null}
        </View>
      ) : (
        <View style={styles.detailImagePlaceholder}>
          <Text style={savedPlaceStyles.savedCardImagePlaceholderText}>대표 사진 없음</Text>
        </View>
      )}

      <View style={styles.detailContent}>
        <Text style={styles.detailTitle}>{place.placeName}</Text>
        <Text style={styles.detailDate}>{place.date}</Text>
        <Text style={savedPlaceStyles.savedCardMeta}>사진 {place.photoCount}장 저장됨</Text>
        {place.oneLineDiary ? (
          <Text style={styles.detailDiary}>{place.oneLineDiary}</Text>
        ) : null}
        {place.hashtags.length > 0 ? (
          <View style={savedPlaceStyles.savedHashtagRow}>
            {place.hashtags.map((tag) => (
              <View key={tag} style={savedPlaceStyles.savedHashtagChip}>
                <Text style={savedPlaceStyles.savedHashtagText}>#{tag}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  detailActionBar: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 5,
    flexDirection: 'row',
    gap: 8,
  },
  detailActionButton: {
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.92)',
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
  detailActionText: {
    color: '#3E3833',
    fontSize: 13,
    fontWeight: '800',
  },
  detailContent: {
    padding: 18,
    gap: 10,
  },
  detailDate: {
    color: '#7C7065',
    fontSize: 14,
    fontWeight: '800',
  },
  detailDeleteButton: {
    borderRadius: 999,
    backgroundColor: '#ECDADD',
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
  detailDeleteText: {
    color: '#9D4F5B',
    fontSize: 13,
    fontWeight: '800',
  },
  detailDiary: {
    color: '#3E3833',
    fontSize: 16,
    lineHeight: 23,
  },
  detailImage: {
    width: '100%',
    height: '100%',
  },
  detailImageButton: {
    width: '100%',
    height: '100%',
  },
  detailImageFrame: {
    position: 'relative',
    height: 260,
    backgroundColor: '#E5D4CF',
  },
  detailImagePlaceholder: {
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E5D4CF',
  },
  detailOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(33,29,26,0.35)',
  },
  detailSheet: {
    maxHeight: '82%',
    overflow: 'hidden',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    backgroundColor: '#F8EFEC',
  },
  detailTitle: {
    color: '#342725',
    fontSize: 24,
    fontWeight: '900',
  },
  photoNavButton: {
    position: 'absolute',
    top: '44%',
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.88)',
  },
  photoNavButtonLeft: {
    left: 12,
  },
  photoNavButtonRight: {
    right: 12,
  },
  photoNavButtonText: {
    color: '#342725',
    fontSize: 28,
    fontWeight: '800',
    lineHeight: 30,
  },
  photoPager: {
    position: 'absolute',
    right: 14,
    bottom: 12,
    flexDirection: 'row',
    gap: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(33,29,26,0.28)',
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  photoPagerDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
  photoPagerDotActive: {
    width: 16,
    backgroundColor: '#F8EFEC',
  },
});
