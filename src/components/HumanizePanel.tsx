"use client";

import { marked } from "marked";
import React from "react";
import { Alert, Button, Card, Col, Descriptions, Divider, List, message, Row, Select, Space, Tag, Typography } from "antd";
import type { ContentDetail, HumanizeIntensity, Platform, PlatformVariant, VariantTextSnapshot } from "@/types/geo";
import { platformLabels } from "@/types/geo";

const intensityLabels: Record<HumanizeIntensity, string> = {
  light: "轻度",
  medium: "中度",
  strong: "较强（推荐）",
};

const defaultIntensities: Record<Platform, HumanizeIntensity> = {
  zhihu: "medium",
  toutiao: "light",
  baijiahao: "light",
  csdn: "medium",
  cnblogs: "medium",
  juejin: "medium",
  sohu: "light",
  netease: "light",
  wechat: "strong",
  cto51: "medium",
  segmentfault: "medium",
};

function renderMarkdown(markdown: string) {
  return (marked.parse(markdown) as string).replace(/feishu-image:\/\/([\w]+)/g, "/api/feishu-image/$1");
}

function VersionPreview({ title, version }: { title: string; version: VariantTextSnapshot }) {
  return (
    <Card size="small" title={title} style={{ height: "100%" }}>
      <Typography.Title level={4}>{version.title}</Typography.Title>
      <Typography.Paragraph type="secondary">{version.summary}</Typography.Paragraph>
      <Space wrap>{version.tags.map((tag) => <Tag key={tag}>{tag}</Tag>)}</Space>
      <Divider />
      <div
        className="markdown-preview"
        style={{ maxHeight: 560, overflowY: "auto", paddingRight: 8, lineHeight: 1.8 }}
        dangerouslySetInnerHTML={{ __html: renderMarkdown(version.bodyMarkdown) }}
      />
    </Card>
  );
}

export default function HumanizePanel({ detail, reload }: { detail: ContentDetail; reload: () => Promise<void> }) {
  const initialVariant = detail.variants[0];
  const [variantId, setVariantId] = React.useState(initialVariant?.id || "");
  const [intensity, setIntensity] = React.useState<HumanizeIntensity>(initialVariant ? defaultIntensities[initialVariant.platform] : "medium");
 const [loading, setLoading] = React.useState<"generate" | "apply" | "restore">();
 const variant = detail.variants.find((item) => item.id === variantId) || initialVariant;
 const result = variant?.humanize;
  const blocking = result?.checks.some((check) => !check.passed && check.severity === "error") || false;
  const selectVariant = (id: string) => {
    setVariantId(id);
    const selected = detail.variants.find((item) => item.id === id);
    if (selected) setIntensity(defaultIntensities[selected.platform]);
  };

  const generate = async () => {
    if (!variant) return;
    setLoading("generate");
    try {
      const response = await fetch(`/api/variants/${variant.id}/humanize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intensity }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "真人感润色失败");
      message.success("真人感润色稿已生成，请对比后应用");
      await reload();
    } catch (error) {
      message.error(error instanceof Error ? error.message : "真人感润色失败");
    } finally {
      setLoading(undefined);
    }
  };

  const switchVersion = async (action: "apply" | "restore") => {
    if (!variant) return;
    setLoading(action);
    try {
      const response = await fetch(`/api/variants/${variant.id}/humanize`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "版本切换失败");
      message.success(action === "apply" ? "已应用真人感润色稿" : "已恢复平台原版");
      await reload();
    } catch (error) {
      message.error(error instanceof Error ? error.message : "版本切换失败");
    } finally {
      setLoading(undefined);
    }
  };

  if (!detail.variants.length) {
    return <Alert type="info" showIcon message="请先在第三步生成至少一个平台版本。" />;
  }

  return (
    <Space direction="vertical" size="large" style={{ width: "100%" }}>
      <Alert
        type="info"
        showIcon
        message="按活人感写作要求润色，不改 GEO 结构和平台调性"
        description="从文章已有材料出发重写开头、写完即收，清除冒号、破折号、翻案句和 AI 黑话，不编造经历和细节。平台原版始终保留；图片、链接、数字、代码块或品牌词缺失时禁止应用。想要更明显的风格，请选“较强”。"
      />
      <Card title="生成真人感润色稿">
        <Space wrap size="middle">
          <Select
            style={{ width: 360 }}
            value={variant?.id}
            onChange={selectVariant}
            options={detail.variants.map((item) => ({
              value: item.id,
              label: `${platformLabels[item.platform]}：${item.humanize?.status === "applied" ? "已应用润色" : item.humanize ? "待确认润色" : "未润色"}｜${item.title}`,
            }))}
          />
          <Select
            style={{ width: 150 }}
            value={intensity}
            onChange={setIntensity}
            options={(Object.keys(intensityLabels) as HumanizeIntensity[]).map((value) => ({ value, label: intensityLabels[value] }))}
          />
          <Button type="primary" loading={loading === "generate"} onClick={generate}>
            {result ? "重新生成润色稿" : "生成润色稿"}
          </Button>
          {result?.status === "applied" && <Tag color="green">当前发布稿：真人感润色版</Tag>}
          {result && result.status !== "applied" && <Tag color="blue">当前发布稿：平台原版</Tag>}
        </Space>
      </Card>

      {result && variant && (
        <>
          <Card title="质量与保护检查">
            <Space wrap style={{ marginBottom: 16 }}>
              <Tag color="magenta">真人感 {result.humanToneScore}</Tag>
              <Tag color="green">GEO 保真 {result.geoFidelityScore}</Tag>
              <Tag color="purple">平台调性 {result.platformToneScore}</Tag>
              <Tag color="cyan">事实一致 {result.factualConsistencyScore}</Tag>
              <Tag>{intensityLabels[result.intensity]}润色</Tag>
            </Space>
            {blocking && <Alert type="error" showIcon message="存在硬保护项错误，当前润色稿不能应用" style={{ marginBottom: 16 }} />}
            <Descriptions bordered size="small" column={2}>
              {result.checks.map((check) => (
                <Descriptions.Item key={check.key} label={check.label}>
                  <Tag color={check.passed ? "green" : check.severity === "error" ? "red" : "orange"}>
                    {check.passed ? "通过" : "需检查"}
                  </Tag>
                  {check.detail}
                </Descriptions.Item>
              ))}
            </Descriptions>
            {result.changeSummary.length > 0 && (
              <List size="small" header={<Typography.Text strong>主要调整</Typography.Text>} dataSource={result.changeSummary} renderItem={(item) => <List.Item>{item}</List.Item>} />
            )}
            {result.riskNotes.length > 0 && <Alert type="warning" showIcon message="AI 风险提示" description={result.riskNotes.join("；")} />}
            <Divider />
            <Space>
              <Button type="primary" disabled={blocking || result.status === "applied"} loading={loading === "apply"} onClick={() => switchVersion("apply")}>应用润色稿</Button>
              <Button disabled={result.status !== "applied"} loading={loading === "restore"} onClick={() => switchVersion("restore")}>恢复平台原版</Button>
              <Typography.Text type="secondary">应用后，第五步引用验证及复制、同步、发布都会使用润色版。</Typography.Text>
            </Space>
          </Card>
        <Row gutter={[16, 16]} align="stretch">
           <Col xs={24} xl={12}><VersionPreview title="平台原版" version={result.source} /></Col>
           <Col xs={24} xl={12}><VersionPreview title="真人感润色版" version={result.polished} /></Col>
        </Row>
        </>
      )}
    </Space>
  );
}
