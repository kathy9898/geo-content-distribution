"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button, Card, Input, message, Modal, Space, Table, Tag, Typography, Upload } from "antd";
import { DownloadOutlined, ImportOutlined, UploadOutlined } from "@ant-design/icons";
import type { Key } from "react";
import * as XLSX from "xlsx";
import AppShell, { PageTitle } from "@/components/AppShell";
import type { Platform, PublishRecordWithContent } from "@/types/geo";
import { platformLabels } from "@/types/geo";

export default function PublishRecordsPage() {
  const [records, setRecords] = useState<PublishRecordWithContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRowKeys, setSelectedRowKeys] = useState<Key[]>([]);
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [importing, setImporting] = useState(false);
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  const loadRecords = () => {
    setLoading(true);
    fetch("/api/publish-records")
      .then((res) => res.json())
      .then(setRecords)
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadRecords(); }, []);

  const downloadUrls = () => {
    if (!selectedRowKeys.length) {
      message.warning("请先勾选要下载的发布记录");
      return;
    }
    const targets = records.filter((r) => selectedRowKeys.includes(r.id));
    const urls = targets
      .map((r) => (r.publishUrl || "").trim())
      .filter((u) => /^https?:\/\//i.test(u));
    const unique = Array.from(new Set(urls));
    if (!unique.length) {
      message.warning("所选记录中没有可导出的链接");
      return;
    }
    const blob = new Blob([unique.join("\n") + "\n"], { type: "text/plain;charset=utf-8" });
    const anchor = document.createElement("a");
    anchor.href = URL.createObjectURL(blob);
    anchor.download = `publish-urls-${new Date().toISOString().slice(0, 10)}.txt`;
    anchor.click();
    URL.revokeObjectURL(anchor.href);
    message.success(`已下载 ${unique.length} 条链接，可直接粘贴到 iis7 查询`);
  };

  const importResults = async () => {
    if (!importText.trim()) {
      message.warning("请先粘贴 iis7 导出的查询结果");
      return;
    }
    setImporting(true);
    try {
      const res = await fetch("/api/publish-records/baidu-index", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: importText }),
      });
      const data = await res.json();
      if (!res.ok) {
        message.error(data.message || "导入失败");
        return;
      }
      message.success(`已更新 ${data.updated} 篇文章的百度收录状态`);
      const notes: string[] = [];
      if (data.unmatched?.length) {
        notes.push(`以下 ${data.unmatched.length} 条链接未匹配到发布记录：\n${data.unmatched.slice(0, 20).join("\n")}${data.unmatched.length > 20 ? "\n…" : ""}`);
      }
      if (data.unparsed?.length) {
        notes.push(`以下 ${data.unparsed.length} 行无法识别（需包含链接与"已收录/未收录"字样）：\n${data.unparsed.slice(0, 20).join("\n")}${data.unparsed.length > 20 ? "\n…" : ""}`);
      }
      if (notes.length) {
        Modal.info({
          title: "部分结果未导入",
          width: 640,
          content: (
            <pre style={{ whiteSpace: "pre-wrap", maxHeight: 320, overflow: "auto" }}>{notes.join("\n\n")}</pre>
          ),
        });
      }
      setImportOpen(false);
      setImportText("");
      loadRecords();
    } finally {
      setImporting(false);
    }
  };

  const handleResultFile = async (file: File) => {
    try {
      const name = file.name.toLowerCase();
      let text: string;
      if (name.endsWith(".txt") || name.endsWith(".csv")) {
        text = await file.text();
      } else {
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<(string | number | null)[]>(sheet, { header: 1, raw: false });
        text = rows
          .map((row) => row.map((cell) => (cell ?? "").toString().trim()).filter(Boolean).join(","))
          .filter(Boolean)
          .join("\n");
      }
      if (!text.trim()) {
        message.warning("文件内容为空");
        return false;
      }
      setImportText(text);
      message.success(`已解析 ${file.name}，可在下方预览并导入`);
    } catch {
      message.error("文件解析失败，请确认是 iis7 导出的 xls/xlsx/csv 文件");
    }
    return false;
  };

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
      <PageTitle title="自动发布记录" description="集中查看所有内容的发布链接与百度收录情况。" />
      <Card
        extra={
          <Space>
            <Button icon={<DownloadOutlined />} onClick={downloadUrls} disabled={!selectedRowKeys.length}>
              下载选中发布链接{selectedRowKeys.length ? `（已选 ${selectedRowKeys.length}）` : ""}
            </Button>
            <Button type="primary" icon={<ImportOutlined />} onClick={() => setImportOpen(true)}>
              导入收录结果
            </Button>
          </Space>
        }
      >
        <Table
          rowKey="id"
          loading={loading}
          dataSource={records}
          rowSelection={{ selectedRowKeys, onChange: (keys) => setSelectedRowKeys(keys) }}
          pagination={{
            current: currentPage,
            pageSize,
            showSizeChanger: true,
            pageSizeOptions: ["10", "20", "50", "100"],
            onChange: (page, size) => {
              setCurrentPage(page);
              setPageSize(size);
            },
            onShowSizeChange: (page, size) => {
              setCurrentPage(1);
              setPageSize(size);
            },
          }}
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
              title: "百度收录",
              dataIndex: "baiduIndexed",
              filters: [
                { text: "已收录", value: "indexed" },
                { text: "未收录", value: "not_indexed" },
                { text: "未查询", value: "unknown" },
              ],
              onFilter: (value, record) =>
                value === "indexed"
                  ? record.baiduIndexed === true
                  : value === "not_indexed"
                    ? record.baiduIndexed === false
                    : record.baiduIndexed === undefined,
              render: (_: unknown, record: PublishRecordWithContent) => {
                if (record.baiduIndexed === true) {
                  return (
                    <Tag
                      color="green"
                      title={record.baiduCheckedAt ? `查询时间：${new Date(record.baiduCheckedAt).toLocaleString()}` : undefined}
                    >
                      已收录
                    </Tag>
                  );
                }
                if (record.baiduIndexed === false) return <Tag color="orange">未收录</Tag>;
                return <Tag>未查询</Tag>;
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
      <Modal
        title="导入百度收录查询结果"
        open={importOpen}
        onOk={importResults}
        onCancel={() => setImportOpen(false)}
        okText="开始导入"
        cancelText="取消"
        confirmLoading={importing}
        width={640}
      >
        <Typography.Paragraph type="secondary" style={{ marginBottom: 8 }}>
          在 iis7 完成批量查询后，直接选择导出的 xls 文件（或手动粘贴结果）。系统会按链接自动匹配发布记录，
          并更新「百度收录」状态。每行需包含链接及「已收录 / 未收录」字样。
        </Typography.Paragraph>
        <div style={{ marginBottom: 8 }}>
          <Upload accept=".xls,.xlsx,.csv,.txt" showUploadList={false} beforeUpload={handleResultFile}>
            <Button icon={<UploadOutlined />}>选择 iis7 导出的 xls 文件</Button>
          </Upload>
        </div>
        <Input.TextArea
          rows={12}
          value={importText}
          onChange={(e) => setImportText(e.target.value)}
          placeholder={"示例（与 iis7 导出格式一致）：\nzhuanlan.zhihu.com/p/2071202119487584109,已收录\nsegmentfault.com/a/xxxx,未收录"}
        />
      </Modal>
    </AppShell>
  );
}
