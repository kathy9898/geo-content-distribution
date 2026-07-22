'use client';

import { useRef, useState } from 'react';
import { Button, message, Typography } from 'antd';
import { CopyOutlined, CheckOutlined } from '@ant-design/icons';

const { Text } = Typography;

interface GzhPreviewProps {
  html: string;
}

export default function GzhPreview({ html }: GzhPreviewProps) {
  const previewRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!previewRef.current) return;

    try {
      // 方法1: navigator.clipboard.write() with text/html
      const blob = new Blob([html], { type: 'text/html' });
      const plainBlob = new Blob([html], { type: 'text/plain' });
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/html': blob,
          'text/plain': plainBlob,
        }),
      ]);
      setCopied(true);
      message.success('已复制！可粘贴到公众号编辑器');
      setTimeout(() => setCopied(false), 3000);
    } catch {
      // 方法2: Range + execCommand (降级方案)
      try {
        const range = document.createRange();
        range.selectNodeContents(previewRef.current);
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);
        document.execCommand('copy');
        selection?.removeAllRanges();
        setCopied(true);
        message.success('已复制！可粘贴到公众号编辑器');
        setTimeout(() => setCopied(false), 3000);
      } catch {
        message.error('复制失败，请手动全选复制');
      }
    }
  };

  return (
    <div>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 12, padding: '8px 12px',
        background: '#fafafa', borderRadius: 8, border: '1px solid #f0f0f0',
      }}>
        <Text type="secondary" style={{ fontSize: 12 }}>
          预览效果（{html.length > 0 ? '已生成' : '未生成'}）
        </Text>
        <Button
          type="primary"
          size="small"
          icon={copied ? <CheckOutlined /> : <CopyOutlined />}
          onClick={handleCopy}
          disabled={!html}
          style={{ background: copied ? '#52c41a' : undefined }}
        >
          {copied ? '已复制' : '复制到公众号'}
        </Button>
      </div>

      {/* 预览容器，隔离站点全局样式，尽量贴近公众号粘贴后的真实渲染 */}
      <div style={{
        width: '100%', maxWidth: 677, margin: '0 auto',
        background: '#f5f5f5', borderRadius: 8, padding: 16,
        minHeight: 300, overflow: 'auto',
      }}>
        <div
          ref={previewRef}
          style={{
            background: '#fff', borderRadius: 4, minHeight: 200,
            color: '#333', fontSize: 14, lineHeight: 1.75,
            fontFamily: "-apple-system,BlinkMacSystemFont,'PingFang SC','Hiragino Sans GB','Microsoft YaHei',sans-serif",
          }}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>
    </div>
  );
}
