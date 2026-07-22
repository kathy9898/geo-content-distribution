"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button, Card, Col, Empty, message, Modal, Row, Space, Statistic, Table, Tag, Typography } from "antd";
import AppShell, { PageTitle } from "@/components/AppShell";
import type { ContentItem } from "@/types/geo";

type ContentWithVariantCount = ContentItem & { variantCount: number };

export default function HomePage() {
  const [contents, setContents] = useState<ContentWithVariantCount[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/contents")
      .then((res) => res.json())
      .then((data) => setContents(Array.isArray(data) ? data : []))
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
        description="原文 → GEO 调优 → 平台改写 → 一键分发 → 记录链接"
      />

      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={8}><Card className="stat-card animate-in"><Statistic title="主文数量" value={contents.length} /></Card></Col>
        <Col span={8}><Card className="stat-card animate-in animate-in-delay-1"><Statistic title="已 GEO 调优" value={contents.filter((item) => item.status !== "draft").length} /></Card></Col>
        <Col span={8}><Card className="stat-card animate-in animate-in-delay-2"><Statistic title="平台版本总数" value={contents.reduce((sum, c) => sum + (c.variantCount || 0), 0)} /></Card></Col>
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
            columns={[
              {
                title: "标题",
                dataIndex: "title",
                render: (text, record) => <Link href={`/contents/${record.id}`}>{text}</Link>,
              },
              { title: "品牌", dataIndex: "brandName", render: (text) => text || "-" },
              { title: "关键词", dataIndex: "keywords", render: (tags: string[]) => <Space wrap>{tags.map((tag) => <Tag key={tag}>{tag}</Tag>)}</Space> },
              { title: "状态", dataIndex: "status", render: (status) => <Tag color="blue">{statusMap[status] || status}</Tag> },
              { title: "更新时间", dataIndex: "updatedAt", render: (text) => new Date(text).toLocaleString() },
              { title: "操作", render: (_, record) => <Space><Link href={`/contents/${record.id}`}><Typography.Link>进入工作流</Typography.Link></Link><Typography.Link type="danger" onClick={() => deleteContent(record)}>删除</Typography.Link></Space> },
            ]}
          />
        )}
      </Card>
    </AppShell>
  );
}
