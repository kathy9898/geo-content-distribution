/**
 * GET /api/gzh-themes
 * 返回所有可用的公众号排版主题
 */
import { NextResponse } from 'next/server';
import { getThemeList, getRegistryVersion } from '@/lib/gzh/themes-registry';

export async function GET() {
  try {
    const themes = getThemeList();
    const version = getRegistryVersion();

    return NextResponse.json({
      themes,
      version,
    });
  } catch (error) {
    console.error('Failed to load gzh themes:', error);
    return NextResponse.json(
      { error: 'Failed to load themes' },
      { status: 500 }
    );
  }
}
