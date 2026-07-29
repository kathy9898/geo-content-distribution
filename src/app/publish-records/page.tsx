"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, message, Modal, Table, Tag, Typography } from "antd";
import AppShell, { PageTitle } from "@/components/AppShell";
import type { Platform, PublishRecordWithContent } from "@/types/geo";
import { platformLabels } from "@/types/geo";

/** 发布时间 >= 此阈值的记录视为"已发布" */
const PUBLISHED_THRESHOLD = new Date("2026-06-09T18:45:07+08:00").getTime();

function getPublishStatus(record: PublishRecordWithContent): { key: string; text: string; color: string } {
  if (record.syncStatus === "draft_synced") return { key: "draft_synced", text: "草稿已同步", color: "cyan" };
  if (record.syncStatus === "failed") return { key: "failed", text: "同步失败", color: "red" };
  // published / manual / 无 syncStatus 的旧记录 → 都显示"已发布"
  return { key: "published", text: "已发布", color: "green" };
}

export default function PublishRecordsPage() {
  const [records, setRecords] = useState<PublishRecordWithContent[]>([]);
  const [loading, setLoading] = useState(true);

  const loadRecords = () => {
    setLoading(true);
    fetch("/api/publish-records")
      .then((res) => res.json())
      .then(setRecords)
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadRecords(); }, []);

  const deleteRecord = (record: PublishRecordWithContent) => {
    Modal.confirm({
      title: `确认删除此发布记录？`,
      content: `平台：${platformLabels[record.platform]}，链接：${record.publishUrl}`,
      okText: "删除",
      okType: "danger",
      cancelText: "取消",
      onOk: async () => {
        const res = await fetch(`/api/publish-records/${record.id}`, { method: "DELETE" });
        if (res.ok) {
          message.success("已删除");
          setRecords((prev) => prev.filter((r) => r.id !== record.id));
        } else {
          const data = await res.json();
          message.error(data.message || "删除失败");
        }
      },
    });
  };

  return (
    <AppShell>
      <PageTitle title="自动发布记录" description="集中查看所有内容的发布链接与发布状态。" />
      <Card>
        <Table
          rowKey="id"
          loading={loading}
          dataSource={records}
          pagination={{ pageSize: 10, showSizeChanger: true }}
          columns={[
            {
              title: "文章标题",
              dataIndex: "articleTitle",
              render: (text: string, record: PublishRecordWithContent) => {
                const title = record.articleTitle || text;
                if (record.contentId) {
                  return <Link href={`/contents/${record.contentId}`}>{title || "无标题"}</Link>;
                }
                return <Typography.Text>{title || "无标题"}</Typography.Text>;
              },
            },
            {
              title: "平台",
              dataIndex: "platform",
              filters: Object.entries(platformLabels).map(([value, label]) => ({ text: label, value })),
              onFilter: (value, record) => record.platform === value,
              render: (platform: Platform) => <Tag color="blue">{platformLabels[platform]}</Tag>,
            },
            {
              title: "发布链接",
              dataIndex: "publishUrl",
              render: (url: string) => (
                <a href={url} target="_blank" rel="noopener noreferrer" style={{ wordBreak: "break-all" }}>
                  {url}
                </a>
              ),
            },
            {
              title: "发布状态",
              dataIndex: "publishedAt",
              render: (_: string, record: PublishRecordWithContent) => {
                const status = getPublishStatus(record);
                return <Tag color={status.color}>{status.text}</Tag>;
              },
            },
            {
              title: "发布时间",
              dataIndex: "publishedAt",
              sorter: (a, b) => a.publishedAt.localeCompare(b.publishedAt),
              defaultSortOrder: "descend",
              render: (text: string) => new Date(text).toLocaleString(),
            },
            {
              title: "操作",
              render: (_: unknown, record: PublishRecordWithContent) => (
                <Typography.Link type="danger" onClick={() => deleteRecord(record)}>删除</Typography.Link>
              ),
            },
          ]}
        />
      </Card>
    </AppShell>
  );
}
