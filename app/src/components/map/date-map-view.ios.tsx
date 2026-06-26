import { NaverMapMarkerOverlay, NaverMapView, type Coord } from '@mj-studio/react-native-naver-map';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

type DateMapViewProps = {
  style?: StyleProp<ViewStyle>;
  selectedCoord?: Coord | null;
  onSelectCoord?: (coord: Coord) => void;
};

export function DateMapView({ selectedCoord, onSelectCoord, style }: DateMapViewProps) {
  return (
    <NaverMapView
      style={[styles.map, style]}
      initialRegion={{
        latitude: 37.5665,
        longitude: 126.978,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }}
      onTapMap={({ latitude, longitude }) => {
        onSelectCoord?.({ latitude, longitude });
      }}>
      {selectedCoord ? (
        <NaverMapMarkerOverlay
          latitude={selectedCoord.latitude}
          longitude={selectedCoord.longitude}
          caption={{ text: '선택한 장소' }}
        />
      ) : null}
    </NaverMapView>
  );
}

const styles = StyleSheet.create({
  map: {
    flex: 1,
  },
});
