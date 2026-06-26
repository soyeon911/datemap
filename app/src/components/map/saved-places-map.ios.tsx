import { NaverMapMarkerOverlay, NaverMapView } from '@mj-studio/react-native-naver-map';
import { Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';

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
  const region = getMapRegion(places);

  return (
    <NaverMapView
      style={[styles.map, style]}
      region={region}
      animationDuration={350}
      isIndoorEnabled={false}
      isRotateGesturesEnabled={false}
      isTiltGesturesEnabled={false}>
      {places.map((place) => (
        <NaverMapMarkerOverlay
          key={place.id}
          latitude={place.latitude}
          longitude={place.longitude}
          width={34}
          height={34}
          anchor={{ x: 0.5, y: 0.5 }}
          caption={{
            text: place.placeName,
            textSize: 11,
            color: '#3E3833',
            haloColor: '#FFFFFF',
            requestedWidth: 88,
          }}
          onTap={() => onSelectPlace?.(place)}>
          <Pressable collapsable={false} style={styles.heartMarker}>
            <Text style={styles.heartText}>♥</Text>
          </Pressable>
        </NaverMapMarkerOverlay>
      ))}
    </NaverMapView>
  );
}

function getMapRegion(places: SavedPlacesMapPlace[]) {
  if (places.length === 0) {
    return {
      latitude: 36.35,
      longitude: 127.8,
      latitudeDelta: 5.9,
      longitudeDelta: 6.6,
    };
  }

  const latitudes = places.map((place) => place.latitude);
  const longitudes = places.map((place) => place.longitude);
  const minLat = Math.min(...latitudes);
  const maxLat = Math.max(...latitudes);
  const minLng = Math.min(...longitudes);
  const maxLng = Math.max(...longitudes);
  const latitudeDelta = Math.max(0.03, (maxLat - minLat) * 1.6);
  const longitudeDelta = Math.max(0.03, (maxLng - minLng) * 1.6);

  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta,
    longitudeDelta,
  };
}

const styles = StyleSheet.create({
  map: {
    flex: 1,
  },
  heartMarker: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 17,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#F0A8B2',
    shadowColor: '#000000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  heartText: {
    color: '#E84D63',
    fontSize: 18,
    fontWeight: '900',
    lineHeight: 21,
  },
});
