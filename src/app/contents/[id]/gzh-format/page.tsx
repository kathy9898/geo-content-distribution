'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Button, Spin, Typography, Card,
} from 'antd';
import { ArrowLeftOutlined, FormatPainterOutlined } from '@ant-design/icons';
import type { GzhThemeId, GzhThemeMeta, GzhValidationResult, GzhArticleType } from '@/types/gzh';
import GzhThemePicker from '@/components/GzhThemePicker';
import GzhValidationReport from '@/components/GzhValidationReport';
import { openGzhStandalonePreview } from '@/lib/gzh/standalone-preview';

const { Title, Text } = Typography;

export default function GzhFormatPage() {
  const params = useParams();
  const router = useRouter();
  const contentId = params.id as string;

  // 状态
  const [themes, setThemes] = useState<GzhThemeMeta[]>([]);
  const [selectedTheme, setSelectedTheme] = useState<GzhThemeId | null>(null);
  const [articleTitle, setArticleTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [generatedHtml, setGeneratedHtml] = useState('');
  const [validation, setValidation] = useState<GzhValidationResult | null>(null);
  const [articleType, setArticleType] = useState<GzhArticleType | null>(null);
  const [showRaw, setShowRaw] = useState(false);

  // 加载主题列表和文章信息
  useEffect(() => {
    fetch('/api/gzh-themes')
      .then(res => res.json())
      .then(data => {
        setThemes(data.themes || []);
        if (data.themes?.length > 0) {
          setSelectedTheme(data.themes[0].id);
        }
      })
      .catch(console.error);

    // 获取文章标题
    fetch(`/api/contents/${contentId}`)
      .then(res => res.json())
      .then(data => {
        setArticleTitle(data.title || data.content?.title || '');
      })
      .catch(() => {});
  }, [contentId]);

  // 生成排版
  const handleGenerate = async () => {
    if (!selectedTheme) return;
    setLoading(true);
    setGeneratedHtml('');
    setValidation(null);

    try {
      const res = await fetch('/api/gzh-format', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentId,
          sourceType: 'raw',
          themeId: selectedTheme,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '生成失败');
      }

      const data = await res.json();
      setGeneratedHtml(data.html);
      setValidation(data.validation);
      setArticleType(data.articleType);

      const opened = openGzhStandalonePreview(data.html, articleTitle || '公众号排版预览');
      if (!opened) {
        alert('浏览器拦截了新窗口，请允许弹窗后重试');
      }
    } catch (error) {
      console.error('GZH format error:', error);
      alert(error instanceof Error ? error.message : '生成失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '0 24px 24px', maxWidth: 1400, margin: '0 auto' }}>
      {/* 头部 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => router.back()}>
          返回
        </Button>
        <Title level={4} style={{ margin: 0 }}>
          <FormatPainterOutlined /> 公众号排版
        </Title>
      </div>

      <div style={{ display: 'flex', gap: 24 }}>
        {/* 左栏：控制面板 */}
        <div style={{ width: 360, flexShrink: 0 }}>
          {/* 文章标题 */}
          <Card size="small" style={{ marginBottom: 16 }}>
            <Text strong style={{ fontSize: 14 }}>{articleTitle || '加载中...'}</Text>
          </Card>

          {/* 主题选择 */}
          <Card size="small" title="选择排版主题" style={{ marginBottom: 16 }}>
            {themes.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 16, color: '#999' }}>加载主题中...</div>
            ) : (
              <GzhThemePicker
                themes={themes}
                selected={selectedTheme}
                onSelect={setSelectedTheme}
              />
            )}
          </Card>

          {/* 生成按钮 */}
          <Button
            type="primary"
            size="large"
            block
            loading={loading}
            disabled={!selectedTheme}
            onClick={handleGenerate}
            icon={<FormatPainterOutlined />}
          >
            {loading ? 'AI 排版中...' : '生成排版'}
          </Button>

          {/* 校验报告 */}
          <GzhValidationReport validation={validation} />

          {/* 文章类型 */}
          {articleType && (
            <div style={{ marginTop: 12 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                检测文章类型：{articleType}
              </Text>
            </div>
          )}

          {/* 查看/隐藏原始 HTML */}
          {generatedHtml && (
            <div style={{ marginTop: 16 }}>
              <Button
                size="small"
                type="link"
                onClick={() => setShowRaw(!showRaw)}
              >
                {showRaw ? '隐藏' : '查看'}原始 HTML
              </Button>
              {showRaw && (
                <pre style={{
                  fontSize: 10, maxHeight: 300, overflow: 'auto',
                  background: '#f5f5f5', padding: 8, borderRadius: 4,
                  wordBreak: 'break-all', whiteSpace: 'pre-wrap',
                }}>
                  {generatedHtml}
                </pre>
              )}
            </div>
          )}
        </div>

        {/* 右栏：生成结果 */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <Spin spinning={loading} tip="AI 正在分析文章并生成排版...">
            <Card
              title="独立 HTML 预览页"
              extra={generatedHtml ? (
                <Button
                  type="primary"
                  size="small"
                  onClick={() => openGzhStandalonePreview(generatedHtml, articleTitle || '公众号排版预览')}
                >
                  重新打开
                </Button>
              ) : null}
            >
              <div style={{ minHeight: 240, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8c8c8c', textAlign: 'center' }}>
                {generatedHtml
                  ? '已生成独立 HTML 页面。页面右上角有复制按钮，复制的是公众号正文片段。'
                  : '点击左侧“生成排版”后，会自动打开独立 HTML 预览页。'}
              </div>
            </Card>
          </Spin>
        </div>
      </div>
    </div>
  );
}
