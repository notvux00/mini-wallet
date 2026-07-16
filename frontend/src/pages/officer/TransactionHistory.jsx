 
import { useState, useEffect, useContext } from 'react';
import { Card, Typography, Table, Tag, Input, Space } from 'antd';
import { useTransactions } from '../../hooks/useOfficer';
import { CheckCircleOutlined } from '@ant-design/icons';

const { Text } = Typography;
import { SocketContext } from '../../context/SocketContext';

export default function TransactionHistory() {
  const formatId = (id) => {
    if (!id) return '';
    if (id.length <= 12) return id;
    return `${id.substring(0, 6)}...${id.substring(id.length - 4)}`;
  };

  const columns = [
    { title: 'Mã tham chiếu', dataIndex: 'transRefId', key: 'transRefId', align: 'center', render: text => <Text code strong copyable={{ text: text }} title={text}>{formatId(text)}</Text> },
    { title: 'Mã dịch vụ', dataIndex: 'serviceId', key: 'serviceId', align: 'center', render: text => <Tag color="blue">{text || 'N/A'}</Tag> },
    { title: 'Ví gửi', dataIndex: 'sender', key: 'sender', align: 'center', render: text => text ? <Text copyable={{ text: text }} title={text}>{formatId(text)}</Text> : <Text type="secondary" italic>N/A</Text> },
    { title: 'Ví nhận', dataIndex: 'receiver', key: 'receiver', align: 'center', render: text => text ? <Text copyable={{ text: text }} title={text}>{formatId(text)}</Text> : <Text type="secondary" italic>N/A</Text> },
    { title: 'Số tiền', dataIndex: 'amount', key: 'amount', align: 'right', render: text => <Text strong>{(text ?? 0).toLocaleString()}</Text> },
    { title: 'Phí', dataIndex: 'fee', key: 'fee', align: 'right', render: text => <Text type="danger">{(text ?? 0).toLocaleString()}</Text> },
    { title: 'Tổng cộng', dataIndex: 'totalAmount', key: 'totalAmount', align: 'right', render: text => <Text type="success" strong>{(text ?? 0).toLocaleString()}</Text> },
    { title: 'Mã đối soát', dataIndex: 'billerRefId', key: 'billerRefId', align: 'center', render: text => text ? <Text code copyable={{ text: text }} title={text}>{formatId(text)}</Text> : <Text type="secondary" italic>N/A</Text> },
    { title: 'Trạng thái', dataIndex: 'status', key: 'status', align: 'center', render: text => <Tag color="success" icon={<CheckCircleOutlined />}>{(text || 'done').toUpperCase()}</Tag> },
    { title: 'Mô tả', dataIndex: 'description', key: 'description', align: 'center', render: text => <Text type="secondary" italic>{text || 'N/A'}</Text> },
    { title: 'Ngày tạo', dataIndex: 'createdAt', key: 'createdAt', align: 'center' }
  ];

  const [pagination, setPagination] = useState({ current: 1, pageSize: 10 });
  const [searchTransRef, setSearchTransRef] = useState('');
  const [searchServiceId, setSearchServiceId] = useState('');
  const { io } = useContext(SocketContext);

  const { data: responseData, isLoading, refetch } = useTransactions({
    page: pagination.current,
    limit: pagination.pageSize,
    transRefId: searchTransRef || undefined,
    serviceId: searchServiceId || undefined
  });

  const items = responseData?.items || [];
  const total = responseData?.total || 0;

  const data = items.map(item => ({
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
    description: item.description,
    createdAt: new Date(item.createdAt).toLocaleString('vi-VN')
  }));

  useEffect(() => {
    if (io && io.socket) {
      const handleUpdate = () => {
        refetch();
      };
      io.socket.on('transaction_updated', handleUpdate);
      return () => {
        io.socket.off('transaction_updated', handleUpdate);
      };
    }
  }, [io, refetch]);

  const handleTableChange = (newPagination) => {
    setPagination({ current: newPagination.current, pageSize: newPagination.pageSize });
  };

  const handleSearchTransRef = (value) => {
    setSearchTransRef(value);
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  const handleSearchServiceId = (value) => {
    setSearchServiceId(value);
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <Space>
          <Input.Search 
            placeholder="Mã tham chiếu..." 
            allowClear
            onSearch={handleSearchTransRef} 
            style={{ width: 200 }} 
            size="large"
          />
          <Input.Search 
            placeholder="Mã dịch vụ..." 
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
          pagination={{ ...pagination, total, showSizeChanger: false }} 
          onChange={handleTableChange}
          loading={isLoading}
          rowClassName="smart-row" 
        />
      </Card>
    </div>
  );
}
