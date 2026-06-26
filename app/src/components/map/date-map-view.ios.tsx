import { NaverMapMarkerOverlay, NaverMapView, type Coord } from '@mj-studio/react-native-naver-map';
import * as Location from 'expo-location';
import { useEffect, useState } from 'react';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

type DateMapViewProps = {
  style?: StyleProp<ViewStyle>;
  selectedCoord?: Coord | null;
  onSelectCoord?: (coord: Coord) => void;
};

export function DateMapView({ selectedCoord, onSelectCoord, style }: DateMapViewProps) {
  const [currentCoord, setCurrentCoord] = useState<Coord | null>(null);
  const mapRegion = selectedCoord
    ? {
        latitude: selectedCoord.latitude,
        longitude: selectedCoord.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }
    : {
        latitude: currentCoord?.latitude ?? 37.5665,
        longitude: currentCoord?.longitude ?? 126.978,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };

  useEffect(() => {
    let isMounted = true;

    async function loadCurrentLocation() {
      const permission = await Location.requestForegroundPermissionsAsync();

      if (permission.status !== Location.PermissionStatus.GRANTED) {
        return;
      }

      const position = await Location.getCurrentPositionAsync({});

      if (isMounted) {
        setCurrentCoord({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      }
    }

    loadCurrentLocation().catch(() => {});

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <NaverMapView
      style={[styles.map, style]}
      region={mapRegion}
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
