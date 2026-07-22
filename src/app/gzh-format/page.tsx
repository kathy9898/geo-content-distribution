"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card, List, Spin, Typography, Input, Empty, Tabs, Alert, Button, Form, Space, message,
} from "antd";
import {
  FormatPainterOutlined, FileTextOutlined, ImportOutlined, EditOutlined,
} from "@ant-design/icons";
import AppShell, { PageTitle } from "@/components/AppShell";

interface ContentItem {
  id: string;
  title: string;
  brandName?: string;
  createdAt: string;
  variantCount?: number;
}

export default function GzhFormatEntryPage() {
  const [contents, setContents] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [feishuLoading, setFeishuLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/contents")
      .then((res) => res.json())
      .then((data) => {
        setContents(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filtered = search
    ? contents.filter((c) => c.title.toLowerCase().includes(search.toLowerCase()))
    : contents;

  /** 飞书导入：获取 Markdown 后跳转到编辑器 */
  const handleFeishuImport = async (values: { url: string }) => {
    setFeishuLoading(true);
    try {
      const res = await fetch("/api/gzh-format/import-feishu", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: values.url }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "飞书导入失败");

      // 通过 sessionStorage 传递给编辑器页
      sessionStorage.setItem("gzh-format-markdown", data.markdown);
      sessionStorage.setItem("gzh-format-title", data.title);
      sessionStorage.setItem("gzh-format-source", "feishu");
      router.push("/gzh-format/editor?source=feishu");
    } catch (error) {
      message.error(error instanceof Error ? error.message : "飞书导入失败");
    } finally {
      setFeishuLoading(false);
    }
  };

  /** Markdown 粘贴：直接跳转到编辑器 */
  const handleMarkdownPaste = () => {
    const textarea = document.querySelector<HTMLTextAreaElement>("#gzh-markdown-input");
    const markdown = textarea?.value?.trim();
    if (!markdown) {
      message.warning("请先粘贴 Markdown 正文");
      return;
    }
    sessionStorage.setItem("gzh-format-markdown", markdown);
    sessionStorage.setItem("gzh-format-title", "");
    sessionStorage.setItem("gzh-format-source", "markdown");
    router.push("/gzh-format/editor?source=markdown");
  };

  return (
    <AppShell>
      <PageTitle title="公众号排版" description="选择内容来源，进入公众号排版编辑器。" />

      <Tabs
        defaultActiveKey="existing"
        size="large"
        items={[
          {
            key: "existing",
            label: (
              <span><FileTextOutlined /> 选择已有文章</span>
            ),
            children: (
              <Card>
                <Input.Search
                  placeholder="搜索文章标题"
                  allowClear
                  style={{ marginBottom: 16, maxWidth: 400 }}
                  onChange={(e) => setSearch(e.target.value)}
                />
                {loading ? (
                  <div style={{ textAlign: "center", padding: 40 }}><Spin size="large" /></div>
                ) : filtered.length === 0 ? (
                  <Empty description="暂无文章，请先新建主文或使用其他渠道" />
                ) : (
                  <List
                    dataSource={filtered}
                    renderItem={(item) => (
                      <List.Item
                        style={{ cursor: "pointer" }}
                        onClick={() => router.push(`/contents/${item.id}/gzh-format`)}
                      >
                        <List.Item.Meta
                          avatar={<FormatPainterOutlined style={{ fontSize: 20, color: "#fa541c" }} />}
                          title={item.title}
                          description={`${item.brandName || "未设品牌"} · ${new Date(item.createdAt).toLocaleDateString()}`}
                        />
                      </List.Item>
                    )}
                  />
                )}
              </Card>
            ),
          },
          {
            key: "feishu",
            label: (
              <span><ImportOutlined /> 飞书导入</span>
            ),
            children: (
              <Card>
                <Alert
                  style={{ marginBottom: 16 }}
                  type="info"
                  showIcon
                  message="粘贴飞书文档链接，系统会读取文档内容并转换成 Markdown，然后直接进入排版编辑器。"
                />
                <Form layout="vertical" onFinish={handleFeishuImport}>
                  <Form.Item
                    name="url"
                    label="飞书文档链接"
                    rules={[{ required: true, message: "请输入飞书文档链接" }]}
                  >
                    <Input
                      placeholder="https://xxx.feishu.cn/docx/xxxx 或 https://xxx.feishu.cn/wiki/xxxx"
                      size="large"
                    />
                  </Form.Item>
                  <Space>
                    <Button
                      type="primary"
                      size="large"
                      htmlType="submit"
                      loading={feishuLoading}
                      icon={<ImportOutlined />}
                    >
                      {feishuLoading ? "导入中..." : "导入并排版"}
                    </Button>
                  </Space>
                </Form>
              </Card>
            ),
          },
          {
            key: "markdown",
            label: (
              <span><EditOutlined /> 粘贴 Markdown</span>
            ),
            children: (
              <Card>
                <Alert
                  style={{ marginBottom: 16 }}
                  type="info"
                  showIcon
                  message="直接粘贴 Markdown 格式的正文内容，然后进入排版编辑器。"
                />
                <Input.TextArea
                  id="gzh-markdown-input"
                  rows={12}
                  placeholder={"# 文章标题\n\n正文内容，支持 **加粗**、## 章节、> 引用、- 列表等 Markdown 语法...\n\n## 第一章\n\n这里是正文内容。"}
                  style={{ fontFamily: "monospace", fontSize: 13, marginBottom: 16 }}
                />
                <Space>
                  <Button
                    type="primary"
                    size="large"
                    onClick={handleMarkdownPaste}
                    icon={<EditOutlined />}
                  >
                    开始排版
                  </Button>
                </Space>
              </Card>
            ),
          },
        ]}
      />
    </AppShell>
  );
}
