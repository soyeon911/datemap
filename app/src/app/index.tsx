import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
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
  type SavedDatePlace,
} from '@/db/date-cards';

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

  async function refreshDatePlaces() {
    const [count, places] = await Promise.all([countDateCards(db), getSavedDatePlaces(db)]);
    setDatePlaceCount(count);
    setSavedPlaces(places);
    setDatabaseState('ready');
  }

  function openAddPlaceModal() {
    setDate(today);
    setPlaceName('');
    setSelectedCoord(null);
    setPhotos([]);
    setCoverPhotoUri(null);
    setOneLineDiary('');
    setHashtagText('');
    setSaveMessage(null);
    setIsEditorVisible(true);
  }

  function closeAddPlaceModal() {
    setIsEditorVisible(false);
  }

  async function pickPhotos() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      setSaveMessage('사진을 추가하려면 사진 보관함 접근 권한이 필요합니다.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsMultipleSelection: true,
      mediaTypes: ['images'],
      quality: 0.85,
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

    await createDateCard(db, {
      placeName: trimmedPlaceName,
      latitude: selectedCoord.latitude,
      longitude: selectedCoord.longitude,
      date,
      oneLineDiary: oneLineDiary.trim() || null,
      hashtags,
      photoUris: photos.map((photo) => photo.uri),
      coverPhotoUri,
    });

    await refreshDatePlaces();
    setSaveMessage(null);
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
                setSelectedSavedPlace(matchedPlace ?? null);
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
              <Text style={styles.calendarIconText}>▣</Text>
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
                <SavedPlaceCard key={place.id} place={place} onPress={() => setSelectedSavedPlace(place)} />
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
                <TextLabel>새 데이트 장소</TextLabel>
                <TextTitle>장소 기록 추가</TextTitle>
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
                <TextBody>검색 API 연결 전까지 장소 이름을 직접 입력하고 지도에서 위치를 선택합니다.</TextBody>
                <TextInput
                  value={placeName}
                  onChangeText={setPlaceName}
                  placeholder="가게 이름이나 장소 이름"
                  placeholderTextColor="#9B9187"
                  style={styles.input}
                />
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
                <TextBody>여러 장을 선택하고, 한 장을 대표 사진으로 지정합니다.</TextBody>
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
                <TextButton>저장하고 돌아가기</TextButton>
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
                  onPress={() => Alert.alert('수정 준비 중', '다음 단계에서 저장된 기록 수정 폼을 연결합니다.')}>
                  <Text style={styles.detailActionText}>수정</Text>
                </Pressable>
                <Pressable style={styles.detailDeleteButton} onPress={() => confirmDeletePlace(selectedSavedPlace)}>
                  <Text style={styles.detailDeleteText}>삭제</Text>
                </Pressable>
              </View>

              {selectedSavedPlace.coverPhotoUri ? (
                <Image source={{ uri: selectedSavedPlace.coverPhotoUri }} style={styles.detailImage} />
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
    ...Array.from({ length: firstDay }, (_, index) => ({ key: `empty_${index}`, day: null })),
    ...Array.from({ length: daysInMonth }, (_, index) => ({ key: `day_${index + 1}`, day: index + 1 })),
  ];

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
        {cells.map((cell) => {
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
              {isActiveDate ? <View style={[styles.activeDateDot, isSelected && styles.activeDateDotSelected]} /> : null}
            </Pressable>
          );
        })}
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
    flex: 1,
    minHeight: 410,
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
    flex: 1,
    minHeight: 300,
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
    fontSize: 22,
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
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calendarCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1.25,
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
    gap: 12,
  },
  savedCardRow: {
    gap: 12,
    paddingRight: 18,
  },
  savedCard: {
    width: 266,
    overflow: 'hidden',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E7DED4',
  },
  savedCardImage: {
    width: '100%',
    height: 132,
  },
  savedCardImagePlaceholder: {
    height: 132,
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
    padding: 13,
    gap: 8,
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
  detailImage: {
    width: '100%',
    height: 260,
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
