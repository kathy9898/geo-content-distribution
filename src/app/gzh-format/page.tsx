"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert, Button, Card, Input, Select, Space, Spin, Typography, Upload, message,
} from "antd";
import {
  CopyOutlined, DownloadOutlined, FormatPainterOutlined, RobotOutlined, ThunderboltOutlined,
} from "@ant-design/icons";
import AppShell, { PageTitle } from "@/components/AppShell";
import {
  GZH_TEST_THEME_OPTIONS, GZH_TEST_THEMES, GzhTestThemeId, renderGzhTestArticle,
} from "@/lib/gzh-test/engine";

function stripCodeFence(md: string) {
  const trimmed = md.trim();
  const match = trimmed.match(/^```(?:markdown|md)?\s*\n([\s\S]*?)\n?```\s*$/);
  return match ? match[1].trim() : trimmed;
}

export default function GzhFormatTestPage() {
  const [themeId, setThemeId] = useState<GzhTestThemeId>("moyu");
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [source, setSource] = useState("");
  const [html, setHtml] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  const render = useCallback((md: string, theme: GzhTestThemeId, t: string, a: string) => {
    if (!md.trim()) {
      message.warning("请先粘贴或上传正文");
      return;
    }
    setHtml(renderGzhTestArticle({ markdown: md, themeId: theme, title: t, author: a }));
  }, []);

  useEffect(() => {
    if (html && source.trim()) {
      setHtml(renderGzhTestArticle({ markdown: source, themeId, title, author }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [themeId, title, author]);

  const handleAiNormalize = async () => {
    const text = source.trim();
    if (!text) {
      message.warning("请先粘贴或上传正文");
      return;
    }
    setAiLoading(true);
    setHtml("");
    try {
      const res = await fetch("/api/gzh-format/normalize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `AI 归一化失败（HTTP ${res.status}）`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        setSource(buffer);
      }

      const finalMd = stripCodeFence(buffer);
      setSource(finalMd);
      render(finalMd, themeId, title, author);
      message.success("AI 整理完成，已自动渲染预览");
    } catch (error) {
      message.error(error instanceof Error ? error.message : "AI 归一化失败");
    } finally {
      setAiLoading(false);
    }
  };

  const copyRich = async () => {
    const node = previewRef.current?.firstElementChild as HTMLElement | null;
    if (!node) {
      message.warning("请先生成预览");
      return;
    }
    const ok = () => message.success("已复制，去公众号后台 Ctrl/⌘+V 粘贴");

    const fallback = () => {
      const range = document.createRange();
      const selection = window.getSelection();
      if (!selection) return;
      range.selectNode(node);
      selection.removeAllRanges();
      selection.addRange(range);
      try {
        document.execCommand("copy");
        ok();
      } catch {
        message.error("复制失败，请在预览区手动全选复制");
      }
      selection.removeAllRanges();
    };

    if (navigator.clipboard && window.ClipboardItem) {
      try {
        await navigator.clipboard.write([
          new ClipboardItem({
            "text/html": new Blob([node.outerHTML], { type: "text/html" }),
            "text/plain": new Blob([node.innerText], { type: "text/plain" }),
          }),
        ]);
        ok();
        return;
      } catch {
        fallback();
        return;
      }
    }
    fallback();
  };

  const downloadHtml = () => {
    const node = previewRef.current?.firstElementChild as HTMLElement | null;
    if (!node) {
      message.warning("请先生成预览");
      return;
    }
    const blob = new Blob([node.outerHTML], { type: "text/html;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `公众号排版_${GZH_TEST_THEMES[themeId].name}.html`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const clearAll = () => {
    setSource("");
    setTitle("");
    setAuthor("");
    setHtml("");
  };

  return (
    <AppShell>
      <PageTitle
        title="公众号排版"
        description="AI 归一化文章结构 + 六主题排版引擎：粘贴正文 → AI 智能整理 → 选主题渲染 → 一键复制到公众号后台。"
      />

      <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
        <Card style={{ width: 430, flexShrink: 0 }} styles={{ body: { padding: 20 } }}>
          <Typography.Text strong>选择公众号风格</Typography.Text>
          <Select
            style={{ width: "100%", marginTop: 8 }}
            value={themeId}
            onChange={(v) => setThemeId(v as GzhTestThemeId)}
            options={GZH_TEST_THEME_OPTIONS.map((o) => ({ value: o.id, label: o.label }))}
          />
          <Typography.Paragraph type="secondary" style={{ fontSize: 12, marginTop: 6, marginBottom: 0 }}>
            每种风格自动套用标题、导读、章节编号、关键词下划线、引用块、代码块、签名区。
          </Typography.Paragraph>

          <Typography.Text strong style={{ display: "block", marginTop: 16 }}>文章标题</Typography.Text>
          <Input
            style={{ marginTop: 8 }}
            placeholder="不填则自动读取 # 一级标题"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          <Typography.Text strong style={{ display: "block", marginTop: 16 }}>作者 / 团队</Typography.Text>
          <Input
            style={{ marginTop: 8 }}
            placeholder="例如：卡兹克 / UCloud 团队"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
          />

          <Typography.Text strong style={{ display: "block", marginTop: 16 }}>上传 Markdown / TXT</Typography.Text>
          <Upload
            accept=".md,.txt,text/plain,text/markdown"
            showUploadList={false}
            beforeUpload={(file) => {
              const reader = new FileReader();
              reader.onload = () => {
                setSource(String(reader.result || ""));
                message.success("文件已读取，可点击 AI 智能整理或直接渲染");
              };
              reader.readAsText(file, "utf-8");
              return false;
            }}
          >
            <Button style={{ marginTop: 8 }}>选择文件</Button>
          </Upload>

          <Typography.Text strong style={{ display: "block", marginTop: 16 }}>粘贴正文</Typography.Text>
          <Input.TextArea
            style={{ marginTop: 8, lineHeight: 1.65 }}
            rows={14}
            placeholder={"支持 Markdown：# 标题、## 章节、### 小标题、> 引用、- 列表、```代码块```、**加粗**、==高亮==、++下划线++、![图片说明](图片URL)\n\n也可以直接粘贴纯文本，点「AI 智能整理排版」自动归一化。"}
            value={source}
            onChange={(e) => setSource(e.target.value)}
            disabled={aiLoading}
          />

          <Space wrap style={{ marginTop: 16 }}>
            <Button
              type="primary"
              icon={<RobotOutlined />}
              loading={aiLoading}
              onClick={handleAiNormalize}
            >
              {aiLoading ? "AI 正在智能排版中…" : "AI 智能整理排版"}
            </Button>
            <Button
              icon={<ThunderboltOutlined />}
              disabled={aiLoading}
              onClick={() => render(source, themeId, title, author)}
            >
              直接渲染
            </Button>
            <Button disabled={aiLoading} onClick={clearAll}>清空</Button>
          </Space>

          <Alert
            style={{ marginTop: 16 }}
            type="info"
            showIcon
            message="正确流程"
            description="生成预览 → 点右上角「复制到公众号」→ 打开公众号后台 → Ctrl/⌘+V。不要把 HTML 源码直接粘到公众号后台。"
          />
        </Card>

        <div style={{ flex: 1, minWidth: 0, position: "relative" }}>
          <Space style={{ position: "absolute", top: 16, right: 16, zIndex: 9 }}>
            <Button type="primary" icon={<CopyOutlined />} onClick={copyRich} disabled={!html}>
              复制到公众号
            </Button>
            <Button icon={<DownloadOutlined />} onClick={downloadHtml} disabled={!html}>
              下载 HTML
            </Button>
          </Space>

          <Card
            style={{ minHeight: 480 }}
            styles={{ body: { padding: "40px 24px" } }}
          >
            {aiLoading ? (
              <div style={{ textAlign: "center", padding: "80px 0" }}>
                <Spin size="large" />
                <Typography.Paragraph type="secondary" style={{ marginTop: 16 }}>
                  AI 正在智能排版中，左侧正文区可实时看到生成进度…
                </Typography.Paragraph>
              </div>
            ) : html ? (
              <div style={{ maxWidth: 720, margin: "0 auto", background: "#fff" }}>
                <div ref={previewRef} dangerouslySetInnerHTML={{ __html: html }} />
              </div>
            ) : (
              <div style={{ textAlign: "center", padding: "80px 0", color: "#9ca3af" }}>
                <FormatPainterOutlined style={{ fontSize: 40 }} />
                <Typography.Paragraph type="secondary" style={{ marginTop: 16 }}>
                  粘贴正文后点「AI 智能整理排版」或「直接渲染」，这里会生成公众号预览
                </Typography.Paragraph>
              </div>
            )}
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
