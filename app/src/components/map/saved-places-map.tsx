import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

export type SavedPlacesMapPlace = {
  id: string;
  placeName: string;
  latitude: number;
  longitude: number;
};

type SavedPlacesMapProps = {
  places: SavedPlacesMapPlace[];
  style?: StyleProp<ViewStyle>;
  onSelectPlace?: (place: SavedPlacesMapPlace) => void;
};

export function SavedPlacesMap({ places, style, onSelectPlace }: SavedPlacesMapProps) {
  return (
    <View style={[styles.placeholder, style]}>
      <Text style={styles.title}>네이버 지도 영역</Text>
      <Text style={styles.body}>iOS Development Build에서 저장 장소가 하트 마커로 표시됩니다.</Text>
      <View style={styles.markerLayer}>
        {places.map((place, index) => (
          <Pressable
            key={place.id}
            style={[
              styles.heartMarker,
              {
                left: `${18 + (index % 4) * 18}%`,
                top: `${22 + (index % 5) * 12}%`,
              },
            ]}
            onPress={() => onSelectPlace?.(place)}>
            <Text style={styles.heartText}>♥</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  placeholder: {
    flex: 1,
    justifyContent: 'flex-end',
    gap: 6,
    padding: 16,
    backgroundColor: '#E5D8D4',
  },
  title: {
    color: '#342725',
    fontSize: 18,
    fontWeight: '800',
  },
  body: {
    color: '#5E554E',
    fontSize: 13,
    lineHeight: 18,
  },
  markerLayer: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  heartMarker: {
    position: 'absolute',
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 17,
    backgroundColor: '#F8EFEC',
    borderWidth: 2,
    borderColor: '#F0A8B2',
  },
  heartText: {
    color: '#B96A76',
    fontSize: 18,
    fontWeight: '900',
    lineHeight: 21,
  },
});
