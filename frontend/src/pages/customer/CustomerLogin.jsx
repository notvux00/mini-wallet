import React from 'react';
import { Card, Form, Input, Button, Typography, Row, Col } from 'antd';
import { MobileOutlined, LockOutlined, RightOutlined, WalletFilled } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

const { Title, Text } = Typography;

import { message } from 'antd';
import { useContext, useState } from 'react';
import axios from '../../utils/axios';
import { AuthContext } from '../../context/AuthContext';

export default function CustomerLogin() {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const { login } = useContext(AuthContext);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (values) => {
    setLoading(true);
    try {
      const response = await axios.post('/api/auth/login', {
        phone: values.phone,
        password: values.password,
      });

      const { token, user } = response.data.data;
      login(user, token);
      message.success('Đăng nhập thành công!');
      navigate('/app/home');
    } catch (error) {
      message.error(error.response?.data?.message || 'Lỗi đăng nhập');
    } finally {
      setLoading(false);
    }
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
          <Title level={4} style={{ marginTop: 0, marginBottom: 24, textAlign: 'center' }}>Welcome Back</Title>
            <Form
              form={form}
              layout="vertical"
              onFinish={handleLogin}
            >
            <Form.Item
              name="phone"
              rules={[{ required: true, message: 'Please input your phone number!' }]}
            >
              <Input 
                size="large" 
                prefix={<MobileOutlined style={{ color: '#94a3b8' }} />} 
                placeholder="Phone Number" 
                style={{ borderRadius: 12 }}
              />
            </Form.Item>

            <Form.Item
              name="password"
              rules={[{ required: true, message: 'Please input your password!' }]}
            >
              <Input.Password 
                size="large"
                prefix={<LockOutlined style={{ color: '#94a3b8' }} />} 
                placeholder="Password" 
                style={{ borderRadius: 12 }}
              />
            </Form.Item>

            <Form.Item style={{ marginBottom: 0, marginTop: 32 }}>
              <Button 
                type="primary" 
                htmlType="submit" 
                size="large" 
                block 
                loading={loading}
                style={{ borderRadius: 12, height: 48, fontWeight: 600 }}
              >
                Login
              </Button>
            </Form.Item>
          </Form>
        </Card>
        
        <div style={{ textAlign: 'center', marginTop: 24 }}>
          <Text style={{ color: '#64748b' }}>
            Don't have an account? <a href="#" onClick={(e) => { e.preventDefault(); navigate('/app/register'); }}>Register now</a>
          </Text>
        </div>
      </Col>
    </Row>
  );
}
