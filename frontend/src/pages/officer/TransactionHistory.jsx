import React, { useState, useEffect } from 'react';
import { Card, Typography, Table, Tag, message, Input, Space } from 'antd';
import axios from '../../utils/axios';
import { CheckCircleOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

export default function TransactionHistory() {
  const formatId = (id) => {
    if (!id) return '';
    if (id.length <= 12) return id;
    return `${id.substring(0, 6)}...${id.substring(id.length - 4)}`;
  };

  const columns = [
    { title: 'Trans Ref ID', dataIndex: 'transRefId', key: 'transRefId', align: 'center', render: text => <Text code strong copyable={{ text: text }} title={text}>{formatId(text)}</Text> },
    { title: 'Service ID', dataIndex: 'serviceId', key: 'serviceId', align: 'center', render: text => <Tag color="blue">{text}</Tag> },
    { title: 'Sender Pocket', dataIndex: 'sender', key: 'sender', align: 'center', render: text => <Text copyable={{ text: text }} title={text}>{formatId(text)}</Text> },
    { title: 'Receiver Pocket', dataIndex: 'receiver', key: 'receiver', align: 'center', render: text => <Text copyable={{ text: text }} title={text}>{formatId(text)}</Text> },
    { title: 'Amount', dataIndex: 'amount', key: 'amount', align: 'right', render: text => <Text strong>{text.toLocaleString()}</Text> },
    { title: 'Fee', dataIndex: 'fee', key: 'fee', align: 'right', render: text => <Text type="danger">{text.toLocaleString()}</Text> },
    { title: 'Total Amount', dataIndex: 'totalAmount', key: 'totalAmount', align: 'right', render: text => <Text type="success" strong>{text.toLocaleString()}</Text> },
    { title: 'Biller Ref ID', dataIndex: 'billerRefId', key: 'billerRefId', align: 'center', render: text => text ? <Text code copyable={{ text: text }} title={text}>{formatId(text)}</Text> : <Text type="secondary" italic>N/A</Text> },
    { title: 'Status', dataIndex: 'status', key: 'status', align: 'center', render: text => <Tag color="success" icon={<CheckCircleOutlined />}>{text.toUpperCase()}</Tag> },
    { title: 'Created At', dataIndex: 'createdAt', key: 'createdAt', align: 'center' }
  ];

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const [searchTransRef, setSearchTransRef] = useState('');
  const [searchServiceId, setSearchServiceId] = useState('');

  const fetchTransactions = async (page = 1, transRefId = searchTransRef, serviceId = searchServiceId) => {
    setLoading(true);
    try {
      const response = await axios.post('/api/officer/transactions/list', {
        page: page,
        limit: pagination.pageSize,
        transRefId: transRefId || undefined,
        serviceId: serviceId || undefined
      });
      const { items, total } = response.data.data;
      
      const formattedData = items.map(item => ({
        key: item.id,
        transRefId: item.transRefId,
        serviceId: item.serviceId,
        sender: item.sender,
        receiver: item.receiver,
        amount: item.amount,
        fee: item.fee,
        totalAmount: item.totalAmount,
        billerRefId: item.billerRefId,
        status: item.status,
        createdAt: new Date(item.createdAt).toLocaleString('vi-VN')
      }));

      setData(formattedData);
      setPagination(prev => ({ ...prev, current: page, total: total }));
    } catch (error) {
      message.error(error.response?.data?.message || 'Lỗi tải danh sách giao dịch');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  const handleTableChange = (newPagination) => {
    fetchTransactions(newPagination.current);
  };

  const handleSearchTransRef = (value) => {
    setSearchTransRef(value);
    setPagination(prev => ({ ...prev, current: 1 }));
    fetchTransactions(1, value, searchServiceId);
  };

  const handleSearchServiceId = (value) => {
    setSearchServiceId(value);
    setPagination(prev => ({ ...prev, current: 1 }));
    fetchTransactions(1, searchTransRef, value);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <Space>
          <Input.Search 
            placeholder="Trans Ref ID..." 
            allowClear
            onSearch={handleSearchTransRef} 
            style={{ width: 200 }} 
            size="large"
          />
          <Input.Search 
            placeholder="Service ID..." 
            allowClear
            onSearch={handleSearchServiceId} 
            style={{ width: 180 }} 
            size="large"
          />
        </Space>
      </div>
      <Card className="glass-card" styles={{ body: { padding: 0, overflow: 'hidden' } }}>
        <Table 
          columns={columns} 
          dataSource={data} 
          pagination={{ ...pagination, showSizeChanger: false }} 
          onChange={handleTableChange}
          loading={loading}
          rowClassName="smart-row" 
        />
      </Card>
    </div>
  );
}
