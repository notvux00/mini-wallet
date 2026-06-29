import React, { useState, useContext } from 'react';
import { Form, Input, Button, Typography, message } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate, Link } from 'react-router-dom';
import axios from '../utils/axios';
import { AuthContext } from '../context/AuthContext';

const { Title, Text } = Typography;

const Login = () => {
  const [loading, setLoading] = useState(false);
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const onFinish = async (values) => {
    setLoading(true);
    try {
      const response = await axios.post('/api/auth/login', {
        phone: values.phone,
        password: values.password,
      });

      const { token, user } = response.data.data;
      login(user, token);
      message.success('Đăng nhập thành công!');
      navigate('/dashboard');
    } catch (error) {
      message.error(error.response?.data?.message || 'Lỗi đăng nhập');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <Title level={2} style={{ margin: 0, color: '#1e3c72' }}>Mini Wallet</Title>
          <Text type="secondary">Đăng nhập để quản lý ví của bạn</Text>
        </div>

        <Form name="login" onFinish={onFinish} layout="vertical" size="large">
          <Form.Item
            name="phone"
            rules={[{ required: true, message: 'Vui lòng nhập số điện thoại!' }]}
          >
            <Input prefix={<UserOutlined />} placeholder="Số điện thoại" />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: 'Vui lòng nhập mật khẩu!' }]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="Mật khẩu" />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block style={{ background: '#1e3c72' }}>
              Đăng nhập
            </Button>
          </Form.Item>
          
          <div style={{ textAlign: 'center' }}>
            <Text type="secondary">
              Chưa có tài khoản? <Link to="/register">Đăng ký ngay</Link>
            </Text>
          </div>
        </Form>
      </div>
    </div>
  );
};

export default Login;
