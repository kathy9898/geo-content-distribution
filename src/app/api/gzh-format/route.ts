/**
 * POST /api/gzh-format
 * 接收 Markdown + 主题 ID，返回排版后的公众号 HTML
 */
import { NextRequest, NextResponse } from 'next/server';
import type { GzhFormatRequest, GzhFormatResponse } from '@/types/gzh';
import { isValidThemeId } from '@/lib/gzh/themes-registry';
import { convertMarkdownToGzh } from '@/lib/gzh/converter';
import { runAiCreative } from '@/lib/gzh/ai-creative';
import { getContentDetail } from '@/lib/storage/contentRepository';

export async function POST(request: NextRequest) {
  try {
    const body: GzhFormatRequest = await request.json();
    const { contentId, sourceType, variantId, themeId, markdown: directMarkdown } = body;

    // 校验主题 ID
    if (!themeId || !isValidThemeId(themeId)) {
      return NextResponse.json(
        { error: `Invalid themeId: ${themeId}` },
        { status: 400 }
      );
    }

    // 选择 Markdown 来源：优先使用直接传入的 markdown，否则从 contentId 读取
    let markdown = '';

    if (directMarkdown?.trim()) {
      // 直接传入 Markdown 正文（飞书导入 / 粘贴 Markdown 渠道）
      markdown = directMarkdown;
    } else if (contentId) {
      // 从已有内容读取
      const detail = await getContentDetail(contentId);
      if (!detail) {
        return NextResponse.json(
          { error: `Content not found: ${contentId}` },
          { status: 404 }
        );
      }

      switch (sourceType) {
        case 'geo':
          markdown = detail.geoOptimization?.bodyMarkdown || detail.content.body;
          break;
        case 'variant':
          const variant = variantId
            ? detail.variants.find(v => v.id === variantId)
            : detail.variants.find(v => v.platform === 'wechat');
          markdown = variant?.bodyMarkdown || detail.content.body;
          break;
        case 'raw':
        default:
          markdown = detail.content.body;
          break;
      }
    }

    if (!markdown.trim()) {
      return NextResponse.json(
        { error: 'No markdown content available' },
        { status: 400 }
      );
    }

    // 运行 AI 创意层
    let aiResult;
    try {
      aiResult = await runAiCreative(markdown, themeId);
    } catch (error) {
      console.error('AI creative layer failed, using defaults:', error);
      aiResult = undefined;
    }

    // 转换
    const result = convertMarkdownToGzh({
      markdown,
      themeId,
      aiResult,
    });

    const response: GzhFormatResponse = {
      html: result.html,
      validation: result.validation,
      articleType: result.articleType,
      themeUsed: result.themeUsed,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('GZH format error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
