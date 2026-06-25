import React from 'react';
import { Result, Button, Typography, Card } from 'antd';
import { SmileOutlined, ToolOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

const { Title, Text } = Typography;

export default function ComingSoon() {
  const navigate = useNavigate();

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
      <Card className="glass-card" style={{ borderRadius: 24, padding: 24, maxWidth: 500, textAlign: 'center' }}>
        <Result
          icon={<ToolOutlined style={{ color: '#0ea5e9' }} />}
          title={<Title level={3} style={{ margin: 0, color: '#0f172a' }}>Under Development</Title>}
          subTitle={
            <div style={{ marginTop: 16 }}>
              <Text style={{ fontSize: 16, color: '#64748b' }}>
                This feature is currently being built by our amazing team. Please check back later!
              </Text>
            </div>
          }
          extra={
            <Button type="primary" size="large" shape="round" onClick={() => navigate('/app/home')} style={{ marginTop: 24 }}>
              Back to Dashboard
            </Button>
          }
        />
      </Card>
    </div>
  );
}
