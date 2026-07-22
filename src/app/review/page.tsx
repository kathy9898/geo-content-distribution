"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, Space, Table, Tag } from "antd";
import AppShell, { PageTitle } from "@/components/AppShell";
import type { Platform, PlatformVariant } from "@/types/geo";
import { platformLabels } from "@/types/geo";

export default function ReviewPage() {
  const [variants, setVariants] = useState<PlatformVariant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/variants")
      .then((res) => res.json())
      .then(setVariants)
      .finally(() => setLoading(false));
  }, []);

  return (
    <AppShell>
      <PageTitle title="审核中心" description="集中查看所有待审核、已审核和待发布的平台版本。" />
      <Card>
        <Table
          rowKey="id"
          loading={loading}
          dataSource={variants}
          columns={[
            { title: "平台", dataIndex: "platform", render: (platform: Platform) => <Tag color="blue">{platformLabels[platform]}</Tag> },
            { title: "标题", dataIndex: "title" },
            { title: "评分", render: (_: unknown, record: PlatformVariant) => <Space wrap><Tag>GEO {record.geoFidelityScore}</Tag><Tag>调性 {record.platformToneScore}</Tag><Tag>事实 {record.factualConsistencyScore}</Tag><Tag color="orange">营销风险 {record.marketingRiskScore}</Tag></Space> },
            { title: "状态", dataIndex: "reviewStatus", render: (status: string) => <Tag>{status}</Tag> },
            { title: "更新时间", dataIndex: "updatedAt", render: (text: string) => new Date(text).toLocaleString() },
            { title: "操作", render: (_: unknown, record: PlatformVariant) => <Link href={`/contents/${record.contentId}`}>进入内容详情</Link> },
          ]}
        />
      </Card>
    </AppShell>
  );
}
