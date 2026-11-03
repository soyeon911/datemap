import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { modalStyles } from '@/components/home/modal-styles';
import { TextSectionTitle } from '@/components/home/text';
import type { SavedDatePlace } from '@/db/date-cards';
import type { PlaceGroup } from '@/utils/place-group';

export function PlaceGroupModal({
  group,
  onClose,
  onSelectPlace,
}: {
  group: PlaceGroup | null;
  onClose: () => void;
  onSelectPlace: (place: SavedDatePlace) => void;
}) {
  return (
    <Modal
      animationType="fade"
      transparent
      visible={group !== null}
      onRequestClose={onClose}>
      <Pressable style={modalStyles.settingsOverlay} onPress={onClose}>
        {group ? (
          <Pressable style={modalStyles.settingsSheet} onPress={(event) => event.stopPropagation()}>
            <View style={modalStyles.settingsHeader}>
              <TextSectionTitle>{group.label}</TextSectionTitle>
              <Pressable style={modalStyles.modalCloseButton} onPress={onClose}>
                <Text style={modalStyles.modalCloseButtonText}>닫기</Text>
              </Pressable>
            </View>
            <ScrollView style={styles.groupPlaceList}>
              {group.places.map((place) => (
                <Pressable
                  key={place.id}
                  style={styles.groupPlaceRow}
                  onPress={() => onSelectPlace(place)}>
                  <Text style={styles.groupPlaceRowTitle}>{place.placeName}</Text>
                  <Text style={styles.groupPlaceRowDate}>{place.date}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </Pressable>
        ) : null}
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  groupPlaceList: {
    maxHeight: 360,
  },
  groupPlaceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 10,
    backgroundColor: '#F1E5E1',
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 8,
  },
  groupPlaceRowDate: {
    color: '#7A6F65',
    fontSize: 13,
    fontWeight: '600',
  },
  groupPlaceRowTitle: {
    color: '#342725',
    fontSize: 15,
    fontWeight: '800',
  },
});
