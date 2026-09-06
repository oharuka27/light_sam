export interface VocabularyItem {
  id: string
  labelJa: string
  labelEn: string
}

// 運転シーンを想定した固定ボキャブラリ。CLIPゼロショット分類の候補ラベルとして使う。
// 一般的なImageNet的クラスではなく、道路交通シーンに寄せて選定している。
export const VOCABULARY: VocabularyItem[] = [
  { id: 'car', labelJa: '自動車', labelEn: 'a car' },
  { id: 'road', labelJa: '道路', labelEn: 'a road surface' },
  { id: 'guardrail', labelJa: 'ガードレール', labelEn: 'a guardrail' },
  { id: 'pedestrian', labelJa: '歩行者', labelEn: 'a pedestrian person' },
  { id: 'traffic_light', labelJa: '信号機', labelEn: 'a traffic light' },
  { id: 'road_sign', labelJa: '道路標識', labelEn: 'a road sign' },
  { id: 'crosswalk', labelJa: '横断歩道', labelEn: 'a crosswalk' },
  { id: 'tree', labelJa: '街路樹', labelEn: 'a tree' },
  { id: 'building', labelJa: '建物', labelEn: 'a building' },
  { id: 'sky', labelJa: '空', labelEn: 'the sky' },
  { id: 'bicycle', labelJa: '自転車', labelEn: 'a bicycle' },
  { id: 'motorcycle', labelJa: 'バイク', labelEn: 'a motorcycle' },
  { id: 'utility_pole', labelJa: '電柱', labelEn: 'a utility pole' },
  { id: 'lane_marking', labelJa: '車線・路面標示', labelEn: 'a lane marking on the road' },
  { id: 'sidewalk', labelJa: '歩道', labelEn: 'a sidewalk' },
]

export const OTHER_CHOICE = {
  id: 'other',
  labelJa: 'それ以外',
} as const
