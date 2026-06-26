import { NaverMapMarkerOverlay, NaverMapView } from '@mj-studio/react-native-naver-map';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

const HEART_MARKER_IMAGE = require('@/assets/images/map-heart-marker.png');

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
          image={HEART_MARKER_IMAGE}
          isForceShowIcon
          caption={{
            text: place.placeName,
            textSize: 11,
            color: '#3E3833',
            haloColor: '#FFFFFF',
            requestedWidth: 88,
          }}
          onTap={() => onSelectPlace?.(place)}
        />
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
});
