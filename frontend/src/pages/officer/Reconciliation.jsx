import React, { useState, useEffect } from 'react';
import { Table, Button, Card, Typography, Tag, Space, Alert, message, Statistic, Row, Col } from 'antd';
import { CheckCircleOutlined, ExclamationCircleOutlined, PlayCircleOutlined } from '@ant-design/icons';
import axios from '../../utils/axios';

const { Title, Text } = Typography;

export default function Reconciliation() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const res = await axios.post('/api/officer/reconciliation/list');
      if (res.data.err === 0) {
        setReports(res.data.data || []);
      } else {
        message.error(res.data.msg);
      }
    } catch (err) {
      message.error('Lỗi khi tải lịch sử đối soát');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleRunReconciliation = async () => {
    try {
      setRunning(true);
      const res = await axios.post('/api/officer/reconciliation/run');
      if (res.data.err === 0) {
        message.success('Đối soát hoàn tất!');
        fetchReports();
      } else {
        message.error(res.data.msg);
      }
    } catch (err) {
      message.error('Lỗi khi chạy đối soát');
    } finally {
      setRunning(false);
    }
  };

  const columns = [
    {
      title: 'Thời gian',
      dataIndex: 'runAt',
      key: 'runAt',
      render: (val) => new Date(val).toLocaleString()
    },
    {
      title: 'Ví Khách (VNĐ)',
      dataIndex: 'totalCustomerBalance',
      key: 'totalCustomerBalance',
      render: (val) => val.toLocaleString()
    },
    {
      title: 'Ví Hệ thống (VNĐ)',
      dataIndex: 'totalSystemBalance',
      key: 'totalSystemBalance',
      render: (val) => val.toLocaleString()
    },
    {
      title: 'Ví Ngân hàng (VNĐ)',
      dataIndex: 'totalBankBalance',
      key: 'totalBankBalance',
      render: (val) => val.toLocaleString()
    },
    {
      title: 'Độ lệch (VNĐ)',
      dataIndex: 'discrepancy',
      key: 'discrepancy',
      render: (val) => {
        if (val === 0) return <Text type="success">0</Text>;
        return <Text type="danger">{val.toLocaleString()}</Text>;
      }
    },
    {
      title: 'Số ví sai Checksum',
      dataIndex: 'tamperedPockets',
      key: 'tamperedPockets',
      render: (val) => {
        const count = val ? val.length : 0;
        return count > 0 ? <Text type="danger">{count} ví</Text> : <Text type="success">0</Text>;
      }
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (val) => (
        <Tag color={val === 'SUCCESS' ? 'green' : 'red'}>
          {val === 'SUCCESS' ? 'AN TOÀN' : 'CẢNH BÁO'}
        </Tag>
      )
    }
  ];

  const latestReport = reports[0];
  const isSafe = latestReport && latestReport.status === 'SUCCESS';

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={2} style={{ margin: 0 }}>Đối soát Hệ thống</Title>
        <Button 
          type="primary" 
          icon={<PlayCircleOutlined />} 
          loading={running}
          onClick={handleRunReconciliation}
          size="large"
        >
          Chạy đối soát ngay
        </Button>
      </div>

      {latestReport && (
        <Card style={{ marginBottom: 24, background: isSafe ? '#f6ffed' : '#fff2f0', borderColor: isSafe ? '#b7eb8f' : '#ffccc7' }}>
          <Row align="middle" gutter={16}>
            <Col>
              {isSafe ? 
                <CheckCircleOutlined style={{ fontSize: 48, color: '#52c41a' }} /> : 
                <ExclamationCircleOutlined style={{ fontSize: 48, color: '#ff4d4f' }} />
              }
            </Col>
            <Col flex="auto">
              <Title level={3} style={{ color: isSafe ? '#389e0d' : '#cf1322', margin: 0 }}>
                {isSafe ? 'HỆ THỐNG AN TOÀN' : 'CẢNH BÁO LỆCH TIỀN QUAN TRỌNG'}
              </Title>
              <Text type="secondary">
                Lần kiểm tra cuối: {new Date(latestReport.runAt).toLocaleString()}
              </Text>
            </Col>
            {!isSafe && (
              <Col>
                <Statistic title="Độ lệch tiền mặt" value={latestReport.discrepancy} suffix="VNĐ" valueStyle={{ color: '#cf1322' }} />
              </Col>
            )}
          </Row>
        </Card>
      )}

      <Card title="Lịch sử Đối soát">
        <Table 
          columns={columns} 
          dataSource={reports} 
          rowKey="id" 
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Card>
    </div>
  );
}
