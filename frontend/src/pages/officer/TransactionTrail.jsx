 
import { useState, useEffect, useContext } from 'react';
import { Card, Typography, Table, Tag, Button, Modal, Tabs, Timeline, Select, Input, Space } from 'antd';
import { useTrails } from '../../hooks/useOfficer';
import { FileTextOutlined, EyeOutlined } from '@ant-design/icons';

const { Text } = Typography;
import { SocketContext } from '../../context/SocketContext';
const { TabPane } = Tabs;

export default function TransactionTrail() {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedTrail, setSelectedTrail] = useState(null);

  const showDetails = (record) => {
    setSelectedTrail(record);
    setIsModalVisible(true);
  };

  const formatId = (id) => {
    if (!id) return '';
    if (id.length <= 12) return id;
    return `${id.substring(0, 6)}...${id.substring(id.length - 4)}`;
  };

  const columns = [
    { title: 'Mã tham chiếu', dataIndex: 'id', key: 'id', align: 'center', render: text => <Text code strong copyable={{ text: text }} title={text}>{formatId(text)}</Text> },
    { title: 'Mã dịch vụ', dataIndex: 'serviceId', key: 'serviceId', align: 'center', render: text => <Tag color="blue">{text}</Tag> },
    { title: 'Bước', dataIndex: 'transStep', key: 'transStep', align: 'center', render: text => <Tag color="purple">Bước {text}</Tag> },
    { title: 'Trạng thái', dataIndex: 'status', key: 'status', align: 'center', render: text => {
      let color = 'default';
      if (text === 'done') color = 'success';
      if (text === 'failed') color = 'error';
      if (text === 'pending') color = 'warning';
      if (text === 'init') color = 'processing';
      return <Tag color={color} style={{ margin: 0 }}>{text.toUpperCase()}</Tag>;
    }},
    { title: 'Tạo lúc', dataIndex: 'createdAt', key: 'createdAt', align: 'center' },
    { title: 'Cập nhật lúc', dataIndex: 'updatedAt', key: 'updatedAt', align: 'center' },
    { title: 'Thao tác', key: 'action', align: 'center', render: (_, record) => (
      <Button size="small" type="primary" icon={<EyeOutlined />} onClick={() => showDetails(record)} style={{ background: '#0ea5e9' }}>
        Xem chi tiết
      </Button>
    )}
  ];

  const [pagination, setPagination] = useState({ current: 1, pageSize: 10 });
  const [filterStatus, setFilterStatus] = useState('');
  const [searchTransRef, setSearchTransRef] = useState('');
  const [searchServiceId, setSearchServiceId] = useState('');
  const { io } = useContext(SocketContext);

  const { data: responseData, isLoading, refetch } = useTrails({
    page: pagination.current,
    limit: pagination.pageSize,
    status: filterStatus || undefined,
    transRefId: searchTransRef || undefined,
    serviceId: searchServiceId || undefined
  });

  const items = responseData?.items || [];
  const total = responseData?.total || 0;

  const data = items.map(item => ({
    key: item.id,
    id: item.transRefId || item.id,
    serviceId: item.serviceId,
    transStep: item.transStep,
    status: item.status,
    createdAt: new Date(item.createdAt).toLocaleString('vi-VN'),
    updatedAt: new Date(item.updatedAt).toLocaleString('vi-VN'),
    inputMessage: typeof item.inputMessage === 'string' ? JSON.parse(item.inputMessage) : item.inputMessage,
    outputMessage: typeof item.outputMessage === 'string' ? JSON.parse(item.outputMessage) : item.outputMessage,
    transStepLog: typeof item.transStepLog === 'string' ? JSON.parse(item.transStepLog || '[]') : (item.transStepLog || [])
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

  const handleFilterChange = (value) => {
    setFilterStatus(value);
    setPagination(prev => ({ ...prev, current: 1 }));
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
            placeholder="Trans Ref ID..." 
            allowClear
            onSearch={handleSearchTransRef} 
            style={{ width: 200 }} 
            size="large"
          />
          <Input.Search 
            placeholder="Service Code..." 
            allowClear
            onSearch={handleSearchServiceId} 
            style={{ width: 180 }} 
            size="large"
          />
          <Select 
            value={filterStatus} 
            style={{ width: 180 }} 
            size="large"
            onChange={handleFilterChange}
          >
            <Select.Option value="">Tất cả trạng thái</Select.Option>
            <Select.Option value="init">Khởi tạo (Init)</Select.Option>
            <Select.Option value="pending">Đang xử lý (Pending)</Select.Option>
            <Select.Option value="done">Thành công (Done)</Select.Option>
            <Select.Option value="failed">Thất bại (Failed)</Select.Option>
          </Select>
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

      <Modal
        title={<div style={{ fontSize: 18 }}><FileTextOutlined style={{ color: '#0ea5e9', marginRight: 8 }}/> Chi tiết Dấu vết: <Text code>{selectedTrail?.id}</Text></div>}
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={[
          <Button key="close" type="primary" onClick={() => setIsModalVisible(false)} style={{ background: '#0ea5e9' }}>
            Đóng
          </Button>
        ]}
        width={800}
      >
        {selectedTrail && (
          <Tabs defaultActiveKey="1" style={{ marginTop: 16 }}>
            <TabPane tab="Thông điệp Đầu vào" key="1">
              <pre style={{ background: '#f8fafc', padding: 16, borderRadius: 8, overflowX: 'auto', border: '1px solid #e2e8f0' }}>
                {JSON.stringify(selectedTrail.inputMessage, null, 2)}
              </pre>
            </TabPane>
            <TabPane tab="Thông điệp Đầu ra" key="2">
              {selectedTrail.outputMessage ? (
                <pre style={{ background: '#f8fafc', padding: 16, borderRadius: 8, overflowX: 'auto', border: '1px solid #e2e8f0' }}>
                  {JSON.stringify(selectedTrail.outputMessage, null, 2)}
                </pre>
              ) : (
                <div style={{ padding: 16, textAlign: 'center', color: '#94a3b8' }}>Không có thông điệp đầu ra (Thất bại trước bước 3)</div>
              )}
            </TabPane>
            <TabPane tab="Nhật ký Xử lý" key="3">
              <div style={{ padding: '24px 24px 0' }}>
                <Timeline>
                  {selectedTrail.transStepLog.map((log, index) => (
                    <Timeline.Item 
                      key={index} 
                      color={log.result === 'success' ? 'green' : 'red'}
                    >
                      <div style={{ marginBottom: 4 }}>
                        <Text strong style={{ textTransform: 'uppercase' }}>{log.step}</Text>
                        <Text type="secondary" style={{ marginLeft: 8 }}>{log.timestamp}</Text>
                      </div>
                      <div>
                        Result: <Text type={log.result === 'success' ? 'success' : 'danger'} style={{ textTransform: 'uppercase' }}>{log.result}</Text>
                        {log.errorCode && <div>Error: <Text code type="danger">{log.errorCode}</Text></div>}
                        {log.message && <div>Message: <Text type="secondary">{log.message}</Text></div>}
                      </div>
                    </Timeline.Item>
                  ))}
                </Timeline>
              </div>
            </TabPane>
          </Tabs>
        )}
      </Modal>
    </div>
  );
}
