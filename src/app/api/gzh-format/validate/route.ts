/**
 * POST /api/gzh-format/validate
 * 校验公众号 HTML 合规性
 */
import { NextRequest, NextResponse } from 'next/server';
import type { GzhValidateResponse } from '@/types/gzh';
import { validateGzhHtml } from '@/lib/gzh/validator';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { html } = body;

    if (!html || typeof html !== 'string') {
      return NextResponse.json(
        { error: 'html field is required' },
        { status: 400 }
      );
    }

    const validation = validateGzhHtml(html);
    const response: GzhValidateResponse = { validation };

    return NextResponse.json(response);
  } catch (error) {
    console.error('GZH validate error:', error);
    return NextResponse.json(
      { error: 'Validation failed' },
      { status: 500 }
    );
  }
}
