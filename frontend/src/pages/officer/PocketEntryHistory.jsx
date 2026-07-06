import React, { useState, useEffect } from 'react';
import { Card, Typography, Table, Tag, message, Input, Space } from 'antd';
import axios from '../../utils/axios';
import { CheckCircleOutlined, SyncOutlined, CloseCircleOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

export default function PocketEntryHistory() {
  const formatId = (id) => {
    if (!id) return '';
    if (id.length <= 12) return id;
    return `${id.substring(0, 6)}...${id.substring(id.length - 4)}`;
  };

  const columns = [
    { title: 'Trans Ref ID', dataIndex: 'transRefId', key: 'transRefId', align: 'center', render: text => <Text code strong copyable={{ text: text }} title={text}>{formatId(text)}</Text> },
    { title: 'Step', dataIndex: 'stepOrder', key: 'stepOrder', align: 'center', render: text => <Tag color="purple">Step {text}</Tag> },
    { title: 'Debit Pocket', dataIndex: 'debit', key: 'debit', align: 'center', render: text => <Text copyable={{ text: text }} title={text}>{formatId(text)}</Text> },
    { title: 'Credit Pocket', dataIndex: 'credit', key: 'credit', align: 'center', render: text => <Text copyable={{ text: text }} title={text}>{formatId(text)}</Text> },
    { title: 'Amount', dataIndex: 'amount', key: 'amount', align: 'right', render: text => <Text strong style={{ color: '#0ea5e9' }}>{(text ?? 0).toLocaleString()}</Text> },
    { title: 'Status', dataIndex: 'status', key: 'status', align: 'center', render: text => {
        if (text === 'settled') return <Tag color="success" icon={<CheckCircleOutlined />}>SETTLED</Tag>;
        if (text === 'failed') return <Tag color="error" icon={<CloseCircleOutlined />}>FAILED</Tag>;
        return <Tag color="processing" icon={<SyncOutlined spin />}>{text?.toUpperCase()}</Tag>;
    }},
    { title: 'Created At', dataIndex: 'createdAt', key: 'createdAt', align: 'center', render: text => new Date(text).toLocaleString('vi-VN') }
  ];

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const [searchTransRef, setSearchTransRef] = useState('');
  const [searchDebit, setSearchDebit] = useState('');
  const [searchCredit, setSearchCredit] = useState('');

  const fetchEntries = async (page = 1, transRefId = searchTransRef, debit = searchDebit, credit = searchCredit) => {
    setLoading(true);
    try {
      const response = await axios.post('/api/officer/pocket-entries/list', {
        page: page,
        limit: pagination.pageSize,
        transRefId: transRefId || undefined,
        debit: debit || undefined,
        credit: credit || undefined
      });
      const { items, total } = response.data.data;
      
      const formattedData = items.map(item => ({
        key: item.id,
        transRefId: item.transRefId,
        stepOrder: item.stepOrder,
        debit: item.debit,
        credit: item.credit,
        amount: item.amount,
        status: item.status,
        createdAt: item.createdAt
      }));

      setData(formattedData);
      setPagination(prev => ({ ...prev, current: page, total: total }));
    } catch (error) {
      message.error(error.response?.data?.message || 'Lỗi tải danh sách bút toán');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEntries();
  }, []);

  const handleTableChange = (newPagination) => {
    fetchEntries(newPagination.current);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <Space>
          <Input.Search 
            placeholder="Trans Ref ID..." 
            allowClear
            onSearch={val => {
              setSearchTransRef(val);
              setPagination(prev => ({ ...prev, current: 1 }));
              fetchEntries(1, val, searchDebit, searchCredit);
            }} 
            style={{ width: 200 }} 
            size="large"
          />
          <Input.Search 
            placeholder="Debit Pocket..." 
            allowClear
            onSearch={val => {
              setSearchDebit(val);
              setPagination(prev => ({ ...prev, current: 1 }));
              fetchEntries(1, searchTransRef, val, searchCredit);
            }} 
            style={{ width: 160 }} 
            size="large"
          />
          <Input.Search 
            placeholder="Credit Pocket..." 
            allowClear
            onSearch={val => {
              setSearchCredit(val);
              setPagination(prev => ({ ...prev, current: 1 }));
              fetchEntries(1, searchTransRef, searchDebit, val);
            }} 
            style={{ width: 160 }} 
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
