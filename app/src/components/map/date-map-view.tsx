import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

type DateMapViewProps = {
  style?: StyleProp<ViewStyle>;
  selectedCoord?: {
    latitude: number;
    longitude: number;
  } | null;
  onSelectCoord?: (coord: { latitude: number; longitude: number }) => void;
};

const DEFAULT_COORD = {
  latitude: 37.5665,
  longitude: 126.978,
};

export function DateMapView({ selectedCoord, onSelectCoord, style }: DateMapViewProps) {
  return (
    <View style={[styles.placeholder, style]}>
      <Text style={styles.title}>지도 영역</Text>
      <Text style={styles.body}>네이버 지도는 iOS Development Build에서 표시됩니다.</Text>
      <Text style={styles.coord}>
        {selectedCoord
          ? `${selectedCoord.latitude.toFixed(5)}, ${selectedCoord.longitude.toFixed(5)}`
          : '선택된 좌표 없음'}
      </Text>
      <Pressable style={styles.button} onPress={() => onSelectCoord?.(DEFAULT_COORD)}>
        <Text style={styles.buttonText}>서울시청 좌표 선택</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  placeholder: {
    flex: 1,
    justifyContent: 'flex-end',
    gap: 8,
    padding: 18,
  },
  title: {
    color: '#211D1A',
    fontSize: 18,
    fontWeight: '800',
  },
  body: {
    color: '#5E554E',
    fontSize: 14,
    lineHeight: 20,
  },
  coord: {
    color: '#2C332F',
    fontSize: 13,
    fontWeight: '700',
  },
  button: {
    alignSelf: 'flex-start',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  buttonText: {
    color: '#276EF1',
    fontSize: 13,
    fontWeight: '800',
  },
});
