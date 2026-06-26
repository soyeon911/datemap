import { NaverMapMarkerOverlay, NaverMapView, type Coord } from '@mj-studio/react-native-naver-map';
import * as Location from 'expo-location';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

type DateMapViewProps = {
  style?: StyleProp<ViewStyle>;
  selectedCoord?: Coord | null;
  onSelectCoord?: (coord: Coord) => void;
};

export function DateMapView({ selectedCoord, onSelectCoord, style }: DateMapViewProps) {
  const [currentCoord, setCurrentCoord] = useState<Coord | null>(null);
  const [focusedCoord, setFocusedCoord] = useState<Coord | null>(null);
  const mapRegion = selectedCoord
    ? {
        latitude: selectedCoord.latitude,
        longitude: selectedCoord.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }
    : {
        latitude: focusedCoord?.latitude ?? currentCoord?.latitude ?? 37.5665,
        longitude: focusedCoord?.longitude ?? currentCoord?.longitude ?? 126.978,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };

  useEffect(() => {
    let isMounted = true;

    getCurrentCoord().then((coord) => {
      if (coord && isMounted) {
        setCurrentCoord(coord);
        setFocusedCoord(coord);
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  async function moveToCurrentLocation() {
    const coord = await getCurrentCoord();

    if (coord) {
      setCurrentCoord(coord);
      setFocusedCoord(coord);
    }
  }

  return (
    <View style={[styles.container, style]}>
      <NaverMapView
        style={styles.map}
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
      <Pressable accessibilityLabel="현위치로 이동" style={styles.currentLocationButton} onPress={moveToCurrentLocation}>
        <Text style={styles.currentLocationButtonText}>⌖</Text>
      </Pressable>
    </View>
  );
}

async function getCurrentCoord() {
  const permission = await Location.requestForegroundPermissionsAsync();

  if (permission.status !== Location.PermissionStatus.GRANTED) {
    return null;
  }

  const position = await Location.getCurrentPositionAsync({});

  return {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
  };
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  currentLocationButton: {
    position: 'absolute',
    right: 12,
    bottom: 12,
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderWidth: 1,
    borderColor: '#D8CEC3',
  },
  currentLocationButtonText: {
    color: '#A86873',
    fontSize: 25,
    fontWeight: '900',
    lineHeight: 28,
  },
});
