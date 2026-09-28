import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { ActivityIndicator, Linking, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DateMapView } from '@/components/map/date-map-view';
import { searchNaverPlaces, type NaverPlaceSearchResult } from '@/services/naver-place-search';

export default function RecommendScreen() {
  const [area, setArea] = useState('');
  const [mood, setMood] = useState('');
  const [menu, setMenu] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [results, setResults] = useState<NaverPlaceSearchResult[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<NaverPlaceSearchResult | null>(null);

  async function handleSearch() {
    const query = [area, menu, mood]
      .map((value) => value.trim())
      .filter(Boolean)
      .join(' ');

    if (!query) {
      setErrorMessage('지역, 분위기, 메뉴 중 하나는 입력해주세요.');
      return;
    }

    setIsSearching(true);
    setErrorMessage(null);
    setHasSearched(true);

    try {
      const nextResults = await searchNaverPlaces(query);
      setResults(nextResults);
    } catch (error) {
      setResults([]);
      setErrorMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setIsSearching(false);
    }
  }

  async function openInNaverMap(place: NaverPlaceSearchResult) {
    if (place.link) {
      try {
        await Linking.openURL(place.link);
        return;
      } catch {
        // fall through to the map app / web search below
      }
    }

    const appUrl = `nmap://place?lat=${place.latitude}&lng=${place.longitude}&name=${encodeURIComponent(
      place.name
    )}&appname=com.datemap`;

    try {
      await Linking.openURL(appUrl);
      return;
    } catch {
      // Naver Map isn't installed - fall back to a web search below.
    }

    const query = [place.name, place.address].filter(Boolean).join(' ');
    await Linking.openURL(`https://search.naver.com/search.naver?ie=utf8&query=${encodeURIComponent(query)}`);
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text style={styles.label}>Recommend</Text>
            <Text style={styles.title}>다음 데이트 추천</Text>
          </View>
          <View style={styles.headerIcon}>
            <SymbolView
              name="sparkles"
              size={23}
              tintColor="#A86873"
              weight="semibold"
              fallback={<Text style={styles.headerIconFallback}>✦</Text>}
            />
          </View>
        </View>

        <View style={styles.panel}>
          <Text style={styles.sectionTitle}>원하는 조건</Text>
          <TextInput
            value={area}
            onChangeText={setArea}
            placeholder="지역 예: 성수, 한남, 연남"
            placeholderTextColor="#9B9187"
            style={styles.input}
          />
          <TextInput
            value={mood}
            onChangeText={setMood}
            placeholder="분위기 예: 조용한, 감성적인, 산책하기 좋은"
            placeholderTextColor="#9B9187"
            style={styles.input}
          />
          <TextInput
            value={menu}
            onChangeText={setMenu}
            placeholder="먹고 싶은 메뉴 예: 파스타, 디저트, 한식"
            placeholderTextColor="#9B9187"
            style={styles.input}
          />
          <Pressable style={styles.primaryButton} onPress={handleSearch} disabled={isSearching}>
            {isSearching ? (
              <ActivityIndicator color="#F8EFEC" />
            ) : (
              <Text style={styles.primaryButtonText}>추천 받기</Text>
            )}
          </Pressable>
          {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
        </View>

        {hasSearched && !isSearching && !errorMessage && results.length === 0 ? (
          <View style={styles.panel}>
            <Text style={styles.body}>조건에 맞는 장소를 찾지 못했어요. 다른 지역이나 메뉴로 다시 시도해보세요.</Text>
          </View>
        ) : null}

        {results.length > 0 ? (
          <View style={styles.resultList}>
            {results.map((place) => (
              <Pressable key={place.id} style={styles.resultCard} onPress={() => setSelectedPlace(place)}>
                {place.category ? <Text style={styles.resultType}>{place.category}</Text> : null}
                <Text style={styles.resultTitle}>{place.name}</Text>
                {place.address ? <Text style={styles.resultDescription}>{place.address}</Text> : null}
              </Pressable>
            ))}
          </View>
        ) : null}
      </ScrollView>

      <Modal
        animationType="fade"
        transparent
        visible={selectedPlace !== null}
        onRequestClose={() => setSelectedPlace(null)}>
        <Pressable style={styles.detailOverlay} onPress={() => setSelectedPlace(null)}>
          {selectedPlace ? (
            <Pressable style={styles.detailSheet} onPress={(event) => event.stopPropagation()}>
              <View style={styles.detailHeader}>
                {selectedPlace.category ? <Text style={styles.resultType}>{selectedPlace.category}</Text> : null}
                <Pressable style={styles.detailCloseButton} onPress={() => setSelectedPlace(null)}>
                  <Text style={styles.detailCloseButtonText}>닫기</Text>
                </Pressable>
              </View>

              <Text style={styles.detailTitle}>{selectedPlace.name}</Text>

              <DateMapView
                style={styles.detailMap}
                selectedCoord={{ latitude: selectedPlace.latitude, longitude: selectedPlace.longitude }}
              />

              {selectedPlace.address ? (
                <Text style={styles.detailInfoRow}>📍 {selectedPlace.address}</Text>
              ) : null}

              {selectedPlace.phone ? (
                <Pressable onPress={() => Linking.openURL(`tel:${selectedPlace.phone}`)}>
                  <Text style={[styles.detailInfoRow, styles.detailPhone]}>📞 {selectedPlace.phone}</Text>
                </Pressable>
              ) : null}

              {selectedPlace.description ? (
                <Text style={styles.detailDescription}>{selectedPlace.description}</Text>
              ) : null}

              <Pressable style={styles.naverButton} onPress={() => openInNaverMap(selectedPlace)}>
                <Text style={styles.naverButtonText}>네이버에서 사진·리뷰 보기</Text>
              </Pressable>
            </Pressable>
          ) : null}
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#EADCD8',
  },
  content: {
    gap: 14,
    padding: 18,
    paddingBottom: 28,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 16,
  },
  label: {
    color: '#73685C',
    fontSize: 13,
    fontWeight: '700',
  },
  title: {
    color: '#342725',
    fontSize: 28,
    fontWeight: '900',
    marginTop: 4,
  },
  headerIcon: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    backgroundColor: '#F8EFEC',
    borderWidth: 1,
    borderColor: '#D8C4BE',
  },
  headerIconFallback: {
    color: '#A86873',
    fontSize: 21,
    fontWeight: '900',
  },
  panel: {
    gap: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D8C4BE',
    backgroundColor: '#F8EFEC',
    padding: 15,
  },
  sectionTitle: {
    color: '#342725',
    fontSize: 17,
    fontWeight: '900',
  },
  body: {
    color: '#625850',
    fontSize: 14,
    lineHeight: 20,
  },
  input: {
    minHeight: 46,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: '#D2BEB8',
    backgroundColor: '#F1E5E1',
    color: '#342725',
    paddingHorizontal: 13,
    paddingVertical: 10,
    fontSize: 15,
  },
  primaryButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    borderRadius: 10,
    backgroundColor: '#A86873',
    paddingVertical: 14,
  },
  primaryButtonText: {
    color: '#F8EFEC',
    fontSize: 15,
    fontWeight: '900',
  },
  errorText: {
    color: '#B3443C',
    fontSize: 13,
    fontWeight: '700',
  },
  resultList: {
    gap: 12,
  },
  resultCard: {
    gap: 7,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D8C4BE',
    backgroundColor: '#F8EFEC',
    padding: 15,
  },
  resultType: {
    color: '#A86873',
    fontSize: 12,
    fontWeight: '900',
  },
  resultTitle: {
    color: '#342725',
    fontSize: 18,
    fontWeight: '900',
  },
  resultDescription: {
    color: '#625850',
    fontSize: 14,
    lineHeight: 20,
  },
  detailOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(52, 39, 37, 0.45)',
  },
  detailSheet: {
    gap: 10,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    backgroundColor: '#FBF4F1',
    padding: 18,
    paddingBottom: 32,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  detailCloseButton: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#F1E5E1',
  },
  detailCloseButtonText: {
    color: '#625850',
    fontSize: 13,
    fontWeight: '800',
  },
  detailTitle: {
    color: '#342725',
    fontSize: 22,
    fontWeight: '900',
  },
  detailMap: {
    height: 180,
    borderRadius: 12,
    overflow: 'hidden',
  },
  detailInfoRow: {
    color: '#4A423C',
    fontSize: 14,
    lineHeight: 20,
  },
  detailPhone: {
    color: '#3C87F7',
    fontWeight: '700',
  },
  detailDescription: {
    color: '#625850',
    fontSize: 13,
    lineHeight: 19,
  },
  naverButton: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    minHeight: 46,
    borderRadius: 10,
    backgroundColor: '#03C75A',
  },
  naverButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
});
