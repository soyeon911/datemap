import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import type { SavedDatePlace } from '@/db/date-cards';

export function SavedPlaceCard({ place, onPress }: { place: SavedDatePlace; onPress: () => void }) {
  return (
    <Pressable style={styles.savedCard} onPress={onPress}>
      {place.coverPhotoUri ? (
        <Image source={{ uri: place.coverPhotoUri }} style={styles.savedCardImage} resizeMode="cover" />
      ) : (
        <View style={styles.savedCardImagePlaceholder}>
          <Text style={savedPlaceStyles.savedCardImagePlaceholderText}>사진 없음</Text>
        </View>
      )}
      <View style={styles.savedCardContent}>
        <Text style={styles.savedCardTitle}>{place.placeName}</Text>
        <Text style={styles.savedCardDate}>{place.date}</Text>
        <Text style={styles.savedCardDiary} numberOfLines={2}>
          {place.oneLineDiary || '한 줄 일기가 없습니다.'}
        </Text>
        <Text style={savedPlaceStyles.savedCardMeta}>사진 {place.photoCount}장</Text>
        {place.hashtags.length > 0 ? (
          <View style={savedPlaceStyles.savedHashtagRow}>
            {place.hashtags.slice(0, 3).map((tag) => (
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
  savedCard: {
    width: 286,
    height: 272,
    overflow: 'hidden',
    borderRadius: 12,
    backgroundColor: '#F8EFEC',
    borderWidth: 1,
    borderColor: '#D8C4BE',
  },
  savedCardContent: {
    flex: 1,
    padding: 13,
    gap: 7,
  },
  savedCardDate: {
    color: '#7C7065',
    fontSize: 13,
    fontWeight: '700',
  },
  savedCardDiary: {
    minHeight: 36,
    color: '#3E3833',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
  savedCardImage: {
    width: '100%',
    height: 116,
  },
  savedCardImagePlaceholder: {
    height: 116,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E5D4CF',
  },
  savedCardTitle: {
    color: '#342725',
    fontSize: 17,
    fontWeight: '800',
  },
});

// Shared with the place detail sheet.
export const savedPlaceStyles = StyleSheet.create({
  savedCardImagePlaceholderText: {
    color: '#7C7065',
    fontSize: 13,
    fontWeight: '800',
  },
  savedCardMeta: {
    color: '#8B8076',
    fontSize: 12,
    fontWeight: '800',
  },
  savedHashtagChip: {
    borderRadius: 999,
    backgroundColor: '#E7D2CD',
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  savedHashtagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  savedHashtagText: {
    color: '#6F5143',
    fontSize: 12,
    fontWeight: '800',
  },
});
