import React, { useContext, useEffect } from 'react';
import { Card, Form, Input, Button, Typography, Row, Col, notification } from 'antd';
import { MobileOutlined, LockOutlined, UserOutlined, WalletFilled } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { useCustomerRegister } from '../../hooks/useAuth';

const { Title, Text } = Typography;

export default function CustomerRegister() {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const { user } = useContext(AuthContext);
  const registerMutation = useCustomerRegister();

  useEffect(() => {
    if (user && user.role === 'customer') {
      navigate('/app/home');
    }
  }, [user, navigate]);

  const handleRegister = (values) => {
    registerMutation.mutate({
      phone: values.phone,
      name: values.fullName,
      password: values.password,
      pin: values.pin
    }, {
      onSuccess: () => {
        notification.success({
          message: 'Đăng ký thành công',
          description: 'Vui lòng đăng nhập bằng tài khoản vừa tạo.',
          placement: 'topRight',
        });
        navigate('/app/login');
      },
      onError: (error) => {
        notification.error({
          message: 'Lỗi đăng ký',
          description: error.message || 'Có lỗi xảy ra',
          placement: 'topRight',
        });
      }
    });
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
          <Title level={4} style={{ marginTop: 0, marginBottom: 24, textAlign: 'center' }}>Đăng ký tài khoản</Title>
          <Form
            form={form}
            layout="vertical"
            onFinish={handleRegister}
          >
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="fullName"
                  rules={[{ required: true, message: 'Vui lòng nhập họ tên!' }]}
                  style={{ marginBottom: 16 }}
                >
                  <Input 
                    size="large" 
                    prefix={<UserOutlined style={{ color: '#94a3b8' }} />} 
                    placeholder="Họ và tên" 
                    style={{ borderRadius: 12 }}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="phone"
                  rules={[{ required: true, message: 'Vui lòng nhập số điện thoại!' }]}
                  style={{ marginBottom: 16 }}
                >
                  <Input 
                    size="large" 
                    prefix={<MobileOutlined style={{ color: '#94a3b8' }} />} 
                    placeholder="Số điện thoại" 
                    style={{ borderRadius: 12 }}
                  />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="password"
                  rules={[{ required: true, message: 'Vui lòng nhập mật khẩu!' }]}
                  style={{ marginBottom: 16 }}
                >
                  <Input.Password 
                    size="large"
                    prefix={<LockOutlined style={{ color: '#94a3b8' }} />} 
                    placeholder="Mật khẩu" 
                    style={{ borderRadius: 12 }}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="confirmPassword"
                  dependencies={['password']}
                  rules={[
                    { required: true, message: 'Vui lòng xác nhận mật khẩu!' },
                    ({ getFieldValue }) => ({
                      validator(_, value) {
                        if (!value || getFieldValue('password') === value) {
                          return Promise.resolve();
                        }
                        return Promise.reject(new Error('Mật khẩu không khớp!'));
                      },
                    }),
                  ]}
                  style={{ marginBottom: 16 }}
                >
                  <Input.Password 
                    size="large"
                    prefix={<LockOutlined style={{ color: '#94a3b8' }} />} 
                    placeholder="Xác nhận mật khẩu" 
                    style={{ borderRadius: 12 }}
                  />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="pin"
                  rules={[{ required: true, message: 'Vui lòng nhập mã PIN 6 số!' }]}
                  style={{ marginBottom: 16 }}
                >
                  <Input.Password 
                    size="large"
                    prefix={<LockOutlined style={{ color: '#0ea5e9' }} />} 
                    placeholder="Mã PIN 6 số" 
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
                    { required: true, message: 'Vui lòng xác nhận mã PIN!' },
                    ({ getFieldValue }) => ({
                      validator(_, value) {
                        if (!value || getFieldValue('pin') === value) {
                          return Promise.resolve();
                        }
                        return Promise.reject(new Error('Mã PIN không khớp!'));
                      },
                    }),
                  ]}
                  style={{ marginBottom: 16 }}
                >
                  <Input.Password 
                    size="large"
                    prefix={<LockOutlined style={{ color: '#0ea5e9' }} />} 
                    placeholder="Xác nhận mã PIN" 
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
                loading={registerMutation.isPending}
                style={{ borderRadius: 12, height: 48, fontWeight: 600 }}
              >
                Đăng ký
              </Button>
            </Form.Item>
          </Form>
        </Card>
        
        <div style={{ textAlign: 'center', marginTop: 24 }}>
          <Text style={{ color: '#64748b' }}>
            Đã có tài khoản? <a href="#" onClick={(e) => { e.preventDefault(); navigate('/app/login'); }}>Đăng nhập</a>
          </Text>
        </div>
      </Col>
    </Row>
  );
}
