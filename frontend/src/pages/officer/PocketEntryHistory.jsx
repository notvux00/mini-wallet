 
import { useState, useEffect, useContext } from 'react';
import { Card, Typography, Table, Tag, Input, Space } from 'antd';
import { usePocketEntries } from '../../hooks/useOfficer';
import { CheckCircleOutlined, SyncOutlined, CloseCircleOutlined } from '@ant-design/icons';

const { Text } = Typography;
import { SocketContext } from '../../context/SocketContext';

export default function PocketEntryHistory() {
  const formatId = (id) => {
    if (!id) return '';
    if (id.length <= 12) return id;
    return `${id.substring(0, 6)}...${id.substring(id.length - 4)}`;
  };

  const columns = [
    { title: 'Mã tham chiếu', dataIndex: 'transRefId', key: 'transRefId', align: 'center', render: text => <Text code strong copyable={{ text: text }} title={text}>{formatId(text)}</Text> },
    { title: 'Bước', dataIndex: 'stepOrder', key: 'stepOrder', align: 'center', render: text => <Tag color="purple">Bước {text}</Tag> },
    { title: 'Ví Gửi', dataIndex: 'debit', key: 'debit', align: 'center', render: text => <Text copyable={{ text: text }} title={text}>{formatId(text)}</Text> },
    { title: 'Ví Nhận', dataIndex: 'credit', key: 'credit', align: 'center', render: text => <Text copyable={{ text: text }} title={text}>{formatId(text)}</Text> },
    { title: 'Số tiền', dataIndex: 'amount', key: 'amount', align: 'right', render: text => <Text strong style={{ color: '#0ea5e9' }}>{(text ?? 0).toLocaleString()}</Text> },
    { title: 'Trạng thái', dataIndex: 'status', key: 'status', align: 'center', render: text => {
        if (text === 'settled') return <Tag color="success" icon={<CheckCircleOutlined />}>HOÀN TẤT</Tag>;
        if (text === 'failed') return <Tag color="error" icon={<CloseCircleOutlined />}>THẤT BẠI</Tag>;
        return <Tag color="processing" icon={<SyncOutlined spin />}>{text?.toUpperCase()}</Tag>;
    }},
    { title: 'Tạo lúc', dataIndex: 'createdAt', key: 'createdAt', align: 'center', render: text => new Date(text).toLocaleString('vi-VN') }
  ];

  const [pagination, setPagination] = useState({ current: 1, pageSize: 10 });
  const [searchTransRef, setSearchTransRef] = useState('');
  const [searchDebit, setSearchDebit] = useState('');
  const [searchCredit, setSearchCredit] = useState('');
  const { io } = useContext(SocketContext);

  const { data: responseData, isLoading, refetch } = usePocketEntries({
    page: pagination.current,
    limit: pagination.pageSize,
    transRefId: searchTransRef || undefined,
    debit: searchDebit || undefined,
    credit: searchCredit || undefined
  });

  const items = responseData?.items || [];
  const total = responseData?.total || 0;

  const data = items.map(item => ({
    key: item.id,
    transRefId: item.transRefId,
    stepOrder: item.stepOrder,
    debit: item.debit,
    credit: item.credit,
    amount: item.amount,
    status: item.status,
    createdAt: item.createdAt
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
            }} 
            style={{ width: 200 }} 
            size="large"
          />
          <Input.Search 
            placeholder="Tìm Ví Gửi..." 
            allowClear
            onSearch={val => {
              setSearchDebit(val);
              setPagination(prev => ({ ...prev, current: 1 }));
            }} 
            style={{ width: 160 }} 
            size="large"
          />
          <Input.Search 
            placeholder="Tìm Ví Nhận..." 
            allowClear
            onSearch={val => {
              setSearchCredit(val);
              setPagination(prev => ({ ...prev, current: 1 }));
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
          pagination={{ ...pagination, total, showSizeChanger: false }} 
          onChange={handleTableChange}
          loading={isLoading}
          rowClassName="smart-row" 
        />
      </Card>
    </div>
  );
}
