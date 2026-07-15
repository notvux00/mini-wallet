import React, { useContext, useEffect } from 'react';
import { Card, Form, Input, Button, Typography, Row, Col, notification } from 'antd';
import { MobileOutlined, LockOutlined, WalletFilled } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { useCustomerLogin } from '../../hooks/useAuth';

const { Title, Text } = Typography;

export default function CustomerLogin() {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const { login, user } = useContext(AuthContext);
  const loginMutation = useCustomerLogin();

  useEffect(() => {
    if (user && user.role === 'customer') {
      navigate('/app/home');
    }
  }, [user, navigate]);

  const handleLogin = (values) => {
    loginMutation.mutate({
      phone: values.phone,
      password: values.password,
    }, {
      onSuccess: (data) => {
        const { token, user } = data;
        login(user, token);
        notification.success({
          message: 'Đăng nhập thành công',
          description: 'Chào mừng bạn quay lại Mini Wallet!',
          placement: 'topRight',
        });
        navigate('/app/home');
      },
      onError: (error) => {
        notification.error({
          message: 'Lỗi đăng nhập',
          description: error.message || 'Số điện thoại hoặc mật khẩu không đúng',
          placement: 'topRight',
        });
      }
    });
  };

  return (
    <Row justify="center" align="middle" style={{ minHeight: '100vh', background: '#f8fafc' }}>
      <Col xs={24} sm={16} md={12} lg={8} xl={6}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ marginBottom: 16 }}>
            <WalletFilled style={{ color: '#0ea5e9', fontSize: 48 }} />
          </div>
          <Title level={3} style={{ margin: 0, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.5px' }}>
            Mini<span style={{ color: '#0ea5e9' }}>Wallet</span>
          </Title>
          <Text style={{ color: '#64748b' }}>Ví nhỏ - Nhỏ nhưng có võ</Text>
        </div>

        <Card className="glass-card" style={{ borderRadius: 24, padding: 8 }}>
          <Title level={4} style={{ marginTop: 0, marginBottom: 24, textAlign: 'center' }}>Đăng nhập</Title>
            <Form
              form={form}
              layout="vertical"
              onFinish={handleLogin}
            >
            <Form.Item
              name="phone"
              rules={[{ required: true, message: 'Vui lòng nhập số điện thoại!' }]}
            >
              <Input 
                size="large" 
                prefix={<MobileOutlined style={{ color: '#94a3b8' }} />} 
                placeholder="Số điện thoại" 
                style={{ borderRadius: 12 }}
              />
            </Form.Item>

            <Form.Item
              name="password"
              rules={[{ required: true, message: 'Vui lòng nhập mật khẩu!' }]}
            >
              <Input.Password 
                size="large"
                prefix={<LockOutlined style={{ color: '#94a3b8' }} />} 
                placeholder="Mật khẩu" 
                style={{ borderRadius: 12 }}
              />
            </Form.Item>

            <Form.Item style={{ marginBottom: 0, marginTop: 32 }}>
              <Button 
                type="primary" 
                htmlType="submit" 
                size="large" 
                block 
                loading={loginMutation.isPending}
                style={{ borderRadius: 12, height: 48, fontWeight: 600 }}
              >
                Đăng nhập
              </Button>
            </Form.Item>
          </Form>
        </Card>
        
        <div style={{ textAlign: 'center', marginTop: 24 }}>
          <Text style={{ color: '#64748b' }}>
            Chưa có tài khoản? <a href="#" onClick={(e) => { e.preventDefault(); navigate('/app/register'); }}>Đăng ký ngay</a>
          </Text>
        </div>
      </Col>
    </Row>
  );
}
