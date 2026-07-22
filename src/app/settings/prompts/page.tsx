"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, Card, Collapse, Input, message, Space, Typography } from "antd";
import AppShell, { PageTitle } from "@/components/AppShell";
import type { PromptTemplateKey } from "@/lib/ai/promptTemplates";

type PromptTemplate = {
  key: PromptTemplateKey;
  label: string;
  content: string;
  updatedAt?: string;
};

export default function PromptsPage() {
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [editingKey, setEditingKey] = useState<string>();
  const [editingContent, setEditingContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();

  const loadTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/prompt-templates");
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "获取失败");
      setTemplates(data);
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : "获取 Prompt 模板失败");
    } finally {
      setLoading(false);
    }
  }, [messageApi]);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  function startEdit(template: PromptTemplate) {
    setEditingKey(template.key);
    setEditingContent(template.content);
  }

  function cancelEdit() {
    setEditingKey(undefined);
    setEditingContent("");
  }

  async function saveTemplate(key: PromptTemplate["key"]) {
    setSaving(true);
    try {
      const response = await fetch("/api/prompt-templates", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, content: editingContent }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "保存失败");
      setTemplates((items) => items.map((item) => (item.key === key ? data : item)));
      cancelEdit();
      messageApi.success("已保存");
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : "保存 Prompt 模板失败");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell>
      {contextHolder}
      <PageTitle title="Prompt 模板" description="可在线编辑 GEO 调优和各平台改写模板，保存后新生成内容会使用最新模板。" />
      <Card loading={loading}>
        <Collapse
          defaultActiveKey={["geo"]}
          items={templates.map((template) => ({
            key: template.key,
            label: template.label,
            children: editingKey === template.key ? (
              <Space direction="vertical" style={{ width: "100%" }} size="middle">
                <Input.TextArea
                  value={editingContent}
                  onChange={(event) => setEditingContent(event.target.value)}
                  rows={8}
                  placeholder="请输入 Prompt 模板内容"
                />
                <Space>
                  <Button type="primary" loading={saving} onClick={() => saveTemplate(template.key)}>保存</Button>
                  <Button onClick={cancelEdit}>取消</Button>
                </Space>
              </Space>
            ) : (
              <Space direction="vertical" style={{ width: "100%" }} size="middle">
                <Typography.Paragraph style={{ whiteSpace: "pre-wrap" }}>{template.content}</Typography.Paragraph>
                <Space>
                  <Button onClick={() => startEdit(template)}>编辑</Button>
                  {template.updatedAt && <Typography.Text type="secondary">更新时间：{new Date(template.updatedAt).toLocaleString()}</Typography.Text>}
                </Space>
              </Space>
            ),
          }))}
        />
      </Card>
    </AppShell>
  );
}
