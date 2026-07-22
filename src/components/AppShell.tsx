"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Layout, Menu, Typography, message } from "antd";
import { FileAddOutlined, HomeOutlined, SettingOutlined, CheckSquareOutlined, SendOutlined, LogoutOutlined, FormatPainterOutlined } from "@ant-design/icons";

const { Header, Content } = Layout;

export default function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    message.success("已退出登录");
    router.push("/login");
    router.refresh();
  };

  return (
    <Layout className="page-shell">
      <Header className="app-header">
        <Link href="/" className="app-header-logo">
          <img src="/geo-logo.png" alt="GEO" className="app-header-logo-icon" />
          <span>GEO 内容中台</span>
        </Link>
        <Menu
          theme="dark"
          mode="horizontal"
          selectable={false}
          items={[
            { key: "home", icon: <HomeOutlined />, label: <Link href="/">工作台</Link> },
            { key: "new", icon: <FileAddOutlined />, label: <Link href="/contents/new">新建主文</Link> },
            { key: "gzh-format", icon: <FormatPainterOutlined />, label: <Link href="/gzh-format">公众号排版</Link> },
            { key: "review", icon: <CheckSquareOutlined />, label: <Link href="/review">审核中心</Link> },
            { key: "publish-records", icon: <SendOutlined />, label: <Link href="/publish-records">发布记录</Link> },
            { key: "prompts", icon: <SettingOutlined />, label: <Link href="/settings/prompts">Prompt 模板</Link> },
          ]}
        />
        <Link href="/contents/new">
          <Button type="primary" className="header-action-btn">新建主文</Button>
        </Link>
        <Button icon={<LogoutOutlined />} onClick={logout} className="header-logout-btn" style={{ marginLeft: 8 }}>退出</Button>
      </Header>
      <Content className="app-content">
        <div className="content-container">{children}</div>
      </Content>
    </Layout>
  );
}

export function PageTitle({ title, description }: { title: string; description?: string }) {
  return (
    <div className="page-title">
      <Typography.Title level={2}>{title}</Typography.Title>
      {description && <Typography.Paragraph type="secondary">{description}</Typography.Paragraph>}
    </div>
  );
}
