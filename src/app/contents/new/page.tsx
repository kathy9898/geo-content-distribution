"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { marked } from "marked";
import { Alert, Button, Card, Form, Input, message, Segmented, Space, Tabs } from "antd";
import AppShell, { PageTitle } from "@/components/AppShell";

function renderMarkdown(md: string): string {
  const html = marked.parse(md) as string;
  return html.replace(/feishu-image:\/\/([\w]+)/g, "/api/feishu-image/$1");
}

export default function NewContentPage() {
  const [loading, setLoading] = useState(false);
  const [feishuLoading, setFeishuLoading] = useState(false);
  const [bodyValue, setBodyValue] = useState("");
  const [bodyMode, setBodyMode] = useState<"edit" | "preview">("edit");
  const router = useRouter();

  const onFinish = async (values: Record<string, string>) => {
    setLoading(true);
    try {
      const res = await fetch("/api/contents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
          body: bodyValue || values.body,
          keywords: values.keywords,
          references: values.references,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "创建失败");
      }
      const data = await res.json();
      message.success("主文已创建");
      router.push(`/contents/${data.id}`);
    } catch (error) {
      message.error(error instanceof Error ? error.message : "创建失败");
    } finally {
      setLoading(false);
    }
  };

  const importFeishu = async (values: Record<string, string>) => {
    setFeishuLoading(true);
    try {
      const res = await fetch("/api/contents/import-feishu", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
          keywords: values.keywords,
          references: values.references,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "飞书导入失败");
      message.success("飞书文章已导入");
      router.push(`/contents/${data.id}`);
    } catch (error) {
      message.error(error instanceof Error ? error.message : "飞书导入失败");
    } finally {
      setFeishuLoading(false);
    }
  };

  return (
    <AppShell>
      <PageTitle title="新建主文" description="支持手动粘贴主文，也可以直接从团队飞书文档导入。" />
      <Card>
        <Tabs
          defaultActiveKey="manual"
          items={[
            {
              key: "manual",
              label: "手动录入",
              children: (
                <Form layout="vertical" onFinish={onFinish} initialValues={{ brandName: "", targetAudience: "", callToAction: "" }}>
                  <Form.Item name="title" label="标题" rules={[{ required: true, message: "请输入标题" }]}>
                    <Input placeholder="例如：GEO 内容分发中台如何提升品牌曝光" />
                  </Form.Item>
                  <Form.Item
                    label="正文"
                    required
                    extra="支持 Markdown 格式，可切换预览查看渲染效果"
                  >
                    <div style={{ marginBottom: 8 }}>
                      <Segmented
                        size="small"
                        options={[
                          { label: "编辑", value: "edit" },
                          { label: "预览", value: "preview" },
                        ]}
                        value={bodyMode}
                        onChange={(v) => setBodyMode(v as "edit" | "preview")}
                      />
                    </div>
                    {bodyMode === "edit" ? (
                      <Input.TextArea
                        rows={16}
                        placeholder="粘贴主文全文，支持 Markdown 格式"
                        value={bodyValue}
                        onChange={(e) => setBodyValue(e.target.value)}
                      />
                    ) : (
                      <div
                        className="markdown-preview"
                        style={{
                          minHeight: 300,
                          maxHeight: 600,
                          overflowY: "auto",
                          padding: "12px 16px",
                          border: "1px solid #d9d9d9",
                          borderRadius: 6,
                          background: bodyValue ? "#fff" : "#fafafa",
                        }}
                        dangerouslySetInnerHTML={{
                          __html: bodyValue ? renderMarkdown(bodyValue) : '<span style="color:#bfbfbf">暂无内容，请切换到编辑模式输入正文</span>',
                        }}
                      />
                    )}
                  </Form.Item>
                  <Form.Item
                    name="brandName"
                    label="品牌名"
                    extra="告诉 AI 文章要围绕哪个品牌/产品，GEO 调优时会主动解释品牌，避免品牌存在感太弱。"
                  >
                    <Input placeholder="例如：UCloud" />
                  </Form.Item>
                  <Form.Item
                    name="keywords"
                    label="核心关键词"
                    extra="告诉 AI 这篇文章要覆盖哪些核心搜索词，用于优化标题、段落、小标题、Q&A 和标签。"
                  >
                    <Input placeholder="多个关键词用逗号分隔" />
                  </Form.Item>
                  <Form.Item name="targetAudience" label="目标用户">
                    <Input placeholder="例如：市场团队、内容运营、增长负责人" />
                  </Form.Item>
                  <Form.Item name="references" label="参考资料">
                    <Input.TextArea rows={4} placeholder="多个参考资料用换行分隔" />
                  </Form.Item>
                  <Form.Item name="callToAction" label="CTA">
                    <Input placeholder="例如：欢迎预约演示" />
                  </Form.Item>
                  <Space>
                    <Button type="primary" htmlType="submit" loading={loading}>创建主文</Button>
                    <Button onClick={() => router.push("/")}>返回首页</Button>
                  </Space>
                </Form>
              ),
            },
            {
              key: "feishu",
              label: "飞书导入",
              children: (
                <Form layout="vertical" onFinish={importFeishu} initialValues={{ brandName: "ucloud，优刻得", url: "https://scnu335ljo6i.feishu.cn/wiki/YShOwqseYiLSwQkFjJ1cCuebnlg" }}>
                  <Alert
                    style={{ marginBottom: 16 }}
                    type="info"
                    showIcon
                    message="粘贴飞书文档链接，系统会读取文档内容并转换成 Markdown 主文。请确保文档已授权给飞书应用。"
                  />
                  <Form.Item name="url" label="飞书文档链接" rules={[{ required: true, message: "请输入飞书文档链接" }]}>
                    <Input placeholder="https://xxx.feishu.cn/docx/xxxx" />
                  </Form.Item>
                  <Form.Item
                    name="brandName"
                    label="品牌名"
                    extra="告诉 AI 文章要围绕哪个品牌/产品，GEO 调优时会主动解释品牌，避免品牌存在感太弱。"
                  >
                    <Input placeholder="例如：UCloud" />
                  </Form.Item>
                  <Form.Item
                    name="keywords"
                    label="核心关键词"
                    extra="告诉 AI 这篇文章要覆盖哪些核心搜索词，用于优化标题、段落、小标题、Q&A 和标签。"
                  >
                    <Input placeholder="多个关键词用逗号分隔" />
                  </Form.Item>
                  <Form.Item name="targetAudience" label="目标用户">
                    <Input placeholder="例如：市场团队、内容运营、增长负责人" />
                  </Form.Item>
                  <Form.Item name="references" label="补充参考资料">
                    <Input.TextArea rows={3} placeholder="多个参考资料用换行分隔，飞书链接会自动作为参考资料保存" />
                  </Form.Item>
                  <Form.Item name="callToAction" label="CTA">
                    <Input placeholder="例如：欢迎预约演示" />
                  </Form.Item>
                  <Space>
                    <Button type="primary" htmlType="submit" loading={feishuLoading}>从飞书导入</Button>
                    <Button onClick={() => router.push("/")}>返回首页</Button>
                  </Space>
                </Form>
              ),
            },
          ]}
        />
      </Card>
    </AppShell>
  );
}
