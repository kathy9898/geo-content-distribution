'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import {
  Button, Card, Input, Spin, Typography, Segmented, message, Space, Descriptions, Alert,
} from 'antd';
import {
  ArrowLeftOutlined, FormatPainterOutlined, SaveOutlined, ImportOutlined, EditOutlined,
} from '@ant-design/icons';
import { marked } from 'marked';
import type { GzhThemeId, GzhThemeMeta, GzhValidationResult, GzhArticleType } from '@/types/gzh';
import GzhThemePicker from '@/components/GzhThemePicker';
import GzhValidationReport from '@/components/GzhValidationReport';
import { openGzhStandalonePreview } from '@/lib/gzh/standalone-preview';

const { Title, Text, Paragraph } = Typography;

function renderMarkdown(md: string): string {
  const html = marked.parse(md) as string;
  return html.replace(/feishu-image:\/\/([\w]+)/g, '/api/feishu-image/$1');
}

function GzhFormatEditorInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const source = searchParams.get('source') as 'feishu' | 'markdown' | null;

  // 状态
  const [themes, setThemes] = useState<GzhThemeMeta[]>([]);
  const [selectedTheme, setSelectedTheme] = useState<GzhThemeId | null>(null);
  const [markdown, setMarkdown] = useState('');
  const [title, setTitle] = useState('');
  const [bodyMode, setBodyMode] = useState<'edit' | 'preview'>('edit');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generatedHtml, setGeneratedHtml] = useState('');
  const [validation, setValidation] = useState<GzhValidationResult | null>(null);
  const [articleType, setArticleType] = useState<GzhArticleType | null>(null);
  const [showRaw, setShowRaw] = useState(false);
  const [savedContentId, setSavedContentId] = useState<string | null>(null);

  // 从 sessionStorage 读取内容
  useEffect(() => {
    const storedMarkdown = sessionStorage.getItem('gzh-format-markdown') || '';
    const storedTitle = sessionStorage.getItem('gzh-format-title') || '';
    const storedSource = sessionStorage.getItem('gzh-format-source') || '';

    if (storedMarkdown) {
      setMarkdown(storedMarkdown);
      setTitle(storedTitle);
    }

    // 清理 sessionStorage（只读一次）
    sessionStorage.removeItem('gzh-format-markdown');
    sessionStorage.removeItem('gzh-format-title');
    sessionStorage.removeItem('gzh-format-source');
  }, []);

  // 加载主题列表
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
  }, []);

  // 生成排版
  const handleGenerate = async () => {
    if (!selectedTheme) return;
    if (!markdown.trim()) {
      message.warning('请先输入或导入 Markdown 正文');
      return;
    }
    setLoading(true);
    setGeneratedHtml('');
    setValidation(null);

    try {
      const res = await fetch('/api/gzh-format', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          themeId: selectedTheme,
          markdown,
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

      const opened = openGzhStandalonePreview(
        data.html,
        title || markdown.split('\n').find(l => l.trim())?.replace(/^#+\s*/, '').slice(0, 80) || '公众号排版预览'
      );
      if (opened) {
        message.success('已生成独立 HTML 预览页，右上角可复制到公众号');
      } else {
        message.warning('浏览器拦截了新窗口，请允许弹窗后重试');
      }
    } catch (error) {
      console.error('GZH format error:', error);
      message.error(error instanceof Error ? error.message : '生成失败');
    } finally {
      setLoading(false);
    }
  };

  // 保存为主文
  const handleSave = async () => {
    if (!markdown.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/contents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title || markdown.split('\n').find(l => l.trim())?.replace(/^#+\s*/, '').slice(0, 80) || '未命名文章',
          body: markdown,
          brandName: '',
          keywords: [],
          targetAudience: '',
          references: [],
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || '保存失败');
      }
      const data = await res.json();
      setSavedContentId(data.id);
      message.success('已保存为主文');
    } catch (error) {
      message.error(error instanceof Error ? error.message : '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const sourceLabel = source === 'feishu' ? '飞书导入' : 'Markdown 粘贴';
  const SourceIcon = source === 'feishu' ? ImportOutlined : EditOutlined;

  return (
    <div style={{ padding: '0 24px 24px', maxWidth: 1400, margin: '0 auto' }}>
      {/* 头部 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => router.push('/gzh-format')}>
          返回
        </Button>
        <Title level={4} style={{ margin: 0 }}>
          <FormatPainterOutlined /> 公众号排版 — {sourceLabel}
        </Title>
      </div>

      <div style={{ display: 'flex', gap: 24 }}>
        {/* 左栏：控制面板 */}
        <div style={{ width: 420, flexShrink: 0 }}>
          {/* 内容来源信息 */}
          <Card
            size="small"
            title={<span><SourceIcon /> 内容来源：{sourceLabel}</span>}
            style={{ marginBottom: 16 }}
          >
            {title && (
              <Descriptions size="small" column={1}>
                <Descriptions.Item label="标题">{title}</Descriptions.Item>
              </Descriptions>
            )}
            <Paragraph type="secondary" style={{ fontSize: 12, marginBottom: 8 }}>
              Markdown 正文（可编辑）
            </Paragraph>
            <div style={{ marginBottom: 8 }}>
              <Segmented
                size="small"
                options={[
                  { label: '编辑', value: 'edit' },
                  { label: '预览', value: 'preview' },
                ]}
                value={bodyMode}
                onChange={(v) => setBodyMode(v as 'edit' | 'preview')}
              />
            </div>
            {bodyMode === 'edit' ? (
              <Input.TextArea
                rows={10}
                value={markdown}
                onChange={(e) => setMarkdown(e.target.value)}
                style={{ fontFamily: 'monospace', fontSize: 12 }}
                placeholder="在此编辑 Markdown 正文..."
              />
            ) : (
              <div
                className="markdown-preview"
                style={{
                  minHeight: 200,
                  maxHeight: 400,
                  overflowY: 'auto',
                  padding: '8px 12px',
                  border: '1px solid #d9d9d9',
                  borderRadius: 6,
                  background: markdown ? '#fff' : '#fafafa',
                  fontSize: 13,
                }}
                dangerouslySetInnerHTML={{
                  __html: markdown ? renderMarkdown(markdown) : '<span style="color:#bfbfbf">暂无内容</span>',
                }}
              />
            )}
          </Card>

          {/* 主题选择 */}
          <Card size="small" title="选择排版主题" style={{ marginBottom: 16 }}>
            <GzhThemePicker
              themes={themes}
              selected={selectedTheme}
              onSelect={setSelectedTheme}
            />
          </Card>

          {/* 生成按钮 */}
          <Button
            type="primary"
            size="large"
            block
            loading={loading}
            disabled={!selectedTheme || !markdown.trim()}
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

          {/* 保存为主文 */}
          {generatedHtml && (
            <div style={{ marginTop: 16 }}>
              {savedContentId ? (
                <Alert
                  type="success"
                  message="已保存为主文"
                  description={
                    <a onClick={() => router.push(`/contents/${savedContentId}`)}>
                      查看主文详情 →
                    </a>
                  }
                  showIcon
                />
              ) : (
                <Button
                  block
                  icon={<SaveOutlined />}
                  loading={saving}
                  onClick={handleSave}
                >
                  保存为主文
                </Button>
              )}
            </div>
          )}

          {/* 查看/隐藏原始 HTML */}
          {generatedHtml && (
            <div style={{ marginTop: 12 }}>
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
                  onClick={() => openGzhStandalonePreview(generatedHtml, title || '公众号排版预览')}
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

export default function GzhFormatEditorPage() {
  return (
    <Suspense fallback={<div style={{ textAlign: 'center', padding: 80 }}><Spin size="large" /></div>}>
      <GzhFormatEditorInner />
    </Suspense>
  );
}
