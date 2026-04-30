import type { Category } from "@/types/news";
import { CATEGORIES } from "@/types/news";

export interface CategoryDescriptor {
  id: Category;
  description: string;
}

export const CATEGORY_DESCRIPTORS: CategoryDescriptor[] = [
  { id: "모델/기업", description: "신규 AI 모델 출시·기업 동향·인수합병·인프라" },
  { id: "연구", description: "논문·벤치마크·기술 발견·학계 발표" },
  { id: "규제·정책", description: "법안·정부 정책·규제 가이드라인·소송" },
  { id: "응용", description: "산업·기업 도입 사례·제품·서비스 출시" },
  { id: "기타", description: "위 4개에 해당하지 않는 모든 항목" },
];

export const CATEGORY_SET: ReadonlySet<Category> = new Set(CATEGORIES);

export function isCategory(value: string): value is Category {
  return CATEGORY_SET.has(value as Category);
}
