import React from 'react';
import { Card, Form, Input, Button, Typography, Row, Col, message } from 'antd';
import { MobileOutlined, LockOutlined, UserOutlined, WalletFilled } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

const { Title, Text } = Typography;

import { useState } from 'react';
import axios from '../../utils/axios';

export default function CustomerRegister() {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const handleRegister = async (values) => {
    setLoading(true);
    try {
      await axios.post('/api/auth/register', {
        phone: values.phone,
        name: values.fullName,
        password: values.password,
        pin: values.pin
      });

      message.success('Đăng ký thành công! Vui lòng đăng nhập.');
      navigate('/app/login');
    } catch (error) {
      message.error(error.response?.data?.message || 'Lỗi đăng ký');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Row justify="center" align="middle" style={{ minHeight: '100vh', background: '#f8fafc', padding: '24px 0' }}>
      <Col xs={24} sm={20} md={16} lg={12} xl={10}>
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
          <Title level={4} style={{ marginTop: 0, marginBottom: 24, textAlign: 'center' }}>Create Account</Title>
          <Form
            form={form}
            layout="vertical"
            onFinish={handleRegister}
          >
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="fullName"
                  rules={[{ required: true, message: 'Please input your full name!' }]}
                  style={{ marginBottom: 16 }}
                >
                  <Input 
                    size="large" 
                    prefix={<UserOutlined style={{ color: '#94a3b8' }} />} 
                    placeholder="Full Name" 
                    style={{ borderRadius: 12 }}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="phone"
                  rules={[{ required: true, message: 'Please input your phone number!' }]}
                  style={{ marginBottom: 16 }}
                >
                  <Input 
                    size="large" 
                    prefix={<MobileOutlined style={{ color: '#94a3b8' }} />} 
                    placeholder="Phone Number" 
                    style={{ borderRadius: 12 }}
                  />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="password"
                  rules={[{ required: true, message: 'Please input a password!' }]}
                  style={{ marginBottom: 16 }}
                >
                  <Input.Password 
                    size="large"
                    prefix={<LockOutlined style={{ color: '#94a3b8' }} />} 
                    placeholder="Password" 
                    style={{ borderRadius: 12 }}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="confirmPassword"
                  dependencies={['password']}
                  rules={[
                    { required: true, message: 'Please confirm your password!' },
                    ({ getFieldValue }) => ({
                      validator(_, value) {
                        if (!value || getFieldValue('password') === value) {
                          return Promise.resolve();
                        }
                        return Promise.reject(new Error('The two passwords do not match!'));
                      },
                    }),
                  ]}
                  style={{ marginBottom: 16 }}
                >
                  <Input.Password 
                    size="large"
                    prefix={<LockOutlined style={{ color: '#94a3b8' }} />} 
                    placeholder="Confirm Password" 
                    style={{ borderRadius: 12 }}
                  />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="pin"
                  rules={[{ required: true, message: 'Please input a 6-digit PIN!' }]}
                  style={{ marginBottom: 16 }}
                >
                  <Input.Password 
                    size="large"
                    prefix={<LockOutlined style={{ color: '#0ea5e9' }} />} 
                    placeholder="6-digit PIN" 
                    maxLength={6}
                    style={{ borderRadius: 12 }}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="confirmPin"
                  dependencies={['pin']}
                  rules={[
                    { required: true, message: 'Please confirm your PIN!' },
                    ({ getFieldValue }) => ({
                      validator(_, value) {
                        if (!value || getFieldValue('pin') === value) {
                          return Promise.resolve();
                        }
                        return Promise.reject(new Error('The two PINs do not match!'));
                      },
                    }),
                  ]}
                  style={{ marginBottom: 16 }}
                >
                  <Input.Password 
                    size="large"
                    prefix={<LockOutlined style={{ color: '#0ea5e9' }} />} 
                    placeholder="Confirm PIN" 
                    maxLength={6}
                    style={{ borderRadius: 12 }}
                  />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item style={{ marginBottom: 0, marginTop: 16 }}>
              <Button 
                type="primary" 
                htmlType="submit" 
                size="large" 
                block 
                loading={loading}
                style={{ borderRadius: 12, height: 48, fontWeight: 600 }}
              >
                Register
              </Button>
            </Form.Item>
          </Form>
        </Card>
        
        <div style={{ textAlign: 'center', marginTop: 24 }}>
          <Text style={{ color: '#64748b' }}>
            Already have an account? <a href="#" onClick={(e) => { e.preventDefault(); navigate('/app/login'); }}>Login</a>
          </Text>
        </div>
      </Col>
    </Row>
  );
}
