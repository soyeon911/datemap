import { SymbolView } from 'expo-symbols';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Recommendation = {
  type: '식당' | '카페' | '데이트 장소';
  title: string;
  description: string;
  searchHint: string;
};

export default function RecommendScreen() {
  const [area, setArea] = useState('');
  const [mood, setMood] = useState('');
  const [menu, setMenu] = useState('');
  const [isGenerated, setIsGenerated] = useState(false);

  const recommendations = useMemo(() => buildRecommendations(area, mood, menu), [area, menu, mood]);

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
          <Pressable style={styles.primaryButton} onPress={() => setIsGenerated(true)}>
            <Text style={styles.primaryButtonText}>추천 조합 만들기</Text>
          </Pressable>
        </View>

        <View style={styles.panel}>
          <Text style={styles.sectionTitle}>추천 기준</Text>
          <Text style={styles.body}>
            다음 단계에서는 네이버 지도 장소 검색을 기반으로 지역 내 식당, 카페, 데이트 장소를 찾고 메뉴와 최신 리뷰를
            참고해 후보를 정렬합니다.
          </Text>
        </View>

        {isGenerated ? (
          <View style={styles.resultList}>
            {recommendations.map((item) => (
              <View key={item.type} style={styles.resultCard}>
                <Text style={styles.resultType}>{item.type}</Text>
                <Text style={styles.resultTitle}>{item.title}</Text>
                <Text style={styles.resultDescription}>{item.description}</Text>
                <Text style={styles.searchHint}>{item.searchHint}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function buildRecommendations(area: string, mood: string, menu: string): Recommendation[] {
  const normalizedArea = area.trim() || '원하는 지역';
  const normalizedMood = mood.trim() || '따뜻한 분위기';
  const normalizedMenu = menu.trim() || '가볍게 먹기 좋은 메뉴';

  return [
    {
      type: '식당',
      title: `${normalizedArea} ${normalizedMenu} 식당`,
      description: `${normalizedMood} 데이트의 시작으로 적당한 식사 장소를 찾습니다.`,
      searchHint: `검색 후보: ${normalizedArea} ${normalizedMenu} 맛집`,
    },
    {
      type: '카페',
      title: `${normalizedArea} 대화하기 좋은 카페`,
      description: '식사 후 사진과 한 줄 일기를 남기기 좋은 카페를 이어서 추천합니다.',
      searchHint: `검색 후보: ${normalizedArea} ${normalizedMood} 카페`,
    },
    {
      type: '데이트 장소',
      title: `${normalizedArea} 산책/전시 코스`,
      description: '카페 전후로 이동하기 좋은 거리의 산책, 전시, 야경 장소를 함께 묶습니다.',
      searchHint: `검색 후보: ${normalizedArea} 데이트 코스`,
    },
  ];
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
    borderRadius: 10,
    backgroundColor: '#A86873',
    paddingVertical: 14,
  },
  primaryButtonText: {
    color: '#F8EFEC',
    fontSize: 15,
    fontWeight: '900',
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
  searchHint: {
    color: '#7A5057',
    fontSize: 13,
    fontWeight: '800',
  },
});
