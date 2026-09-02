"use client";

import { marked } from "marked";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

/** Render markdown to HTML, fixing feishu-image:// protocol to /api/feishu-image/ */
function renderMarkdown(md: string): string {
  const html = marked.parse(md) as string;
  return html.replace(/feishu-image:\/\/([\w]+)/g, "/api/feishu-image/$1");
}

/** Highlight [建议补充：...] markers injected by GEO optimization for missing information. */
function highlightSupplementMarkers(html: string): string {
  return html.replace(/\[建议补充[：:]([^\]]+)\]/g, '<span style="background:#fff1b8;color:#ad6800;padding:0 4px;border-radius:4px;font-size:12px;">⚠ 建议补充：$1</span>');
}

import { Alert, Button, Card, Checkbox, Col, Descriptions, Divider, Form, Input, InputNumber, List, message, Modal, Popconfirm, Progress, Row, Select, Space, Spin, Switch, Table, Tabs, Tag, Typography } from "antd";
import { CloseOutlined, CopyOutlined, ExportOutlined, FileTextOutlined } from "@ant-design/icons";
import { SendOutlined } from "@ant-design/icons";
import AppShell, { PageTitle } from "@/components/AppShell";
import HumanizePanel from "@/components/HumanizePanel";
import type { ContentDetail, ContentItem, CitationModelKey, CitationModelResult, CitationValidationRun, GeoChangePreview, GeoChecklist, GeoChecklistItem, GeoDimensionScore, GeoOptimization, Platform, PlatformVariant } from "@/types/geo";
import { platformLabels, detectPlatformFromUrl, citationModelLabels } from "@/types/geo";
import { platformDraftUrls, ensureWechatSyncBridge, buildWechatSyncArticle, buildManualPublishText, buildNeteaseDocxBlob } from "@/lib/publish/wechatSyncBridge";

const allPlatforms: Platform[] = ["zhihu", "toutiao", "baijiahao", "csdn", "cnblogs", "juejin", "sohu", "netease", "wechat", "cto51"];

const checklistLabels: Record<keyof GeoChecklist, string> = {
  invertedPyramid: "核心结论是否前置",
  clearHeadingsListsTables: "标题层级、列表、表格是否清晰",
  qaFormatForComplexContent: "复杂内容是否拆成问答",
  entitiesExplained: "品牌/技术词/关键实体是否解释清楚",
  dataAndCases: "是否有数据或案例支撑",
  decisionScenarios: "是否覆盖真实决策场景",
  traceableSources: "信息来源是否可追溯",
  problemSolutionValidation: "是否形成问题-解决方案-验证闭环",
};

function toLines(value: string[] = []) {
  return value.join("\n");
}

function fromLines(value?: string) {
  return (value || "").split("\n").map((item) => item.trim()).filter(Boolean);
}

function safeJson<T>(value: string | undefined, fallback: T): T {
  if (!value?.trim()) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    throw new Error("JSON 格式不正确，请检查后再保存");
  }
}

function getChecklistItems(geo: GeoOptimization): GeoChecklistItem[] {
  if (geo.checklistItems?.length) return geo.checklistItems;
  if (!geo.checklist) return [];
  return Object.entries(geo.checklist).map(([key, passed]) => ({
    key,
    label: checklistLabels[key as keyof GeoChecklist] || key,
    passed,
    reason: passed ? "该项在当前 GEO 优化结果中已满足。" : "该项在旧版数据中未满足或未记录充分信息。",
    suggestion: passed ? "保持当前结构。" : "建议重新执行 GEO 调优，或人工补充对应内容。",
  }));
}

export default function ContentDetailPage() {
  const params = useParams<{ id: string }>();
  const [detail, setDetail] = useState<ContentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string>();
  const [editing, setEditing] = useState<PlatformVariant | null>(null);
  const [sourceEditing, setSourceEditing] = useState<ContentItem | null>(null);
  const [geoEditing, setGeoEditing] = useState<GeoOptimization | null>(null);
  const [manualPublishing, setManualPublishing] = useState<{ variant: PlatformVariant; text: string } | null>(null);
  const [previewing, setPreviewing] = useState<PlatformVariant | null>(null);
  const [sourcePreviewing, setSourcePreviewing] = useState(false);
  const [recordingVariant, setRecordingVariant] = useState<PlatformVariant | null>(null);
  const [publishUrlInput, setPublishUrlInput] = useState("");
  const [form] = Form.useForm();
  const [sourceForm] = Form.useForm();
  const [geoForm] = Form.useForm();
  const [validationLoading, setValidationLoading] = useState(false);
  const [validationVariantId, setValidationVariantId] = useState<string>("");
  const [validationModels, setValidationModels] = useState<CitationModelKey[]>(["doubao", "ernie", "deepseek", "kimi", "qwen"]);
  const [validationRuns, setValidationRuns] = useState<CitationValidationRun[]>([]);
  const [bookmarkletHref, setBookmarkletHref] = useState("#");

  useEffect(() => {
    const origin = window.location.origin;
    setBookmarkletHref(
      `javascript:void(window.open('${origin}/api/publish-records/quick-record?publishUrl='+encodeURIComponent(window.location.href)+'&title='+encodeURIComponent(document.title),'_blank','width=500,height=300'))`,
    );
  }, []);

  const loadDetail = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/contents/${params.id}`);
    if (res.ok) setDetail(await res.json());
    setLoading(false);
  }, [params.id]);

  useEffect(() => { loadDetail(); }, [loadDetail]);

  const runGeo = async () => {
    setActionLoading("geo");
    try {
      const res = await fetch(`/api/contents/${params.id}/geo-optimize`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "GEO 调优失败");
      message.success("GEO 调优完成");
      await loadDetail();
    } catch (error) {
      message.error(error instanceof Error ? error.message : "GEO 调优失败");
    } finally {
      setActionLoading(undefined);
    }
  };

  const generateVariant = async (platform: Platform) => {
    setActionLoading(platform);
    try {
      const res = await fetch(`/api/contents/${params.id}/variants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "生成失败");
      message.success(`${platformLabels[platform]} 版本已生成`);
      await loadDetail();
    } catch (error) {
      message.error(error instanceof Error ? error.message : "生成失败");
    } finally {
      setActionLoading(undefined);
    }
  };

  const saveVariant = async () => {
    if (!editing) return;
    const values = await form.validateFields();
    const res = await fetch(`/api/variants/${editing.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...values, tags: values.tags.split(/[，,]/).map((tag: string) => tag.trim()).filter(Boolean) }),
    });
    if (res.ok) {
      message.success("保存成功");
      setEditing(null);
      await loadDetail();
    } else {
      const data = await res.json();
      message.error(data.message || "保存失败");
    }
  };

  const openSourceEditor = (content: ContentItem) => {
    setSourceEditing(content);
    sourceForm.setFieldsValue({
      ...content,
      keywords: toLines(content.keywords),
      references: toLines(content.references),
    });
  };

  const saveSource = async () => {
    if (!sourceEditing) return;
    try {
      const values = await sourceForm.validateFields();
      const res = await fetch(`/api/contents/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
          keywords: fromLines(values.keywords),
          references: fromLines(values.references),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "保存失败");
      message.success("原文已保存");
      setSourceEditing(null);
      await loadDetail();
    } catch (error) {
      message.error(error instanceof Error ? error.message : "保存失败");
    }
  };

  const openGeoEditor = (geo: GeoOptimization) => {
    setGeoEditing(geo);
    geoForm.setFieldsValue({
      bodyMarkdown: geo.bodyMarkdown,
    });
  };

  const saveGeo = async () => {
    if (!geoEditing) return;
    try {
      const values = await geoForm.validateFields();
      const res = await fetch(`/api/geo-optimizations/${geoEditing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bodyMarkdown: values.bodyMarkdown,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "保存失败");
      message.success("GEO 结果已保存，后续平台改写会基于当前版本");
      setGeoEditing(null);
      await loadDetail();
    } catch (error) {
      message.error(error instanceof Error ? error.message : "保存失败");
    }
  };

  const deleteGeo = async () => {
    if (!geo) return;
    setActionLoading("del-geo");
    try {
      const res = await fetch(`/api/geo-optimizations/${geo.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "删除失败");
      }
      message.success("已删除 GEO 调优结果及关联的平台版本");
      await loadDetail();
    } catch (error) {
      message.error(error instanceof Error ? error.message : "删除失败");
    } finally {
      setActionLoading(undefined);
    }
  };

  const fallbackCopy = (text: string): boolean => {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(textarea);
    return ok;
  };

  const copyText = async (text: string, successMsg: string) => {
    try {
      await navigator.clipboard.writeText(text);
      message.success(successMsg);
    } catch {
      if (fallbackCopy(text)) {
        message.success(successMsg);
      } else {
        message.error("复制失败，请手动选择内容复制");
      }
    }
  };

  const copyVariant = async (variant: PlatformVariant) => {
    await copyText(
      `# ${variant.title}\n\n${variant.summary}\n\n${variant.bodyMarkdown}\n\n标签：${variant.tags.join("、")}`,
      "已复制标题、摘要、正文和标签",
    );
  };

  const copyManualPublishText = async () => {
    if (!manualPublishing) return;
    await copyText(manualPublishing.text, "已复制发布内容");
  };

  const downloadNeteaseDocx = async (variant: PlatformVariant) => {
    const loadingKey = `docx-${variant.id}`;
    setActionLoading(loadingKey);
    try {
      const blob = await buildNeteaseDocxBlob(variant);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${variant.title.replace(/[\\/:*?\"<>|]/g, "_")}.docx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      message.success("已生成网易导入 DOCX，请到网易号上传该文件");
      window.open(platformDraftUrls.netease, "_blank");
    } catch (error) {
      message.error(error instanceof Error ? error.message : "生成 DOCX 失败");
    } finally {
      setActionLoading(undefined);
    }
  };

  const openManualDraftPage = () => {
    if (!manualPublishing) return;
    window.open(platformDraftUrls[manualPublishing.variant.platform], "_blank");
  };

  // Platforms not supported by Wechatsync — always use manual publish
  const manualOnlyPlatforms: Platform[] = ["cto51", "wechat"];

  const syncDraft = async (variant: PlatformVariant) => {
    const loadingKey = `sync-${variant.id}`;
    setActionLoading(loadingKey);
    try {
      // Skip Wechatsync for platforms it doesn't support
      if (manualOnlyPlatforms.includes(variant.platform)) {
        const manualText = buildManualPublishText(variant);
        setManualPublishing({ variant, text: manualText });
        setActionLoading(undefined);
        return;
      }

      const ready = await ensureWechatSyncBridge();
      if (!ready) {
        const manualText = buildManualPublishText(variant);
        setManualPublishing({ variant, text: manualText });
        message.warning("未检测到同步插件，已准备手动发布内容");
        setActionLoading(undefined);
        return;
      }

      const article = await buildWechatSyncArticle(variant);
      const result = await (window as any).syncPost(article);

      // Auto-save publish record after sync
      if (result) {
        try {
          await fetch(`/api/variants/${variant.id}/sync-record`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              status: "draft_synced" as const,
              publishUrl: result.draftUrl || result.url || undefined,
              syncTaskId: result.taskId || undefined,
              note: "Wechatsync 草稿同步",
            }),
          });
          await loadDetail();
        } catch { /* non-critical */ }
      }

      message.info("文章已同步到草稿箱，发布后请点击书签栏的「记录发布」按钮，或回到本页点击「记录发布」");
      setActionLoading(undefined);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "同步草稿失败";
      message.error(errorMessage);
      setActionLoading(undefined);
   }
 };

  // 一键转发原文到各平台草稿箱（通过 Wechatsync 插件桥接）
  const forwardSource = async () => {
    if (!detail) return;
    setActionLoading("forward-source");
    try {
      const ready = await ensureWechatSyncBridge();
      if (!ready) {
        message.warning("未检测到同步插件，请先安装 Wechatsync 浏览器插件");
        setActionLoading(undefined);
        return;
      }
      const content = detail.content;
      const pseudoVariant: PlatformVariant = {
        id: "source-forward",
        contentId: content.id,
        platform: "zhihu",
        title: content.title,
        summary: content.title,
        bodyMarkdown: content.body,
        tags: content.keywords,
        geoFidelityScore: 0,
        platformToneScore: 0,
        factualConsistencyScore: 0,
        marketingRiskScore: 0,
        riskNotes: [],
        reviewStatus: "draft",
        createdAt: content.createdAt,
        updatedAt: content.updatedAt,
      };
      const article = await buildWechatSyncArticle(pseudoVariant);
      await (window as any).syncPost(article);
      message.info("已打开同步窗口，请选择要分发的平台账号");
      setActionLoading(undefined);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "一键转发失败";
      message.error(errorMessage);
      setActionLoading(undefined);
    }
  };

  const deleteVariant = async (variantId: string) => {
    const loadingKey = `del-${variantId}`;
    setActionLoading(loadingKey);
    try {
      const res = await fetch(`/api/variants/${variantId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "删除失败");
      }
      message.success("已删除平台版本");
      await loadDetail();
    } catch (error) {
      message.error(error instanceof Error ? error.message : "删除失败");
    } finally {
      setActionLoading(undefined);
    }
  };
  const runCitationValidation = async () => {
    if (!validationVariantId) {
      message.warning("请先选择要验证的平台版本");
      return;
    }
    if (!validationModels.length) {
      message.warning("请至少选择一个验证模型");
      return;
    }
    setValidationLoading(true);
    try {
      const res = await fetch(`/api/contents/${params.id}/citation-validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ variantId: validationVariantId, models: validationModels }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "验证失败");
      message.success("AI 引用验证完成");
      await loadValidationRuns();
    } catch (error) {
      message.error(error instanceof Error ? error.message : "AI 引用验证失败");
    } finally {
      setValidationLoading(false);
    }
  };

  const loadValidationRuns = useCallback(async () => {
    try {
      const res = await fetch(`/api/contents/${params.id}/citation-validate`);
      if (res.ok) setValidationRuns(await res.json());
    } catch { /* non-critical */ }
  }, [params.id]);

  useEffect(() => { loadValidationRuns(); }, [loadValidationRuns]);

  const geo = detail?.geoOptimization;
  const checklistItems = useMemo(() => geo ? getChecklistItems(geo) : [], [geo]);

  if (loading || !detail) {
    return <AppShell><Spin /></AppShell>;
  }

  const canGenerate = true;
  const existingPlatforms = new Set(detail.variants.map((item) => item.platform));
  const scoreLift = geo?.sourceGeoScore !== undefined ? geo.geoScore - geo.sourceGeoScore : undefined;

  return (
    <AppShell>
      <PageTitle title={detail.content.title} description="原文 → GEO 调优 → 平台改写 → 真人感润色 → 引用验证 → 自动发布记录" />
      <Tabs
        items={[
          {
            key: "source",
            label: "1. 原文",
            children: (
              <Card>
                <Descriptions bordered column={2} size="small">
                  <Descriptions.Item label="品牌">{detail.content.brandName || "-"}</Descriptions.Item>
                  <Descriptions.Item label="目标用户">{detail.content.targetAudience || "-"}</Descriptions.Item>
                  <Descriptions.Item label="关键词" span={2}>{detail.content.keywords.map((tag) => <Tag key={tag}>{tag}</Tag>)}</Descriptions.Item>
                  <Descriptions.Item label="参考资料" span={2}>{detail.content.references.join("；") || "-"}</Descriptions.Item>
                </Descriptions>
                <Divider />
                <Typography.Title level={4}>原始正文</Typography.Title>
                <Space style={{ marginBottom: 8 }}>
                  <Button size="small" onClick={() => setSourcePreviewing(true)}>预览</Button>
                  <Button size="small" type="primary" onClick={() => openSourceEditor(detail.content)}>编辑</Button>
                </Space>
                <div className="markdown-preview raw" style={{ maxHeight: 400, overflowY: "auto", paddingRight: 8 }}>{detail.content.body}</div>
                <Divider />
                <Space>
                  <Button
                    type="primary"
                    icon={<SendOutlined />}
                    loading={actionLoading === "forward-source"}
                    onClick={forwardSource}
                  >一键转发到各平台</Button>
                  <Typography.Text type="secondary">将原文同时分发到知乎、头条、百家号等各平台草稿箱</Typography.Text>
                </Space>
              </Card>
            ),
          },
          {
            key: "geo",
            label: "2. GEO 调优",
            children: (
              <Space direction="vertical" size="large" style={{ width: "100%" }}>
                <Card>
                  <Space wrap>
                    <Button type="primary" loading={actionLoading === "geo"} onClick={runGeo}>执行 GEO 调优</Button>
                    <Typography.Text type="secondary">平台改写将基于当前保存的 GEO 优化版。合格线：80 分。</Typography.Text>
                  </Space>
                </Card>
                {geo ? (
                  <Space direction="vertical" size="large" style={{ width: "100%" }}>
                    <Card title="GEO 分数对比">
                      <Popconfirm
                        title="确定删除 GEO 调优结果？"
                        description="将同时删除基于该优化的所有平台版本，内容状态恢复为草稿。"
                        onConfirm={deleteGeo}
                        okText="删除"
                        cancelText="取消"
                        okButtonProps={{ danger: true }}
                      >
                        <Button danger loading={actionLoading === "del-geo"} style={{ float: "right" }}>删除 GEO 调优</Button>
                      </Popconfirm>
                      <Row gutter={24} align="middle">
                        <Col span={7}>
                          {geo.sourceGeoScore === undefined ? (
                            <Alert type="info" showIcon message="旧数据未记录原文分数" description="重新执行 GEO 调优后会生成原文分数。" />
                          ) : (
                            <Progress type="dashboard" percent={geo.sourceGeoScore} status={geo.sourceGeoScore >= 80 ? "success" : "normal"} format={(value) => `原文 ${value}`} />
                          )}
                        </Col>
                        <Col span={6}>
                          <Typography.Title level={2} style={{ textAlign: "center", margin: 0 }}>
                            {scoreLift === undefined ? "-" : `${scoreLift >= 0 ? "+" : ""}${scoreLift}`}
                          </Typography.Title>
                          <Typography.Paragraph type="secondary" style={{ textAlign: "center", marginBottom: 0 }}>优化提升</Typography.Paragraph>
                        </Col>
                        <Col span={7}>
                          <Progress type="dashboard" percent={geo.geoScore} status={geo.qualified ? "success" : "exception"} format={(value) => `优化后 ${value}`} />
                        </Col>
                        <Col span={4}>
                          <Tag color={geo.qualified ? "green" : "red"}>{geo.qualified ? "GEO 合格" : "未达标"}</Tag>
                        </Col>
                      </Row>
                    </Card>

                    <Card title="GEO 优化结果">
                      <Alert type={geo.qualified ? "success" : "warning"} message={geo.qualified ? "GEO 合格，可以进入平台改写" : "GEO 未达 80 分，建议补充后再分发"} showIcon />
                      <Typography.Title level={4}>{geo.title}</Typography.Title>
                      <Typography.Paragraph strong>{geo.coreConclusion}</Typography.Paragraph>
                      <Typography.Paragraph>{geo.summary}</Typography.Paragraph>
                    </Card>

                    {geo.dimensionScores?.length ? (
                      <Card
                        title="GEO 12 维度评分报告"
                        extra={geo.riskCheck ? (
                          <Space size={4} wrap>
                            <Tag color={geo.riskCheck.keywordStuffing ? "red" : "green"}>{geo.riskCheck.keywordStuffing ? "关键词堆砌风险" : "无关键词堆砌"}</Tag>
                            <Tag color={geo.riskCheck.overOptimization ? "red" : "green"}>{geo.riskCheck.overOptimization ? "过度优化风险" : "优化适度"}</Tag>
                            <Tag color={geo.riskCheck.fabrication ? "red" : "green"}>{geo.riskCheck.fabrication ? "疑似编造信息" : "无编造信息"}</Tag>
                          </Space>
                        ) : undefined}
                      >
                        <Table<GeoDimensionScore>
                          dataSource={geo.dimensionScores}
                          rowKey="key"
                          pagination={false}
                          size="small"
                          columns={[
                            { title: "层级", dataIndex: "layer", width: 130, render: (value: string) => <Tag color="blue">{value}</Tag> },
                            { title: "维度", dataIndex: "label", width: 140, render: (value: string) => <Typography.Text strong>{value}</Typography.Text> },
                            { title: "权重", dataIndex: "weight", width: 70, align: "center" },
                            { title: "原文", dataIndex: "beforeScore", width: 80, align: "center", render: (value: number, record) => <Typography.Text type={value < record.weight * 0.6 ? "danger" : undefined}>{value}</Typography.Text> },
                            { title: "优化后", dataIndex: "afterScore", width: 90, align: "center", render: (value: number, record) => <Typography.Text strong type={value >= record.weight * 0.8 ? "success" : value < record.weight * 0.6 ? "danger" : "warning"}>{value}</Typography.Text> },
                            { title: "提升", key: "lift", width: 80, align: "center", render: (_, record) => { const lift = record.afterScore - record.beforeScore; return <Typography.Text type={lift > 0 ? "success" : "secondary"}>{lift > 0 ? `+${lift}` : lift}</Typography.Text>; } },
                            { title: "诊断与改造说明", dataIndex: "note" },
                          ]}
                        />
                        {geo.riskCheck?.note ? <Typography.Paragraph type="secondary" style={{ marginTop: 12, marginBottom: 0 }}>风险检查：{geo.riskCheck.note}</Typography.Paragraph> : null}
                      </Card>
                    ) : null}

                    {!geo.dimensionScores?.length && checklistItems.length ? (
                      <Card title="GEO 关键问题修正">
                        <Row gutter={[16, 16]}>
                          {checklistItems.map((item) => (
                            <Col span={12} key={item.key}>
                              <Card size="small" title={<Space><Tag color={item.passed ? "green" : "red"}>{item.passed ? "通过" : "待改进"}</Tag>{item.label}</Space>}>
                                <Typography.Paragraph><b>诊断优化：</b>{item.reason}</Typography.Paragraph>
                                <Typography.Paragraph type="secondary"><b>后续建议：</b>{item.suggestion}</Typography.Paragraph>
                              </Card>
                            </Col>
                          ))}
                        </Row>
                      </Card>
                    ) : null}

                    {geo.supplementSuggestions?.length ? (
                      <Card title="待补充内容">
                        <Alert type="warning" showIcon style={{ marginBottom: 12 }} message="以下位置因原文信息不足，正文已用 [建议补充：...] 标注。请补充真实信息后重新执行 GEO 调优，或直接点击“编辑”修改正文。" />
                        <List
                          size="small"
                          dataSource={geo.supplementSuggestions}
                          renderItem={(item, index) => (
                            <List.Item>
                              <Typography.Text><Tag color="orange">{index + 1}</Tag><b>{item.location}</b>：{item.suggestion}</Typography.Text>
                            </List.Item>
                          )}
                        />
                      </Card>
                    ) : null}

                    <Card title="修改预览：AI 优化了哪些地方">
                      {geo.changePreview?.length ? (
                        <Table
                          dataSource={geo.changePreview}
                          rowKey={(_, i) => String(i)}
                          pagination={false}
                          size="small"
                          columns={[
                            { title: "优化区域", dataIndex: "area", width: 120, render: (t) => <Typography.Text strong>{t}</Typography.Text> },
                            { title: "原文", dataIndex: "before" },
                            { title: "优化后", dataIndex: "after" },
                            { title: "原因", dataIndex: "reason", width: 200 },
                          ]}
                        />
                      ) : <Alert type="info" showIcon message="旧数据未记录修改预览，可重新执行 GEO 调优生成。" />}
                    </Card>

                    <Card title="优化正文" extra={<Button onClick={() => openGeoEditor(geo)}>编辑</Button>}>
                      <div className="markdown-preview" style={{ maxHeight: 400, overflowY: "auto", paddingRight: 8 }} dangerouslySetInnerHTML={{ __html: highlightSupplementMarkers(renderMarkdown(geo.bodyMarkdown) as string) }} />
                      <Divider />
                      <Space>
                        <Button
                          type="primary"
                          icon={<SendOutlined />}
                          loading={actionLoading === "forward-source"}
                          onClick={forwardSource}
                        >一键转发到各平台</Button>
                        <Typography.Text type="secondary">将原文同步分发到知乎、头条、百家号等各平台草稿箱</Typography.Text>
                      </Space>
                    </Card>
                  </Space>
                ) : <Alert message="尚未执行 GEO 调优" type="info" showIcon />}
              </Space>
            ),
          },
          {
            key: "variants",
            label: "3. 平台版本",
            children: (
              <Space direction="vertical" size="large" style={{ width: "100%" }}>
                {!geo && <Alert type="info" showIcon message="未进行 GEO 调优，将直接基于原文生成平台版本。建议先完成 GEO 调优以获得更高质量的改写。" />}
                <Card>
                  <Space>
                    {allPlatforms.map((platform) => (
                      <Button key={platform} disabled={!canGenerate || existingPlatforms.has(platform)} loading={actionLoading === platform} onClick={() => generateVariant(platform)}>
                        生成{platformLabels[platform]}版
                      </Button>
                    ))}
                  </Space>
                </Card>
                <Row gutter={[16, 16]}>
                  {detail.variants.map((variant) => (
                    <Col span={24} key={variant.id}>
                      <Card title={`${platformLabels[variant.platform]}：${variant.title}`} extra={<Space><Tag color="blue">{variant.reviewStatus}</Tag><Button size="small" onClick={() => setPreviewing(variant)}>预览</Button><Popconfirm title="确定删除该平台版本？" description="删除后无法恢复" onConfirm={() => deleteVariant(variant.id)} okText="删除" cancelText="取消" okButtonProps={{ danger: true }}><Button size="small" danger loading={actionLoading === `del-${variant.id}`}>删除</Button></Popconfirm></Space>}>
                        <Space wrap style={{ marginBottom: 12 }}>
                          <Tag color="green">GEO 保真 {variant.geoFidelityScore}</Tag>
                          <Tag color="purple">平台调性 {variant.platformToneScore}</Tag>
                          <Tag color="cyan">事实一致 {variant.factualConsistencyScore}</Tag>
                          <Tag color={variant.marketingRiskScore > 60 ? "red" : "orange"}>营销风险 {variant.marketingRiskScore}</Tag>
                        </Space>
                        <Typography.Paragraph><Tag color="blue" style={{ marginRight: 6 }}>摘要</Tag>{variant.summary}</Typography.Paragraph>
                        <Divider style={{ margin: '8px 0' }} />
                        <div className="markdown-preview" style={{ maxHeight: 400, overflowY: "auto", paddingRight: 8 }} dangerouslySetInnerHTML={{ __html: renderMarkdown(variant.bodyMarkdown) as string }} />
                        <Divider />
                        <Space wrap>{variant.tags.map((tag) => <Tag key={tag}>{tag}</Tag>)}</Space>
                        <Divider />
                        <Space>
                          <Button onClick={() => { setEditing(variant); form.setFieldsValue({ ...variant, tags: variant.tags.join(",") }); }}>编辑审核</Button>
                          <Button type="primary" onClick={() => copyVariant(variant)}>一键复制</Button>
                          {variant.platform === "netease" ? (
                            <Button loading={actionLoading === `docx-${variant.id}`} onClick={() => downloadNeteaseDocx(variant)}>下载网易导入 DOCX</Button>
                          ) : ![manualOnlyPlatforms].flat().includes(variant.platform) && (
                            <Button loading={actionLoading === `sync-${variant.id}`} onClick={() => syncDraft(variant)}>同步{platformLabels[variant.platform]}草稿</Button>
                          )}
                          <Button onClick={() => { setRecordingVariant(variant); setPublishUrlInput(""); }}>记录发布</Button>
                          {variant.platform === "wechat" && (
                            <Button type="dashed" onClick={() => window.open(`/contents/${params.id}/gzh-format`, "_self")}>公众号排版</Button>
                          )}
                        </Space>
                        {manualOnlyPlatforms.includes(variant.platform) && (
                          <Alert type="info" showIcon style={{ marginTop: 8 }} message={`${platformLabels[variant.platform]}暂不支持自动同步，请用"一键复制"后粘贴到平台发布。`} />
                        )}
                        {variant.platform === "netease" && (
                          <Alert type="info" showIcon style={{ marginTop: 8 }} message="网易号自动同步对图片和表格支持不稳定，已改为下载 DOCX 后在网易号后台上传文件导入。" />
                        )}
                        {(variant.platform === "csdn" || variant.platform === "cnblogs") && (
                          <Alert type="warning" showIcon style={{ marginTop: 8 }} message={`${platformLabels[variant.platform]}对同步内容有字数限制，图片内联后容易超限。如同步失败，请用"一键复制"手动发布。`} />
                        )}
                      </Card>
                    </Col>
                  ))}
                </Row>
              </Space>
            ),
          },
          {
            key: "humanize",
            label: "4. 真人感润色",
            children: <HumanizePanel detail={detail} reload={loadDetail} />,
          },
          {
            key: "citation",
            label: "5. AI 引用验证",
            children: (
              <Space direction="vertical" size="large" style={{ width: "100%" }}>
                <Card title="运行验证">
                  <Space direction="vertical" style={{ width: "100%" }} size="middle">
                    <div>
                      <Typography.Text strong>选择平台版本：</Typography.Text>
                      <Select
                        style={{ width: "100%", marginTop: 4 }}
                        placeholder="选择要验证的平台版本"
                        value={validationVariantId || undefined}
                        onChange={setValidationVariantId}
                        options={detail.variants.map((v) => ({
                          value: v.id,
                          label: `${platformLabels[v.platform]}：${v.title}`,
                        }))}
                      />
                    </div>
                    <div>
                      <Typography.Text strong>验证模型：</Typography.Text>
                      <div style={{ marginTop: 4 }}>
                        <Checkbox.Group
                          options={Object.entries(citationModelLabels).map(([key, label]) => ({ value: key, label }))}
                          value={validationModels}
                          onChange={(vals) => setValidationModels(vals as CitationModelKey[])}
                        />
                      </div>
                    </div>
                    <Button type="primary" loading={validationLoading} onClick={runCitationValidation} disabled={!validationVariantId || !validationModels.length}>
                      运行 AI 引用验证
                    </Button>
                    <Typography.Text type="secondary">将文章分别投喂给选中的模型，评估 AI 搜索引擎引用概率并给出改进建议。</Typography.Text>
                  </Space>
                </Card>

                {validationRuns.map((run) => {
                  const variant = detail.variants.find((v) => v.id === run.variantId);
                  const recLabel = run.finalRecommendation === "pass" ? "建议发布" : run.finalRecommendation === "revise" ? "建议修改后发布" : "不建议发布";
                  const recColor = run.finalRecommendation === "pass" ? "green" : run.finalRecommendation === "revise" ? "orange" : "red";
                  return (
                    <Card
                      key={run.id}
                      title={variant ? `${platformLabels[variant.platform]}：${variant.title}` : "验证报告"}
                      extra={<Space><Tag color={recColor}>{recLabel}</Tag><Tag color="blue">综合引用分 {run.averageScore}</Tag></Space>}
                    >
                      <Space direction="vertical" style={{ width: "100%" }} size="middle">
                        {/* Per-model scores */}
                        <Table
                          dataSource={run.models}
                          rowKey="model"
                          pagination={false}
                          size="small"
                          columns={[
                            { title: "模型", dataIndex: "model", render: (m: CitationModelKey) => citationModelLabels[m] },
                            { title: "引用概率", dataIndex: "citationScore", render: (s: number) => <Progress percent={s * 10} size="small" status={s >= 8 ? "success" : s >= 6 ? "normal" : "exception"} format={() => `${s}/10`} /> },
                            { title: "主要扣分", render: (_: unknown, r: CitationModelResult) => r.deductions.slice(0, 2).map((d) => d.issue).join("；") || "-" },
                            { title: "摘要", dataIndex: "summary", ellipsis: true },
                          ]}
                        />

                        {/* Common deductions */}
                        {run.commonDeductions.length > 0 && (
                          <Card size="small" title="高频扣分项（多模型交叉验证）">
                            <List
                              size="small"
                              dataSource={run.commonDeductions}
                              renderItem={(item) => <List.Item><Typography.Text>• {item}</Typography.Text></List.Item>}
                            />
                          </Card>
                        )}

                        {/* Top improvements */}
                        {run.topImprovements.length > 0 && (
                          <Card size="small" title="优先修改建议">
                            <List
                              size="small"
                              dataSource={run.topImprovements}
                              renderItem={(item, idx) => (
                                <List.Item>
                                  <Typography.Text>
                                    <Tag color="blue">优先级 {idx + 1}</Tag> {item}
                                  </Typography.Text>
                                </List.Item>
                              )}
                            />
                          </Card>
                        )}

                        {/* Per-model detail */}
                          <Card size="small" title="各模型详细结果">
                            {run.models.map((mr) => (
                              <div key={mr.model} style={{ marginBottom: 16 }}>
                                <Typography.Title level={5}>{citationModelLabels[mr.model]} — {mr.citationScore}/10</Typography.Title>
                                <Typography.Paragraph><strong>引用原因：</strong>{mr.citationProbabilityReason}</Typography.Paragraph>
                                {mr.deductions.length > 0 && (
                                  <>
                                    <Typography.Text strong>扣分项：</Typography.Text>
                                    <List
                                      size="small"
                                      dataSource={mr.deductions}
                                      renderItem={(d) => (
                                        <List.Item>
                                          <Tag color={d.severity === "high" ? "red" : d.severity === "medium" ? "orange" : "blue"}>{d.severity}</Tag>
                                          {d.issue} — {d.suggestion}
                                        </List.Item>
                                      )}
                                    />
                                  </>
                                )}
                                {mr.top3Improvements.length > 0 && (
                                  <>
                                    <Typography.Text strong style={{ marginTop: 8, display: "block" }}>改进建议：</Typography.Text>
                                    {mr.top3Improvements.map((imp, i) => (
                                      <Typography.Paragraph key={i} style={{ marginBottom: 4 }}>
                                        {i + 1}. <strong>{imp.target}</strong>：{imp.reason}
                                        {imp.rewriteSuggestion && <Typography.Text type="secondary"> → {imp.rewriteSuggestion}</Typography.Text>}
                                      </Typography.Paragraph>
                                    ))}
                                  </>
                                )}
                                {mr.triggerQueries.length > 0 && (
                                  <Typography.Paragraph>
                                    <strong>触发问题：</strong>
                                    {mr.triggerQueries.map((q) => <Tag key={q}>{q}</Tag>)}
                                  </Typography.Paragraph>
                                )}
                                {mr.likelyQuotedSections.length > 0 && (
                                  <Typography.Paragraph>
                                    <strong>可摘取段落：</strong>{mr.likelyQuotedSections.length} 段
                                  </Typography.Paragraph>
                                )}
                                {mr.riskNotes.length > 0 && (
                                  <Typography.Paragraph type="warning">
                                    <strong>风险提示：</strong>{mr.riskNotes.join("；")}
                                  </Typography.Paragraph>
                                )}
                              </div>
                            ))}
                          </Card>
                    </Space>
                  </Card>
                );
                })}
              </Space>
            ),
          },
          {
            key: "publish",
            label: "6. 自动发布记录",
            children: (
              <Space direction="vertical" size="large" style={{ width: "100%" }}>
                <Card title="快速记录发布链接" size="small">
                  <Space direction="vertical" style={{ width: "100%" }}>
                    <Typography.Text>在已发布的文章页面点击书签栏按钮，自动记录链接到本系统。</Typography.Text>
                    <Typography.Text type="secondary">使用方法：将下方链接拖到浏览器书签栏 → 打开已发布的文章页面 → 点击书签栏的按钮</Typography.Text>
                    <div style={{ margin: "8px 0" }}>
                      <a
                        href={`javascript:void(window.open('${typeof window!=="undefined"?window.location.origin:""}'+'/api/publish-records/quick-record?publishUrl='+encodeURIComponent(window.location.href)+'&title='+encodeURIComponent(document.title),'_blank','width=500,height=300'))`}
                        onClick={(e) => e.preventDefault()}
                        style={{
                          display: "inline-block",
                          padding: "6px 16px",
                          background: "#1677ff",
                          color: "#fff",
                          borderRadius: 6,
                          textDecoration: "none",
                          fontWeight: 500,
                          cursor: "grab",
                        }}
                      >
                        📌 记录发布
                      </a>
                    </div>
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>提示：直接点击无效，请拖拽到书签栏使用</Typography.Text>
                  </Space>
                </Card>
              </Space>
            ),
          },
        ]}
      />

      <Modal open={!!editing} title="编辑审核平台版本" onOk={saveVariant} onCancel={() => setEditing(null)} width={900} okText="保存">
        <Form form={form} layout="vertical">
          <Form.Item name="title" label="标题" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="summary" label="摘要" rules={[{ required: true }]}><Input.TextArea rows={3} /></Form.Item>
          <Form.Item name="bodyMarkdown" label="正文" rules={[{ required: true }]}><Input.TextArea rows={14} /></Form.Item>
          <Form.Item name="tags" label="标签"><Input /></Form.Item>
          <Form.Item name="reviewStatus" label="审核状态"><Select options={["draft", "reviewing", "approved", "scheduled", "published", "failed"].map((value) => ({ value, label: value }))} /></Form.Item>
        </Form>
      </Modal>

      <Modal open={!!sourceEditing} title="编辑原文" onOk={saveSource} onCancel={() => setSourceEditing(null)} width={1000} okText="保存">
        <Form form={sourceForm} layout="vertical">
          <Form.Item name="title" label="标题" rules={[{ required: true, message: "请输入标题" }]}><Input /></Form.Item>
          <Form.Item name="body" label="正文 Markdown" rules={[{ required: true, message: "请输入正文" }]}><Input.TextArea rows={22} /></Form.Item>
          <Form.Item name="brandName" label="品牌名"><Input /></Form.Item>
          <Form.Item name="keywords" label="核心关键词" extra="一行一个关键词"><Input.TextArea rows={3} /></Form.Item>
          <Form.Item name="targetAudience" label="目标用户"><Input /></Form.Item>
          <Form.Item name="references" label="参考资料" extra="一行一个参考资料"><Input.TextArea rows={4} /></Form.Item>
          <Form.Item name="callToAction" label="CTA"><Input /></Form.Item>
        </Form>
      </Modal>

      <Modal open={!!geoEditing} title="编辑优化正文" onOk={saveGeo} onCancel={() => setGeoEditing(null)} width={900} okText="保存">
        <Form form={geoForm} layout="vertical">
          <Form.Item name="bodyMarkdown" label="优化正文 Markdown" rules={[{ required: true }]}><Input.TextArea rows={20} /></Form.Item>
        </Form>
      </Modal>

      <Modal
        open={!!previewing}
        title={previewing ? `${platformLabels[previewing.platform]}：${previewing.title} — 预览` : "预览"}
        onCancel={() => setPreviewing(null)}
        width={900}
        footer={<Button onClick={() => setPreviewing(null)}>关闭</Button>}
      >
        <div className="markdown-preview" style={{ lineHeight: 1.8 }} dangerouslySetInnerHTML={{ __html: renderMarkdown(previewing?.bodyMarkdown || "") as string }} />
      </Modal>

      <Modal
        open={sourcePreviewing}
        title="原始正文 — 预览"
        onCancel={() => setSourcePreviewing(false)}
        width={900}
        footer={<Button onClick={() => setSourcePreviewing(false)}>关闭</Button>}
      >
        <div className="markdown-preview" style={{ lineHeight: 1.8 }} dangerouslySetInnerHTML={{ __html: renderMarkdown(detail?.content.body || "") as string }} />
      </Modal>

      <Modal
        open={!!manualPublishing}
        onCancel={() => setManualPublishing(null)}
        width={760}
        footer={null}
        closable={false}
        centered
        styles={{
          content: { borderRadius: 22, padding: 0, overflow: "hidden", boxShadow: "0 24px 70px rgba(15, 23, 42, 0.22)" },
          body: { padding: 0 },
          mask: { backgroundColor: "rgba(15, 23, 42, 0.38)", backdropFilter: "blur(2px)" },
        }}
      >
        <div style={{ padding: "28px 30px 24px", background: "linear-gradient(180deg, #f8fbff 0%, #ffffff 32%)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 16, marginBottom: 24 }}>
            <div>
              <Typography.Title level={3} style={{ margin: 0, color: "#111827", fontSize: 24 }}>同步文章草稿</Typography.Title>
              <Typography.Text type="secondary">插件桥接未连接，已为你整理好手动同步内容</Typography.Text>
            </div>
            <Button
              type="text"
              shape="circle"
              icon={<CloseOutlined />}
              onClick={() => setManualPublishing(null)}
              style={{ color: "#6b7280" }}
            />
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 18, padding: 18, border: "1px solid #e5edff", borderRadius: 18, background: "#ffffff", boxShadow: "0 10px 30px rgba(37, 99, 235, 0.08)", marginBottom: 16 }}>
            <Space size={14} align="center">
              <div style={{ width: 46, height: 46, borderRadius: 14, display: "grid", placeItems: "center", background: "linear-gradient(135deg, #e8f1ff 0%, #dbeafe 100%)", color: "#2563eb", fontWeight: 700, fontSize: 18 }}>
                {manualPublishing ? platformLabels[manualPublishing.variant.platform].slice(0, 1) : "草"}
              </div>
              <div>
                <Typography.Text strong style={{ display: "block", color: "#111827", fontSize: 16 }}>
                  {manualPublishing ? platformLabels[manualPublishing.variant.platform] : "目标平台"}
                </Typography.Text>
                <Typography.Text type="secondary" style={{ fontSize: 13 }}>
                  {manualPublishing?.variant.title || detail.content.title}
                </Typography.Text>
              </div>
            </Space>
            <Tag color="processing" icon={<FileTextOutlined />} style={{ borderRadius: 999, padding: "4px 10px", marginInlineEnd: 0 }}>
              待手动同步
            </Tag>
          </div>

          <div style={{ padding: "12px 14px", borderRadius: 14, background: "#fff7ed", border: "1px solid #fed7aa", color: "#9a3412", fontSize: 13, marginBottom: 18 }}>
            未检测到 Wechatsync 网页桥接。请复制下方内容，打开平台草稿页后粘贴发布；后续桥接恢复时可自动同步。
          </div>

          <div style={{ border: "1px solid #e5e7eb", borderRadius: 16, overflow: "hidden", background: "#f9fafb" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: "1px solid #e5e7eb", background: "#ffffff" }}>
              <Typography.Text strong>草稿内容</Typography.Text>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>Markdown / Wechatsync JSON</Typography.Text>
            </div>
            <Input.TextArea
              value={manualPublishing?.text}
              rows={10}
              readOnly
              style={{ border: 0, borderRadius: 0, resize: "none", background: "#f9fafb", fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace", fontSize: 13, lineHeight: 1.65 }}
            />
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 22 }}>
            <Button onClick={() => setManualPublishing(null)}>关闭</Button>
            <Button icon={<ExportOutlined />} onClick={openManualDraftPage}>打开草稿页</Button>
            <Button type="primary" icon={<CopyOutlined />} onClick={copyManualPublishText}>复制内容</Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={!!recordingVariant}
        title={recordingVariant ? `记录发布 — ${platformLabels[recordingVariant.platform]}：${recordingVariant.title}` : "记录发布"}
        onCancel={() => setRecordingVariant(null)}
        onOk={async () => {
          if (!recordingVariant || !publishUrlInput.trim()) {
            message.warning("请填写发布链接");
            return;
          }
          // Check for existing draft_synced record to update instead of creating duplicate
          const existingDraftRecord = detail?.publishRecords.find(
            (r) => r.variantId === recordingVariant.id && r.syncStatus === "draft_synced",
          );
          if (existingDraftRecord) {
            const res = await fetch(`/api/publish-records/${existingDraftRecord.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                publishUrl: publishUrlInput.trim(),
                syncStatus: "published",
                publishedAt: new Date().toISOString(),
              }),
            });
            if (res.ok) {
              message.success("发布记录已更新");
              setRecordingVariant(null);
              await loadDetail();
            } else {
              const data = await res.json();
              message.error(data.message || "更新失败");
            }
          } else {
            const res = await fetch(`/api/contents/${params.id}/publish-records`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                platform: recordingVariant.platform,
                variantId: recordingVariant.id,
                publishUrl: publishUrlInput.trim(),
                syncStatus: "manual",
              }),
            });
            if (res.ok) {
              message.success("发布记录已保存");
              setRecordingVariant(null);
              await loadDetail();
            } else {
              const data = await res.json();
              message.error(data.message || "保存失败");
            }
          }
        }}
        okText="保存"
        cancelText="取消"
      >
        <Form layout="vertical">
          <Form.Item label="平台"><Tag color="blue">{recordingVariant ? platformLabels[recordingVariant.platform] : ""}</Tag></Form.Item>
          {recordingVariant && detail?.publishRecords.some((r) => r.variantId === recordingVariant.id && r.syncStatus === "draft_synced") && (
            <Alert type="info" showIcon message="该版本已有草稿同步记录，将更新为已发布状态" style={{ marginBottom: 16 }} />
          )}
          <Form.Item label="发布链接" required>
            <Input
              placeholder="粘贴文章发布后的链接"
              value={publishUrlInput}
              onChange={(e) => setPublishUrlInput(e.target.value)}
            />
          </Form.Item>
        </Form>
      </Modal>
    </AppShell>
  );
}
