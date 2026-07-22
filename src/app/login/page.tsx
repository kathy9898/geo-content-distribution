"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Alert, Button, Card, Form, Input, Typography, message } from "antd";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);

  const onFinish = async (values: { password: string }) => {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "登录失败");
      message.success("登录成功");
      router.push(searchParams.get("next") || "/");
      router.refresh();
    } catch (error) {
      message.error(error instanceof Error ? error.message : "登录失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login-page">
      <Card className="login-card">
        <div className="login-logo">
          <span className="login-logo-icon">G</span>
          <div>
            <Typography.Title level={3} className="login-title">GEO 内容中台</Typography.Title>
            <Typography.Text className="login-subtitle">内容调优、平台改写与分发记录工作台</Typography.Text>
          </div>
        </div>
        <Alert type="info" showIcon message="内部工具，请输入访问密码继续使用。" style={{ margin: "24px 0" }} />
        <Form layout="vertical" onFinish={onFinish}>
          <Form.Item name="password" label="访问密码" rules={[{ required: true, message: "请输入访问密码" }]}>
            <Input.Password autoFocus placeholder="请输入访问密码" size="large" />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={loading} block size="large">登录</Button>
        </Form>
      </Card>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginContent />
    </Suspense>
  );
}
