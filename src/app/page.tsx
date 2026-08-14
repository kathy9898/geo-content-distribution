"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button, Card, Col, Empty, message, Modal, Row, Space, Statistic, Table, Tag, Typography } from "antd";
import AppShell, { PageTitle } from "@/components/AppShell";
import { ContentTrendChart, PlatformPieChart } from "@/components/DashboardCharts";
import type { ContentItem, PublishRecord } from "@/types/geo";

type ContentWithVariantCount = ContentItem & { variantCount: number };

export default function HomePage() {
  const [contents, setContents] = useState<ContentWithVariantCount[]>([]);
  const [records, setRecords] = useState<PublishRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/contents").then((res) => res.json()),
      fetch("/api/publish-records").then((res) => res.json()),
    ])
      .then(([data, records]) => {
        setContents(Array.isArray(data) ? data : []);
        setRecords(Array.isArray(records) ? records : []);
      })
      .finally(() => setLoading(false));
  }, []);

  const statusMap: Record<string, string> = {
    draft: "草稿",
    geo_optimized: "已 GEO 调优",
    variant_generated: "已生成平台版",
    published: "已发布",
  };

  const deleteContent = (record: ContentItem) => {
    Modal.confirm({
      title: `确认删除「${record.title}」？`,
      content: "删除后将同时移除该文章的 GEO 调优、平台版本和发布记录，无法恢复。",
      okText: "删除",
      okType: "danger",
      cancelText: "取消",
      onOk: async () => {
        const res = await fetch(`/api/contents/${record.id}`, { method: "DELETE" });
        if (res.ok) {
          message.success("已删除");
          setContents(contents.filter((item) => item.id !== record.id));
        } else {
          const data = await res.json();
          message.error(data.message || "删除失败");
        }
      },
    });
  };

  return (
    <AppShell>
      <PageTitle
        title="GEO 内容中台"
        description="原文 → GEO 调优 → 平台改写 → 真人感润色 → 引用验证 → 自动发布记录"
      />

      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col xs={24} md={8}><Card className="stat-card animate-in"><Statistic title="主文数量" value={contents.length} /></Card></Col>
        <Col xs={24} md={8}>
          <Link href="/publish-records">
            <Card className="stat-card animate-in animate-in-delay-1" style={{ cursor: "pointer" }}>
              <Statistic title="已发布数" value={records.length} />
            </Card>
          </Link>
        </Col>
        <Col xs={24} md={8}>
          <Link href="/publish-records">
            <Card className="stat-card animate-in animate-in-delay-2" style={{ cursor: "pointer" }}>
              <Statistic title="百度收录数" value={records.filter((record) => record.baiduIndexed === true).length} />
            </Card>
          </Link>
        </Col>
      </Row>

      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={10}>
          <Card className="animate-in animate-in-delay-2" title="各渠道发文分布" loading={loading}>
            <PlatformPieChart records={records} />
          </Card>
        </Col>
        <Col xs={24} lg={14}>
          <Card className="animate-in animate-in-delay-3" title="已发布累计趋势" loading={loading}>
            <ContentTrendChart records={records} />
          </Card>
        </Col>
      </Row>

      <Card
        className="animate-in animate-in-delay-3"
        title="主文列表"
        extra={<Link href="/contents/new"><Button type="primary">新建主文</Button></Link>}
      >
        {contents.length === 0 && !loading ? (
          <Empty description="还没有主文，先创建一篇开始跑流程" />
        ) : (
          <Table
            rowKey="id"
            loading={loading}
            dataSource={contents}
            pagination={false}
            scroll={{ x: 880 }}
            columns={[
              {
                title: "标题",
                dataIndex: "title",
                ellipsis: true,
                render: (text, record) => <Link href={`/contents/${record.id}`}>{text}</Link>,
              },
              { title: "关键词", dataIndex: "keywords", width: 220, render: (tags: string[]) => <Space wrap>{tags.map((tag) => <Tag key={tag}>{tag}</Tag>)}</Space> },
              { title: "状态", dataIndex: "status", width: 130, render: (status) => <Tag color="blue">{statusMap[status] || status}</Tag> },
              { title: "更新时间", dataIndex: "updatedAt", width: 180, render: (text) => new Date(text).toLocaleString() },
              { title: "操作", width: 160, render: (_, record) => <Space><Link href={`/contents/${record.id}`}><Typography.Link>进入工作流</Typography.Link></Link><Typography.Link type="danger" onClick={() => deleteContent(record)}>删除</Typography.Link></Space> },
            ]}
          />
        )}
      </Card>
    </AppShell>
  );
}
