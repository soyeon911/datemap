import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { SymbolView } from 'expo-symbols';
import { useSQLiteContext } from 'expo-sqlite';
import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DateMapView } from '@/components/map/date-map-view';
import { SavedPlacesMap } from '@/components/map/saved-places-map';
import {
  countDateCards,
  createDateCard,
  deleteDatePlace,
  getSavedDatePlaces,
  updateDatePlace,
  type SavedDatePlace,
} from '@/db/date-cards';
import { searchNaverPlaces, type NaverPlaceSearchResult } from '@/services/naver-place-search';

type DatabaseState = 'checking' | 'ready' | 'failed';
type SelectedCoord = {
  latitude: number;
  longitude: number;
};
type SelectedPhoto = {
  uri: string;
};
type CalendarTarget = 'start' | 'end';
type DatePickerMode = 'range' | 'week';
type FilterPreset = 'all' | 'this_week' | 'this_month' | 'last_30_days';

const today = new Date().toISOString().slice(0, 10);
const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
const filterPresetLabels: Record<FilterPreset, string> = {
  all: '전체 기간',
  this_week: '이번 주',
  this_month: '이번 달',
  last_30_days: '최근 30일',
};

export default function HomeScreen() {
  const db = useSQLiteContext();
  const [databaseState, setDatabaseState] = useState<DatabaseState>('checking');
  const [datePlaceCount, setDatePlaceCount] = useState(0);
  const [selectedCoord, setSelectedCoord] = useState<SelectedCoord | null>(null);
  const [date, setDate] = useState(today);
  const [placeName, setPlaceName] = useState('');
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [selectedAddress, setSelectedAddress] = useState<string | null>(null);
  const [placeSearchQuery, setPlaceSearchQuery] = useState('');
  const [placeSearchResults, setPlaceSearchResults] = useState<NaverPlaceSearchResult[]>([]);
  const [placeSearchMessage, setPlaceSearchMessage] = useState<string | null>(null);
  const [isSearchingPlace, setIsSearchingPlace] = useState(false);
  const [photos, setPhotos] = useState<SelectedPhoto[]>([]);
  const [coverPhotoUri, setCoverPhotoUri] = useState<string | null>(null);
  const [oneLineDiary, setOneLineDiary] = useState('');
  const [hashtagText, setHashtagText] = useState('');
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [savedPlaces, setSavedPlaces] = useState<SavedDatePlace[]>([]);
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [calendarTarget, setCalendarTarget] = useState<CalendarTarget>('start');
  const [filterPreset, setFilterPreset] = useState<FilterPreset>('all');
  const [isFilterDropdownVisible, setIsFilterDropdownVisible] = useState(false);
  const [isDatePickerVisible, setIsDatePickerVisible] = useState(false);
  const [datePickerMode, setDatePickerMode] = useState<DatePickerMode>('range');
  const [isEditorVisible, setIsEditorVisible] = useState(false);
  const [selectedSavedPlace, setSelectedSavedPlace] = useState<SavedDatePlace | null>(null);
  const [editingDatePlace, setEditingDatePlace] = useState<SavedDatePlace | null>(null);
  const [detailPhotoIndex, setDetailPhotoIndex] = useState(0);
  const cardScrollRef = useRef<ScrollView | null>(null);
  const cardScrollIndexRef = useRef(0);

  const hashtags = useMemo(
    () =>
      hashtagText
        .split(/[,\s]+/)
        .map((tag) => tag.trim().replace(/^#/, ''))
        .filter(Boolean),
    [hashtagText]
  );

  const filteredPlaces = useMemo(() => {
    return savedPlaces.filter((place) => {
      if (filterStartDate && place.date < filterStartDate) {
        return false;
      }

      if (filterEndDate && place.date > filterEndDate) {
        return false;
      }

      return true;
    });
  }, [filterEndDate, filterStartDate, savedPlaces]);

  const activeDates = useMemo(() => Array.from(new Set(savedPlaces.map((place) => place.date))), [savedPlaces]);
  const filterLabel = useMemo(() => {
    if (filterStartDate && filterEndDate) {
      return `${filterStartDate} ~ ${filterEndDate}`;
    }

    if (filterStartDate) {
      return `${filterStartDate}부터`;
    }

    if (filterEndDate) {
      return `${filterEndDate}까지`;
    }

    return filterPresetLabels[filterPreset];
  }, [filterEndDate, filterPreset, filterStartDate]);

  const detailPhotoUris = useMemo(
    () => (selectedSavedPlace ? getOrderedPhotoUris(selectedSavedPlace) : []),
    [selectedSavedPlace]
  );

  useEffect(() => {
    let isMounted = true;

    async function loadDatabaseStatus() {
      try {
        const [count, places] = await Promise.all([countDateCards(db), getSavedDatePlaces(db)]);

        if (isMounted) {
          setDatePlaceCount(count);
          setSavedPlaces(places);
          setDatabaseState('ready');
        }
      } catch {
        if (isMounted) {
          setDatabaseState('failed');
        }
      }
    }

    loadDatabaseStatus();

    return () => {
      isMounted = false;
    };
  }, [db]);

  useEffect(() => {
    if (filteredPlaces.length < 2) {
      return;
    }

    const timer = setInterval(() => {
      cardScrollIndexRef.current = (cardScrollIndexRef.current + 1) % filteredPlaces.length;
      cardScrollRef.current?.scrollTo({
        x: cardScrollIndexRef.current * 278,
        animated: true,
      });
    }, 3400);

    return () => clearInterval(timer);
  }, [filteredPlaces.length]);

  useEffect(() => {
    if (!selectedSavedPlace || detailPhotoUris.length < 2) {
      return;
    }

    const timer = setInterval(() => {
      setDetailPhotoIndex((currentIndex) => (currentIndex + 1) % detailPhotoUris.length);
    }, 3200);

    return () => clearInterval(timer);
  }, [detailPhotoUris.length, selectedSavedPlace]);

  async function refreshDatePlaces() {
    const [count, places] = await Promise.all([countDateCards(db), getSavedDatePlaces(db)]);
    setDatePlaceCount(count);
    setSavedPlaces(places);
    setDatabaseState('ready');
  }

  function openAddPlaceModal() {
    setDate(today);
    setPlaceName('');
    setSelectedPlaceId(null);
    setSelectedAddress(null);
    setPlaceSearchQuery('');
    setPlaceSearchResults([]);
    setPlaceSearchMessage(null);
    setSelectedCoord(null);
    setPhotos([]);
    setCoverPhotoUri(null);
    setOneLineDiary('');
    setHashtagText('');
    setSaveMessage(null);
    setEditingDatePlace(null);
    setIsEditorVisible(true);
  }

  function closeAddPlaceModal() {
    setIsEditorVisible(false);
    setEditingDatePlace(null);
  }

  function openEditPlaceModal(place: SavedDatePlace) {
    setEditingDatePlace(place);
    setDate(place.date);
    setPlaceName(place.placeName);
    setSelectedPlaceId(null);
    setSelectedAddress(place.address);
    setPlaceSearchQuery(place.placeName);
    setPlaceSearchResults([]);
    setPlaceSearchMessage(null);
    setSelectedCoord({ latitude: place.latitude, longitude: place.longitude });
    const orderedPhotoUris = getOrderedPhotoUris(place);
    setPhotos(orderedPhotoUris.map((uri) => ({ uri })));
    setCoverPhotoUri(place.coverPhotoUri ?? orderedPhotoUris[0] ?? null);
    setOneLineDiary(place.oneLineDiary ?? '');
    setHashtagText(place.hashtags.map((tag) => `#${tag}`).join(' '));
    setSaveMessage(null);
    setSelectedSavedPlace(null);
    setIsEditorVisible(true);
  }

  async function pickPhotos() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      setSaveMessage('사진을 추가하려면 사진 보관함 접근 권한이 필요합니다.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsMultipleSelection: true,
      allowsEditing: false,
      mediaTypes: ['images'],
      selectionLimit: 0,
      orderedSelection: true,
      quality: 0.85,
      preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
      presentationStyle: ImagePicker.UIImagePickerPresentationStyle.FULL_SCREEN,
    });

    if (result.canceled) {
      return;
    }

    const nextPhotos = await Promise.all(
      result.assets.map(async (asset, index) => ({
        uri: await copyPhotoToAppStorage(asset.uri, index),
      }))
    );

    setPhotos((currentPhotos) => {
      const mergedPhotos = [...currentPhotos, ...nextPhotos];
      setCoverPhotoUri((currentCover) => currentCover ?? mergedPhotos[0]?.uri ?? null);

      return mergedPhotos;
    });
    setSaveMessage(`${nextPhotos.length}장의 사진을 앱 저장소에 추가했습니다.`);
  }

  async function saveDatePlace() {
    if (!selectedCoord) {
      setSaveMessage('지도에서 저장할 위치를 먼저 선택하세요.');
      return;
    }

    const trimmedPlaceName = placeName.trim();

    if (!trimmedPlaceName) {
      setSaveMessage('장소 이름을 입력하세요.');
      return;
    }

    const nextPlaceInput = {
      placeName: trimmedPlaceName,
      placeId: selectedPlaceId,
      address: selectedAddress,
      latitude: selectedCoord.latitude,
      longitude: selectedCoord.longitude,
      date,
      oneLineDiary: oneLineDiary.trim() || null,
      hashtags,
      photoUris: photos.map((photo) => photo.uri),
      coverPhotoUri,
    };

    if (editingDatePlace) {
      await updateDatePlace(db, editingDatePlace.id, nextPlaceInput);
    } else {
      await createDateCard(db, nextPlaceInput);
    }

    await refreshDatePlaces();
    setSaveMessage(null);
    setEditingDatePlace(null);
    setIsEditorVisible(false);
  }

  async function handleDeletePlace(place: SavedDatePlace) {
    await deleteDatePlace(db, place.id);
    setSelectedSavedPlace(null);
    await refreshDatePlaces();
  }

  function confirmDeletePlace(place: SavedDatePlace) {
    Alert.alert('기록 삭제', `${place.placeName} 기록을 삭제할까요?`, [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: () => {
          void handleDeletePlace(place);
        },
      },
    ]);
  }

  function selectFilterDate(nextDate: string) {
    setFilterPreset('all');
    if (calendarTarget === 'start') {
      setFilterStartDate(nextDate);
      if (filterEndDate && nextDate > filterEndDate) {
        setFilterEndDate(nextDate);
      }
      return;
    }

    setFilterEndDate(nextDate);
    if (filterStartDate && nextDate < filterStartDate) {
      setFilterStartDate(nextDate);
    }
  }

  const activeFilterDate = calendarTarget === 'start' ? filterStartDate || today : filterEndDate || today;

  function applyFilterPreset(preset: FilterPreset) {
    setFilterPreset(preset);
    setIsFilterDropdownVisible(false);

    if (preset === 'all') {
      setFilterStartDate('');
      setFilterEndDate('');
      return;
    }

    if (preset === 'this_week') {
      const range = getWeekRange(today);
      setFilterStartDate(range.start);
      setFilterEndDate(range.end);
      return;
    }

    if (preset === 'this_month') {
      const range = getMonthRange(today);
      setFilterStartDate(range.start);
      setFilterEndDate(range.end);
      return;
    }

    const startDate = new Date(`${today}T00:00:00`);
    startDate.setDate(startDate.getDate() - 29);
    setFilterStartDate(toDateString(startDate));
    setFilterEndDate(today);
  }

  function selectWeekFilter(nextDate: string) {
    const range = getWeekRange(nextDate);
    setFilterPreset('all');
    setFilterStartDate(range.start);
    setFilterEndDate(range.end);
  }

  function openPlaceDetail(place: SavedDatePlace) {
    setDetailPhotoIndex(0);
    setSelectedSavedPlace(place);
  }

  async function searchPlaces() {
    const query = placeSearchQuery.trim() || placeName.trim();

    if (!query) {
      setPlaceSearchMessage('검색할 장소 이름을 입력하세요.');
      return;
    }

    setIsSearchingPlace(true);
    setPlaceSearchMessage(null);

    try {
      const results = await searchNaverPlaces(query);
      setPlaceSearchResults(results);
      setPlaceSearchMessage(results.length > 0 ? `${results.length}개의 장소를 찾았습니다.` : '검색 결과가 없습니다.');
    } catch (error) {
      if (error instanceof Error && error.message === 'PLACE_SEARCH_PROXY_REQUIRED') {
        setPlaceSearchMessage('장소 검색 프록시 URL이 필요합니다. 직접 장소명 입력과 지도 선택은 계속 사용할 수 있습니다.');
      } else {
        setPlaceSearchMessage('장소 검색에 실패했습니다. 잠시 후 다시 시도하세요.');
      }
      setPlaceSearchResults([]);
    } finally {
      setIsSearchingPlace(false);
    }
  }

  function selectSearchedPlace(result: NaverPlaceSearchResult) {
    setSelectedPlaceId(result.id);
    setSelectedAddress(result.address);
    setPlaceName(result.name);
    setSelectedCoord({ latitude: result.latitude, longitude: result.longitude });
    setPlaceSearchMessage(`${result.name}을 선택했습니다.`);
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.mainScreen}>
        <View style={styles.header}>
          <View>
            <TextLabel>DateMap</TextLabel>
            <TextTitle>우리의 데이트 지도</TextTitle>
          </View>
          <View style={styles.statusBadge}>
            <TextBadge>{databaseState === 'ready' ? `${datePlaceCount} places` : databaseState}</TextBadge>
          </View>
        </View>

        <View style={styles.mainMapPanel}>
          <View style={styles.mapTopBar}>
            <View>
              <TextSectionTitle>대한민국 방문 지도</TextSectionTitle>
              <TextBody>{filteredPlaces.length}곳의 기록</TextBody>
            </View>
            <Pressable
              style={styles.clearFilterButton}
              onPress={() => applyFilterPreset('all')}>
              <TextSecondaryButton>전체</TextSecondaryButton>
            </Pressable>
          </View>

          <View style={styles.mainNaverMapPanel}>
            <SavedPlacesMap
              places={filteredPlaces}
              onSelectPlace={(place) => {
                const matchedPlace = filteredPlaces.find((savedPlace) => savedPlace.id === place.id);
                if (matchedPlace) {
                  openPlaceDetail(matchedPlace);
                }
              }}
            />
            {filteredPlaces.length === 0 ? (
              <View style={styles.emptyMapOverlay}>
                <Text style={styles.emptyMapText}>저장된 장소가 없습니다.</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.periodPanel}>
            <Pressable
              style={styles.filterDropdownButton}
              onPress={() => setIsFilterDropdownVisible((isVisible) => !isVisible)}>
              <View>
                <Text style={styles.filterDropdownLabel}>날짜 필터</Text>
                <Text style={styles.filterDropdownValue}>{filterLabel}</Text>
              </View>
              <Text style={styles.dropdownChevron}>⌄</Text>
            </Pressable>
            <Pressable
              accessibilityLabel="날짜 필터 열기"
              style={styles.calendarIconButton}
              onPress={() => setIsDatePickerVisible(true)}>
              <SymbolView
                name="calendar"
                size={23}
                tintColor="#FFFFFF"
                weight="semibold"
                fallback={<Text style={styles.calendarIconText}>□</Text>}
              />
            </Pressable>
            {isFilterDropdownVisible ? (
              <View style={styles.filterDropdownMenu}>
                {(Object.keys(filterPresetLabels) as FilterPreset[]).map((preset) => (
                  <Pressable key={preset} style={styles.filterDropdownItem} onPress={() => applyFilterPreset(preset)}>
                    <Text style={styles.filterDropdownItemText}>{filterPresetLabels[preset]}</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
          </View>
        </View>

        <View style={styles.bottomDock}>
          {filteredPlaces.length > 0 ? (
            <ScrollView
              ref={cardScrollRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.savedCardRow}>
              {filteredPlaces.map((place) => (
                <SavedPlaceCard key={place.id} place={place} onPress={() => openPlaceDetail(place)} />
              ))}
            </ScrollView>
          ) : (
            <Pressable style={styles.emptySavedCard} onPress={openAddPlaceModal}>
              <TextBody>아직 저장된 데이트 장소가 없습니다.</TextBody>
            </Pressable>
          )}

          <Pressable style={styles.addPlaceButton} onPress={openAddPlaceModal}>
            <TextButton>장소 추가하기</TextButton>
          </Pressable>
        </View>
      </View>

      <Modal
        animationType="fade"
        transparent
        visible={isDatePickerVisible}
        onRequestClose={() => setIsDatePickerVisible(false)}>
        <View style={styles.pickerOverlay}>
          <View style={styles.pickerSheet}>
            <View style={styles.pickerHeader}>
              <View>
                <TextLabel>날짜 필터</TextLabel>
                <TextSectionTitle>기간 또는 주차 선택</TextSectionTitle>
              </View>
              <Pressable style={styles.modalCloseButton} onPress={() => setIsDatePickerVisible(false)}>
                <Text style={styles.modalCloseButtonText}>닫기</Text>
              </Pressable>
            </View>

            <View style={styles.pickerModeTabs}>
              <Pressable
                style={[styles.pickerModeTab, datePickerMode === 'range' && styles.pickerModeTabActive]}
                onPress={() => setDatePickerMode('range')}>
                <Text style={[styles.pickerModeTabText, datePickerMode === 'range' && styles.pickerModeTabTextActive]}>
                  기간
                </Text>
              </Pressable>
              <Pressable
                style={[styles.pickerModeTab, datePickerMode === 'week' && styles.pickerModeTabActive]}
                onPress={() => setDatePickerMode('week')}>
                <Text style={[styles.pickerModeTabText, datePickerMode === 'week' && styles.pickerModeTabTextActive]}>
                  주차
                </Text>
              </Pressable>
            </View>

            {datePickerMode === 'range' ? (
              <View style={styles.periodButtonRow}>
                <Pressable
                  style={[styles.periodButton, calendarTarget === 'start' && styles.periodButtonActive]}
                  onPress={() => setCalendarTarget('start')}>
                  <Text style={[styles.periodButtonText, calendarTarget === 'start' && styles.periodButtonTextActive]}>
                    {filterStartDate || '시작일'}
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.periodButton, calendarTarget === 'end' && styles.periodButtonActive]}
                  onPress={() => setCalendarTarget('end')}>
                  <Text style={[styles.periodButtonText, calendarTarget === 'end' && styles.periodButtonTextActive]}>
                    {filterEndDate || '종료일'}
                  </Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.weekHintBox}>
                <Text style={styles.weekHintText}>날짜를 선택하면 해당 주의 월요일부터 일요일까지 필터링합니다.</Text>
              </View>
            )}

            <CalendarPicker
              selectedDate={activeFilterDate}
              onSelectDate={datePickerMode === 'range' ? selectFilterDate : selectWeekFilter}
              activeDates={activeDates}
              rangeStartDate={filterStartDate}
              rangeEndDate={filterEndDate}
            />

            <View style={styles.pickerFooter}>
              <Pressable style={styles.secondaryFooterButton} onPress={() => applyFilterPreset('all')}>
                <TextSecondaryButton>초기화</TextSecondaryButton>
              </Pressable>
              <Pressable style={styles.confirmFooterButton} onPress={() => setIsDatePickerVisible(false)}>
                <TextButton>적용</TextButton>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal animationType="slide" visible={isEditorVisible} onRequestClose={closeAddPlaceModal}>
        <SafeAreaView style={styles.modalSafeArea}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.keyboardView}>
            <View style={styles.modalHeader}>
              <View>
                <TextLabel>{editingDatePlace ? '데이트 장소 수정' : '새 데이트 장소'}</TextLabel>
                <TextTitle>{editingDatePlace ? '장소 기록 수정' : '장소 기록 추가'}</TextTitle>
              </View>
              <Pressable style={styles.modalCloseButton} onPress={closeAddPlaceModal}>
                <Text style={styles.modalCloseButtonText}>닫기</Text>
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
              <Section>
                <TextSectionTitle>날짜 선택</TextSectionTitle>
                <CalendarPicker selectedDate={date} onSelectDate={setDate} />
              </Section>

              <View style={styles.mapPanel}>
                <DateMapView selectedCoord={selectedCoord} onSelectCoord={setSelectedCoord} />
              </View>

              <Section>
                <TextSectionTitle>장소 검색</TextSectionTitle>
                <TextBody>검색 결과를 선택하면 장소 이름, 주소, 좌표가 자동으로 입력됩니다.</TextBody>
                <View style={styles.searchRow}>
                  <TextInput
                    value={placeSearchQuery}
                    onChangeText={setPlaceSearchQuery}
                    placeholder="가게 이름이나 장소 이름 검색"
                    placeholderTextColor="#9B9187"
                    style={[styles.input, styles.searchInput]}
                    returnKeyType="search"
                    onSubmitEditing={() => {
                      void searchPlaces();
                    }}
                  />
                  <Pressable style={styles.searchButton} onPress={() => void searchPlaces()}>
                    <Text style={styles.searchButtonText}>{isSearchingPlace ? '검색중' : '검색'}</Text>
                  </Pressable>
                </View>
                {placeSearchMessage ? <Text style={styles.searchMessage}>{placeSearchMessage}</Text> : null}
                {placeSearchResults.length > 0 ? (
                  <View style={styles.searchResultList}>
                    {placeSearchResults.map((result) => (
                      <Pressable
                        key={result.id}
                        style={[
                          styles.searchResultItem,
                          selectedPlaceId === result.id && styles.searchResultItemSelected,
                        ]}
                        onPress={() => selectSearchedPlace(result)}>
                        <Text style={styles.searchResultTitle}>{result.name}</Text>
                        {result.address ? <Text style={styles.searchResultAddress}>{result.address}</Text> : null}
                        {result.category ? <Text style={styles.searchResultCategory}>{result.category}</Text> : null}
                      </Pressable>
                    ))}
                  </View>
                ) : null}
                <TextInput
                  value={placeName}
                  onChangeText={setPlaceName}
                  placeholder="선택된 장소 이름 또는 직접 입력"
                  placeholderTextColor="#9B9187"
                  style={styles.input}
                />
                {selectedAddress ? <TextBody>주소: {selectedAddress}</TextBody> : null}
                {selectedCoord ? (
                  <TextBody>
                    선택 위치: {selectedCoord.latitude.toFixed(5)}, {selectedCoord.longitude.toFixed(5)}
                  </TextBody>
                ) : null}
              </Section>

              <Section>
                <View style={styles.sectionHeader}>
                  <TextSectionTitle>사진</TextSectionTitle>
                  <Pressable style={styles.secondaryButton} onPress={pickPhotos}>
                    <TextSecondaryButton>사진 선택</TextSecondaryButton>
                  </Pressable>
                </View>
                <TextBody>사진을 한 장씩 추가하고, 한 장을 대표 사진으로 지정합니다.</TextBody>
                {photos.length > 0 ? (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photoRow}>
                    {photos.map((photo) => {
                      const isCover = photo.uri === coverPhotoUri;

                      return (
                        <Pressable
                          key={photo.uri}
                          style={[styles.photoTile, isCover && styles.coverPhotoTile]}
                          onPress={() => setCoverPhotoUri(photo.uri)}>
                          <Image source={{ uri: photo.uri }} style={styles.photoImage} />
                          <View style={[styles.coverBadge, isCover && styles.coverBadgeSelected]}>
                            <Text style={[styles.coverBadgeText, isCover && styles.coverBadgeTextSelected]}>
                              {isCover ? '대표' : '선택'}
                            </Text>
                          </View>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                ) : (
                  <View style={styles.emptyPhotoBox}>
                    <TextBody>선택한 사진이 없습니다.</TextBody>
                  </View>
                )}
              </Section>

              <Section>
                <TextSectionTitle>한 줄 일기</TextSectionTitle>
                <TextInput
                  value={oneLineDiary}
                  onChangeText={setOneLineDiary}
                  placeholder="오늘 이 장소에서의 기억을 한 줄로 남겨보세요."
                  placeholderTextColor="#9B9187"
                  style={[styles.input, styles.diaryInput]}
                  multiline
                />
              </Section>

              <Section>
                <TextSectionTitle>해시태그</TextSectionTitle>
                <TextInput
                  value={hashtagText}
                  onChangeText={setHashtagText}
                  placeholder="#카페 #성수 #비오는날"
                  placeholderTextColor="#9B9187"
                  style={styles.input}
                />
                {hashtags.length > 0 ? (
                  <View style={styles.hashtagRow}>
                    {hashtags.map((tag) => (
                      <View key={tag} style={styles.hashtagChip}>
                        <Text style={styles.hashtagText}>#{tag}</Text>
                      </View>
                    ))}
                  </View>
                ) : null}
              </Section>

              {saveMessage ? <Text style={styles.saveMessage}>{saveMessage}</Text> : null}
            </ScrollView>

            <View style={styles.modalFooter}>
              <Pressable style={styles.saveButton} onPress={saveDatePlace}>
                <TextButton>{editingDatePlace ? '수정하고 돌아가기' : '저장하고 돌아가기'}</TextButton>
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      <Modal
        animationType="fade"
        transparent
        visible={selectedSavedPlace !== null}
        onRequestClose={() => setSelectedSavedPlace(null)}>
        <View style={styles.detailOverlay}>
          {selectedSavedPlace ? (
            <View style={styles.detailSheet}>
              <View style={styles.detailActionBar}>
                <Pressable style={styles.detailActionButton} onPress={() => setSelectedSavedPlace(null)}>
                  <Text style={styles.detailActionText}>닫기</Text>
                </Pressable>
                <Pressable
                  style={styles.detailActionButton}
                  onPress={() => openEditPlaceModal(selectedSavedPlace)}>
                  <Text style={styles.detailActionText}>수정</Text>
                </Pressable>
                <Pressable style={styles.detailDeleteButton} onPress={() => confirmDeletePlace(selectedSavedPlace)}>
                  <Text style={styles.detailDeleteText}>삭제</Text>
                </Pressable>
              </View>

              {detailPhotoUris.length > 0 ? (
                <View style={styles.detailImageFrame}>
                  <Image source={{ uri: detailPhotoUris[detailPhotoIndex] }} style={styles.detailImage} />
                  {detailPhotoUris.length > 1 ? (
                    <>
                      <Pressable
                        accessibilityLabel="이전 사진"
                        style={[styles.photoNavButton, styles.photoNavButtonLeft]}
                        onPress={() =>
                          setDetailPhotoIndex(
                            (currentIndex) => (currentIndex - 1 + detailPhotoUris.length) % detailPhotoUris.length
                          )
                        }>
                        <Text style={styles.photoNavButtonText}>‹</Text>
                      </Pressable>
                      <Pressable
                        accessibilityLabel="다음 사진"
                        style={[styles.photoNavButton, styles.photoNavButtonRight]}
                        onPress={() =>
                          setDetailPhotoIndex((currentIndex) => (currentIndex + 1) % detailPhotoUris.length)
                        }>
                        <Text style={styles.photoNavButtonText}>›</Text>
                      </Pressable>
                      <View style={styles.photoPager}>
                        {detailPhotoUris.map((uri, index) => (
                          <Pressable
                            key={`${uri}_${index}`}
                            accessibilityLabel={`${index + 1}번째 사진 보기`}
                            style={[styles.photoPagerDot, index === detailPhotoIndex && styles.photoPagerDotActive]}
                            onPress={() => setDetailPhotoIndex(index)}
                          />
                        ))}
                      </View>
                    </>
                  ) : null}
                </View>
              ) : (
                <View style={styles.detailImagePlaceholder}>
                  <Text style={styles.savedCardImagePlaceholderText}>대표 사진 없음</Text>
                </View>
              )}

              <View style={styles.detailContent}>
                <Text style={styles.detailTitle}>{selectedSavedPlace.placeName}</Text>
                <Text style={styles.detailDate}>{selectedSavedPlace.date}</Text>
                <Text style={styles.savedCardMeta}>사진 {selectedSavedPlace.photoCount}장 저장됨</Text>
                {selectedSavedPlace.oneLineDiary ? (
                  <Text style={styles.detailDiary}>{selectedSavedPlace.oneLineDiary}</Text>
                ) : null}
                {selectedSavedPlace.hashtags.length > 0 ? (
                  <View style={styles.savedHashtagRow}>
                    {selectedSavedPlace.hashtags.map((tag) => (
                      <View key={tag} style={styles.savedHashtagChip}>
                        <Text style={styles.savedHashtagText}>#{tag}</Text>
                      </View>
                    ))}
                  </View>
                ) : null}
              </View>
            </View>
          ) : null}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function CalendarPicker({
  selectedDate,
  onSelectDate,
  activeDates = [],
  rangeStartDate,
  rangeEndDate,
}: {
  selectedDate: string;
  onSelectDate: (date: string) => void;
  activeDates?: string[];
  rangeStartDate?: string;
  rangeEndDate?: string;
}) {
  const safeSelectedDate = selectedDate || today;
  const selected = new Date(`${safeSelectedDate}T00:00:00`);
  const year = selected.getFullYear();
  const month = selected.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const cells = [
    ...Array.from({ length: firstDay }, (_, index) => ({ key: `empty_start_${index}`, day: null })),
    ...Array.from({ length: daysInMonth }, (_, index) => ({ key: `day_${index + 1}`, day: index + 1 })),
  ];
  const trailingEmptyCellCount = (7 - (cells.length % 7)) % 7;
  const paddedCells = [
    ...cells,
    ...Array.from({ length: trailingEmptyCellCount }, (_, index) => ({ key: `empty_end_${index}`, day: null })),
  ];
  const calendarWeeks = Array.from({ length: Math.ceil(paddedCells.length / 7) }, (_, weekIndex) =>
    paddedCells.slice(weekIndex * 7, weekIndex * 7 + 7)
  );

  return (
    <View style={styles.calendar}>
      <Text style={styles.calendarTitle}>
        {year}년 {month + 1}월
      </Text>
      <View style={styles.weekdayRow}>
        {weekdays.map((weekday) => (
          <Text key={weekday} style={styles.weekdayText}>
            {weekday}
          </Text>
        ))}
      </View>
      <View style={styles.calendarGrid}>
        {calendarWeeks.map((week, weekIndex) => (
          <View key={`week_${weekIndex}`} style={styles.calendarWeekRow}>
            {week.map((cell) => {
              if (!cell.day) {
                return <View key={cell.key} style={styles.calendarCell} />;
              }

              const cellDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(cell.day).padStart(2, '0')}`;
              const isSelected = cellDate === safeSelectedDate;
              const isInRange = Boolean(
                rangeStartDate && rangeEndDate && cellDate >= rangeStartDate && cellDate <= rangeEndDate
              );
              const isActiveDate = activeDates.includes(cellDate);

              return (
                <Pressable
                  key={cell.key}
                  style={[
                    styles.calendarCell,
                    isInRange && styles.calendarCellInRange,
                    isSelected && styles.calendarCellSelected,
                  ]}
                  onPress={() => onSelectDate(cellDate)}>
                  <Text style={[styles.calendarDayText, isSelected && styles.calendarDayTextSelected]}>{cell.day}</Text>
                  {isActiveDate ? (
                    <View style={[styles.activeDateDot, isSelected && styles.activeDateDotSelected]} />
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>
    </View>
  );
}

function SavedPlaceCard({ place, onPress }: { place: SavedDatePlace; onPress: () => void }) {
  return (
    <Pressable style={styles.savedCard} onPress={onPress}>
      {place.coverPhotoUri ? (
        <Image source={{ uri: place.coverPhotoUri }} style={styles.savedCardImage} />
      ) : (
        <View style={styles.savedCardImagePlaceholder}>
          <Text style={styles.savedCardImagePlaceholderText}>사진 없음</Text>
        </View>
      )}
      <View style={styles.savedCardContent}>
        <Text style={styles.savedCardTitle}>{place.placeName}</Text>
        <Text style={styles.savedCardDate}>{place.date}</Text>
        <Text style={styles.savedCardDiary} numberOfLines={2}>
          {place.oneLineDiary || '한 줄 일기가 없습니다.'}
        </Text>
        <Text style={styles.savedCardMeta}>사진 {place.photoCount}장</Text>
        {place.hashtags.length > 0 ? (
          <View style={styles.savedHashtagRow}>
            {place.hashtags.slice(0, 3).map((tag) => (
              <View key={tag} style={styles.savedHashtagChip}>
                <Text style={styles.savedHashtagText}>#{tag}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

function getOrderedPhotoUris(place: SavedDatePlace) {
  const photoUris = place.photoUris.length > 0 ? place.photoUris : place.coverPhotoUri ? [place.coverPhotoUri] : [];

  if (!place.coverPhotoUri) {
    return photoUris;
  }

  return [place.coverPhotoUri, ...photoUris.filter((uri) => uri !== place.coverPhotoUri)];
}

async function copyPhotoToAppStorage(uri: string, index: number) {
  if (!FileSystem.documentDirectory) {
    return uri;
  }

  const photoDirectory = `${FileSystem.documentDirectory}date-photos/`;
  const extension = getPhotoExtension(uri);
  const destinationUri = `${photoDirectory}${Date.now()}_${index}${extension}`;

  try {
    await FileSystem.makeDirectoryAsync(photoDirectory, { intermediates: true });
  } catch {
    // Directory may already exist.
  }

  try {
    await FileSystem.copyAsync({ from: uri, to: destinationUri });
    return destinationUri;
  } catch {
    return uri;
  }
}

function getPhotoExtension(uri: string) {
  const cleanUri = uri.split('?')[0];
  const match = cleanUri.match(/\.(jpe?g|png|heic|webp)$/i);

  return match?.[0] ?? '.jpg';
}

function getWeekRange(dateString: string) {
  const date = new Date(`${dateString}T00:00:00`);
  const day = date.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const start = new Date(date);
  start.setDate(date.getDate() + mondayOffset);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);

  return {
    start: toDateString(start),
    end: toDateString(end),
  };
}

function getMonthRange(dateString: string) {
  const date = new Date(`${dateString}T00:00:00`);
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);

  return {
    start: toDateString(start),
    end: toDateString(end),
  };
}

function toDateString(date: Date) {
  return date.toISOString().slice(0, 10);
}

function Section({ children }: { children: ReactNode }) {
  return <View style={styles.section}>{children}</View>;
}

function TextLabel({ children }: { children: ReactNode }) {
  return <Text style={styles.label}>{children}</Text>;
}

function TextTitle({ children }: { children: ReactNode }) {
  return <Text style={styles.title}>{children}</Text>;
}

function TextSectionTitle({ children }: { children: ReactNode }) {
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

function TextBody({ children }: { children: ReactNode }) {
  return <Text style={styles.body}>{children}</Text>;
}

function TextBadge({ children }: { children: ReactNode }) {
  return <Text style={styles.badgeText}>{children}</Text>;
}

function TextButton({ children }: { children: ReactNode }) {
  return <Text style={styles.buttonText}>{children}</Text>;
}

function TextSecondaryButton({ children }: { children: ReactNode }) {
  return <Text style={styles.secondaryButtonText}>{children}</Text>;
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F7F4EF',
  },
  mainScreen: {
    flex: 1,
    padding: 18,
    gap: 14,
    overflow: 'hidden',
  },
  keyboardView: {
    flex: 1,
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
    color: '#211D1A',
    fontSize: 28,
    fontWeight: '800',
    marginTop: 4,
  },
  statusBadge: {
    borderRadius: 999,
    backgroundColor: '#E8F1E9',
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  badgeText: {
    color: '#2E6543',
    fontSize: 12,
    fontWeight: '800',
  },
  mainMapPanel: {
    height: 426,
    flexGrow: 0,
    flexShrink: 0,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E7DED4',
    padding: 14,
    gap: 12,
  },
  mapTopBar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  clearFilterButton: {
    borderRadius: 999,
    backgroundColor: '#EEF4F6',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  section: {
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E7DED4',
    padding: 15,
    gap: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  sectionTitle: {
    color: '#211D1A',
    fontSize: 17,
    fontWeight: '800',
  },
  body: {
    color: '#625850',
    fontSize: 14,
    lineHeight: 20,
  },
  mainNaverMapPanel: {
    height: 250,
    flexShrink: 0,
    overflow: 'hidden',
    borderRadius: 10,
    backgroundColor: '#EAF1EC',
    borderWidth: 1,
    borderColor: '#D5E1D8',
  },
  emptyMapOverlay: {
    position: 'absolute',
    left: 18,
    right: 18,
    bottom: 18,
    alignItems: 'center',
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.92)',
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  emptyMapText: {
    color: '#6D776F',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  periodPanel: {
    position: 'relative',
    flexDirection: 'row',
    gap: 8,
    zIndex: 10,
  },
  filterDropdownButton: {
    flex: 1,
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#DED4C9',
    backgroundColor: '#FBFAF7',
    paddingHorizontal: 13,
    paddingVertical: 8,
  },
  filterDropdownLabel: {
    color: '#8B8076',
    fontSize: 11,
    fontWeight: '800',
  },
  filterDropdownValue: {
    color: '#211D1A',
    fontSize: 14,
    fontWeight: '800',
    marginTop: 2,
  },
  dropdownChevron: {
    color: '#625850',
    fontSize: 20,
    fontWeight: '800',
  },
  calendarIconButton: {
    width: 54,
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: '#276EF1',
  },
  calendarIconText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
  },
  filterDropdownMenu: {
    position: 'absolute',
    left: 0,
    right: 62,
    top: 62,
    zIndex: 20,
    overflow: 'hidden',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E7DED4',
    backgroundColor: '#FFFFFF',
  },
  filterDropdownItem: {
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: '#F1E9DE',
  },
  filterDropdownItemText: {
    color: '#3E3833',
    fontSize: 14,
    fontWeight: '800',
  },
  periodButtonRow: {
    flexDirection: 'row',
    gap: 8,
  },
  periodButton: {
    flex: 1,
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DED4C9',
    backgroundColor: '#FBFAF7',
    paddingVertical: 9,
  },
  periodButtonActive: {
    borderColor: '#276EF1',
    backgroundColor: '#EDF3FF',
  },
  periodButtonText: {
    color: '#625850',
    fontSize: 13,
    fontWeight: '800',
  },
  periodButtonTextActive: {
    color: '#276EF1',
  },
  calendar: {
    gap: 8,
  },
  calendarTitle: {
    color: '#211D1A',
    fontSize: 14,
    fontWeight: '800',
  },
  weekdayRow: {
    flexDirection: 'row',
  },
  weekdayText: {
    flex: 1,
    color: '#8B8076',
    fontSize: 11,
    fontWeight: '800',
    textAlign: 'center',
  },
  calendarGrid: {
    gap: 4,
  },
  calendarWeekRow: {
    flexDirection: 'row',
  },
  calendarCell: {
    flex: 1,
    minHeight: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarCellInRange: {
    backgroundColor: '#EAF1FF',
  },
  calendarCellSelected: {
    borderRadius: 8,
    backgroundColor: '#276EF1',
  },
  calendarDayText: {
    color: '#3E3833',
    fontSize: 13,
    fontWeight: '700',
  },
  calendarDayTextSelected: {
    color: '#FFFFFF',
  },
  activeDateDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#E84D63',
    marginTop: 2,
  },
  activeDateDotSelected: {
    backgroundColor: '#FFFFFF',
  },
  bottomDock: {
    flexGrow: 1,
    flexShrink: 1,
    justifyContent: 'flex-end',
    gap: 12,
    minHeight: 0,
  },
  savedCardRow: {
    gap: 12,
    paddingRight: 18,
  },
  savedCard: {
    width: 286,
    height: 272,
    overflow: 'hidden',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E7DED4',
  },
  savedCardImage: {
    width: '100%',
    height: 116,
  },
  savedCardImagePlaceholder: {
    height: 116,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEE7DF',
  },
  savedCardImagePlaceholderText: {
    color: '#7C7065',
    fontSize: 13,
    fontWeight: '800',
  },
  savedCardContent: {
    flex: 1,
    padding: 13,
    gap: 7,
  },
  savedCardTitle: {
    color: '#211D1A',
    fontSize: 17,
    fontWeight: '800',
  },
  savedCardDate: {
    color: '#7C7065',
    fontSize: 13,
    fontWeight: '700',
  },
  savedCardDiary: {
    minHeight: 36,
    color: '#3E3833',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
  savedCardMeta: {
    color: '#8B8076',
    fontSize: 12,
    fontWeight: '800',
  },
  savedHashtagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  savedHashtagChip: {
    borderRadius: 999,
    backgroundColor: '#F1E9DE',
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  savedHashtagText: {
    color: '#6F5143',
    fontSize: 12,
    fontWeight: '800',
  },
  emptySavedCard: {
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#D8CEC3',
    padding: 16,
    backgroundColor: '#FFFFFF',
  },
  addPlaceButton: {
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: '#276EF1',
    paddingVertical: 15,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  pickerOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(33,29,26,0.35)',
  },
  pickerSheet: {
    maxHeight: '86%',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    backgroundColor: '#FFFFFF',
    padding: 18,
    gap: 14,
  },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 14,
  },
  pickerModeTabs: {
    flexDirection: 'row',
    borderRadius: 10,
    backgroundColor: '#F1E9DE',
    padding: 4,
  },
  pickerModeTab: {
    flex: 1,
    alignItems: 'center',
    borderRadius: 8,
    paddingVertical: 10,
  },
  pickerModeTabActive: {
    backgroundColor: '#FFFFFF',
  },
  pickerModeTabText: {
    color: '#7C7065',
    fontSize: 14,
    fontWeight: '800',
  },
  pickerModeTabTextActive: {
    color: '#276EF1',
  },
  weekHintBox: {
    borderRadius: 10,
    backgroundColor: '#EEF4F6',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  weekHintText: {
    color: '#276173',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
  pickerFooter: {
    flexDirection: 'row',
    gap: 10,
  },
  secondaryFooterButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: '#EEF4F6',
    paddingVertical: 14,
  },
  confirmFooterButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: '#276EF1',
    paddingVertical: 14,
  },
  modalSafeArea: {
    flex: 1,
    backgroundColor: '#F7F4EF',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 16,
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 12,
  },
  modalCloseButton: {
    borderRadius: 999,
    backgroundColor: '#EEE7DF',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  modalCloseButtonText: {
    color: '#4F463E',
    fontSize: 13,
    fontWeight: '800',
  },
  modalContent: {
    paddingHorizontal: 18,
    gap: 14,
    paddingBottom: 22,
  },
  modalFooter: {
    padding: 18,
    backgroundColor: '#F7F4EF',
    borderTopWidth: 1,
    borderTopColor: '#E7DED4',
  },
  input: {
    minHeight: 46,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DED4C9',
    backgroundColor: '#FBFAF7',
    color: '#211D1A',
    paddingHorizontal: 13,
    paddingVertical: 10,
    fontSize: 15,
  },
  searchRow: {
    flexDirection: 'row',
    gap: 8,
  },
  searchInput: {
    flex: 1,
  },
  searchButton: {
    minWidth: 72,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: '#276EF1',
    paddingHorizontal: 12,
  },
  searchButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  searchMessage: {
    color: '#276173',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
  searchResultList: {
    overflow: 'hidden',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E7DED4',
    backgroundColor: '#FFFFFF',
  },
  searchResultItem: {
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: '#F1E9DE',
  },
  searchResultItemSelected: {
    backgroundColor: '#EDF3FF',
  },
  searchResultTitle: {
    color: '#211D1A',
    fontSize: 15,
    fontWeight: '800',
  },
  searchResultAddress: {
    color: '#625850',
    fontSize: 13,
    lineHeight: 18,
  },
  searchResultCategory: {
    color: '#276173',
    fontSize: 12,
    fontWeight: '800',
  },
  diaryInput: {
    minHeight: 92,
    textAlignVertical: 'top',
  },
  mapPanel: {
    height: 260,
    overflow: 'hidden',
    borderRadius: 10,
    backgroundColor: '#DDE7DF',
    borderWidth: 1,
    borderColor: '#C8D8CD',
  },
  secondaryButton: {
    borderRadius: 999,
    backgroundColor: '#EEF4F6',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  secondaryButtonText: {
    color: '#276173',
    fontSize: 13,
    fontWeight: '800',
  },
  photoRow: {
    gap: 10,
    paddingVertical: 2,
  },
  photoTile: {
    width: 104,
    height: 116,
    overflow: 'hidden',
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#ECE2D8',
    backgroundColor: '#F3ECE4',
  },
  coverPhotoTile: {
    borderColor: '#276EF1',
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  coverBadge: {
    position: 'absolute',
    left: 8,
    bottom: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.88)',
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  coverBadgeSelected: {
    backgroundColor: '#276EF1',
  },
  coverBadgeText: {
    color: '#4F5654',
    fontSize: 12,
    fontWeight: '800',
  },
  coverBadgeTextSelected: {
    color: '#FFFFFF',
  },
  emptyPhotoBox: {
    minHeight: 82,
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#D8CEC3',
    paddingHorizontal: 13,
  },
  hashtagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  hashtagChip: {
    borderRadius: 999,
    backgroundColor: '#F1E9DE',
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  hashtagText: {
    color: '#6F5143',
    fontSize: 13,
    fontWeight: '800',
  },
  saveMessage: {
    color: '#2E6543',
    fontSize: 14,
    fontWeight: '700',
    paddingHorizontal: 4,
  },
  saveButton: {
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: '#276EF1',
    paddingVertical: 15,
  },
  detailOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(33,29,26,0.35)',
  },
  detailSheet: {
    maxHeight: '82%',
    overflow: 'hidden',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    backgroundColor: '#FFFFFF',
  },
  detailActionBar: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 5,
    flexDirection: 'row',
    gap: 8,
  },
  detailActionButton: {
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.92)',
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
  detailActionText: {
    color: '#3E3833',
    fontSize: 13,
    fontWeight: '800',
  },
  detailDeleteButton: {
    borderRadius: 999,
    backgroundColor: '#FDECEF',
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
  detailDeleteText: {
    color: '#C9364E',
    fontSize: 13,
    fontWeight: '800',
  },
  detailImageFrame: {
    position: 'relative',
    height: 260,
    backgroundColor: '#EEE7DF',
  },
  detailImage: {
    width: '100%',
    height: '100%',
  },
  photoNavButton: {
    position: 'absolute',
    top: '44%',
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.88)',
  },
  photoNavButtonLeft: {
    left: 12,
  },
  photoNavButtonRight: {
    right: 12,
  },
  photoNavButtonText: {
    color: '#211D1A',
    fontSize: 28,
    fontWeight: '800',
    lineHeight: 30,
  },
  photoPager: {
    position: 'absolute',
    right: 14,
    bottom: 12,
    flexDirection: 'row',
    gap: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(33,29,26,0.28)',
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  photoPagerDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
  photoPagerDotActive: {
    width: 16,
    backgroundColor: '#FFFFFF',
  },
  detailImagePlaceholder: {
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEE7DF',
  },
  detailContent: {
    padding: 18,
    gap: 10,
  },
  detailTitle: {
    color: '#211D1A',
    fontSize: 24,
    fontWeight: '900',
  },
  detailDate: {
    color: '#7C7065',
    fontSize: 14,
    fontWeight: '800',
  },
  detailDiary: {
    color: '#3E3833',
    fontSize: 16,
    lineHeight: 23,
  },
});
