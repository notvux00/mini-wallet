import React, { useState, useEffect } from 'react';
import { Card, Typography, Table, Tag, message } from 'antd';
import axios from '../../utils/axios';
import { ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons';

const { Title } = Typography;

export default function CustomerHistory() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });

  const fetchHistory = async (page = 1) => {
    setLoading(true);
    try {
      const response = await axios.post('/api/customer/transactions/history', {
        page: page,
        limit: pagination.pageSize
      });
      setHistory(response.data.data || []);
      // Giả sử API trả về total count trong tương lai, hiện tại cứ để tạm
    } catch (error) {
      console.error('Không tải được lịch sử', error);
      message.error('Không thể tải lịch sử giao dịch.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory(pagination.current);
  }, []);

  const handleTableChange = (newPagination) => {
    setPagination(newPagination);
    fetchHistory(newPagination.current);
  };

  const columns = [
    {
      title: 'Time',
      dataIndex: 'date',
      key: 'date',
    },
    {
      title: 'Description',
      dataIndex: 'desc',
      key: 'desc',
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      align: 'right',
      render: (amount) => {
        const isNegative = amount < 0;
        return (
          <strong style={{ color: isNegative ? '#ef4444' : '#22c55e' }}>
            {isNegative ? <ArrowDownOutlined style={{fontSize: 12, marginRight: 4}} /> : <ArrowUpOutlined style={{fontSize: 12, marginRight: 4}} />}
            {Math.abs(amount).toLocaleString('vi-VN')} đ
          </strong>
        );
      }
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      align: 'center',
      render: (type) => <Tag color="blue">{type}</Tag>
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      align: 'center',
      render: (status) => <Tag color="success">{status.toUpperCase()}</Tag>
    }
  ];

  return (
    <div>
      <Title level={3} style={{ marginBottom: 24, color: '#0f172a' }}>Transaction History</Title>
      <Card className="glass-card" style={{ borderRadius: 16 }}>
        <Table 
          columns={columns} 
          dataSource={history} 
          rowKey="id"
          pagination={pagination}
          loading={loading}
          onChange={handleTableChange}
        />
      </Card>
    </div>
  );
}
