import { NaverMapMarkerOverlay, NaverMapPolygonOverlay, NaverMapView } from '@mj-studio/react-native-naver-map';
import * as Location from 'expo-location';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import type { Coord } from '@/data/korea-boundaries';

const HEART_MARKER_IMAGE = require('@/assets/images/map-heart-marker.png');

export type SavedPlacesMapPlace = {
  id: string;
  placeName: string;
  latitude: number;
  longitude: number;
};

export type SavedPlacesMapRegionBoundary = {
  key: string;
  rings: Coord[][];
};

type SavedPlacesMapProps = {
  places: SavedPlacesMapPlace[];
  style?: StyleProp<ViewStyle>;
  onSelectPlace?: (place: SavedPlacesMapPlace) => void;
  minRegionDelta?: number;
  markerSize?: number;
  regionBoundaries?: SavedPlacesMapRegionBoundary[];
};

export function SavedPlacesMap({
  places,
  style,
  onSelectPlace,
  minRegionDelta = 0.03,
  markerSize = 34,
  regionBoundaries = [],
}: SavedPlacesMapProps) {
  const [currentLocationRegion, setCurrentLocationRegion] = useState<MapRegion | null>(null);
  const [forcedRegion, setForcedRegion] = useState<MapRegion | null>(null);
  const region =
    forcedRegion ?? (places.length > 0 ? getMapRegion(places, minRegionDelta) : currentLocationRegion ?? getDefaultKoreaRegion());

  useEffect(() => {
    let isMounted = true;

    getCurrentLocationRegion().then((nextRegion) => {
      if (nextRegion && isMounted) {
        setCurrentLocationRegion(nextRegion);
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  async function moveToCurrentLocation() {
    const nextRegion = await getCurrentLocationRegion();

    if (nextRegion) {
      setCurrentLocationRegion(nextRegion);
      setForcedRegion(nextRegion);
    }
  }

  return (
    <View collapsable={false} style={[styles.container, style]}>
      <NaverMapView
        style={styles.map}
        region={region}
        animationDuration={350}
        isIndoorEnabled={false}
        isRotateGesturesEnabled={false}
        isTiltGesturesEnabled={false}>
        {regionBoundaries.flatMap((boundary) =>
          boundary.rings.map((ring, ringIndex) => (
            <NaverMapPolygonOverlay
              key={`${boundary.key}_${ringIndex}`}
              coords={ring}
              color="rgba(168,104,115,0.18)"
              outlineWidth={2}
              outlineColor="#A86873"
            />
          ))
        )}
        {places.map((place) => (
          <NaverMapMarkerOverlay
            key={place.id}
            latitude={place.latitude}
            longitude={place.longitude}
            width={markerSize}
            height={markerSize}
            anchor={{ x: 0.5, y: 0.5 }}
            image={HEART_MARKER_IMAGE}
            isForceShowIcon
            caption={{
              text: place.placeName,
              textSize: 11,
              color: '#3E3833',
              haloColor: '#F8EFEC',
              requestedWidth: 88,
            }}
            onTap={() => onSelectPlace?.(place)}
          />
        ))}
      </NaverMapView>
      <Pressable accessibilityLabel="현위치로 이동" style={styles.currentLocationButton} onPress={moveToCurrentLocation}>
        <Text style={styles.currentLocationButtonText}>⌖</Text>
      </Pressable>
    </View>
  );
}

async function getCurrentLocationRegion() {
  const permission = await Location.requestForegroundPermissionsAsync();

  if (permission.status !== Location.PermissionStatus.GRANTED) {
    return null;
  }

  const position = await Location.getCurrentPositionAsync({});

  return {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  };
}

type MapRegion = {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
};

function getDefaultKoreaRegion(): MapRegion {
  return {
    latitude: 36.35,
    longitude: 127.8,
    latitudeDelta: 5.9,
    longitudeDelta: 6.6,
  };
}

function getMapRegion(places: SavedPlacesMapPlace[], minDelta: number): MapRegion {
  const latitudes = places.map((place) => place.latitude);
  const longitudes = places.map((place) => place.longitude);
  const minLat = Math.min(...latitudes);
  const maxLat = Math.max(...latitudes);
  const minLng = Math.min(...longitudes);
  const maxLng = Math.max(...longitudes);
  const latitudeDelta = Math.max(minDelta, (maxLat - minLat) * 1.6);
  const longitudeDelta = Math.max(minDelta, (maxLng - minLng) * 1.6);

  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta,
    longitudeDelta,
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
