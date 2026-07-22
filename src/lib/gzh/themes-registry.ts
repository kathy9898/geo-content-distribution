/**
 * gzh-design 主题注册表访问模块
 * 从编译好的 JSON 加载主题数据，提供类型安全的访问接口
 */
import type {
  GzhThemeId, GzhThemeMeta, GzhThemeRegistry, GzhThemesRegistryData,
  GzhComponent
} from '@/types/gzh';
import registryData from '@/data/gzh-themes-registry.json';

const data = registryData as unknown as GzhThemesRegistryData;

/** 获取所有主题的元信息列表（用于前端主题选择器） */
export function getThemeList(): GzhThemeMeta[] {
  return Object.values(data.themes).map(t => ({
    ...t.meta,
    previewImage: `/gzh-gallery/${t.meta.id}.html`,
  }));
}

/** 获取单个主题的完整注册表 */
export function getTheme(id: GzhThemeId): GzhThemeRegistry {
  const theme = data.themes[id];
  if (!theme) {
    throw new Error(`Theme not found: ${id}`);
  }
  return theme;
}

/** 获取通用组件库 */
export function getCommonComponents(): Record<string, GzhComponent> {
  return data.commonComponents;
}

/** 获取注册表版本 */
export function getRegistryVersion(): string {
  return data.version;
}

/** 检查主题 ID 是否有效 */
export function isValidThemeId(id: string): id is GzhThemeId {
  return id in data.themes;
}

/** 所有有效的主题 ID */
export const THEME_IDS: GzhThemeId[] = Object.keys(data.themes) as GzhThemeId[];
