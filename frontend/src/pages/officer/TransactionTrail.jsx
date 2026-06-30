import React, { useState, useEffect } from 'react';
import axios from '../../utils/axios';
import { Card, Typography, Table, Tag, Button, Modal, Tabs, Timeline, message, Select, Input, Space } from 'antd';
import { FileTextOutlined, EyeOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;
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
    { title: 'Trans Ref ID', dataIndex: 'id', key: 'id', align: 'center', render: text => <Text code strong copyable={{ text: text }} title={text}>{formatId(text)}</Text> },
    { title: 'Service ID', dataIndex: 'serviceId', key: 'serviceId', align: 'center', render: text => <Tag color="blue">{text}</Tag> },
    { title: 'Step', dataIndex: 'transStep', key: 'transStep', align: 'center', render: text => <Tag color="purple">Step {text}</Tag> },
    { title: 'Status', dataIndex: 'status', key: 'status', align: 'center', render: text => {
      let color = 'default';
      if (text === 'done') color = 'success';
      if (text === 'failed') color = 'error';
      if (text === 'pending') color = 'warning';
      if (text === 'init') color = 'processing';
      return <Tag color={color} style={{ margin: 0 }}>{text.toUpperCase()}</Tag>;
    }},
    { title: 'Created At', dataIndex: 'createdAt', key: 'createdAt', align: 'center' },
    { title: 'Updated At', dataIndex: 'updatedAt', key: 'updatedAt', align: 'center' },
    { title: 'Action', key: 'action', align: 'center', render: (_, record) => (
      <Button size="small" type="primary" icon={<EyeOutlined />} onClick={() => showDetails(record)} style={{ background: '#0ea5e9' }}>
        View Details
      </Button>
    )}
  ];

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const [filterStatus, setFilterStatus] = useState('');
  const [searchTransRef, setSearchTransRef] = useState('');
  const [searchServiceId, setSearchServiceId] = useState('');

  const fetchTrails = async (page = 1, status = filterStatus, transRefId = searchTransRef, serviceId = searchServiceId) => {
    setLoading(true);
    try {
      const response = await axios.post('/api/officer/trails/list', {
        page: page,
        limit: pagination.pageSize,
        status: status || undefined,
        transRefId: transRefId || undefined,
        serviceId: serviceId || undefined
      });
      const { items, total } = response.data.data;
      
      const formattedData = items.map(item => ({
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

      setData(formattedData);
      setPagination(prev => ({ ...prev, current: page, total: total }));
    } catch (error) {
      message.error(error.response?.data?.message || 'Lỗi tải danh sách Dấu vết giao dịch');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrails();
  }, []);

  const handleTableChange = (newPagination) => {
    fetchTrails(newPagination.current);
  };

  const handleFilterChange = (value) => {
    setFilterStatus(value);
    setPagination(prev => ({ ...prev, current: 1 }));
    fetchTrails(1, value, searchTransRef, searchServiceId);
  };

  const handleSearchTransRef = (value) => {
    setSearchTransRef(value);
    setPagination(prev => ({ ...prev, current: 1 }));
    fetchTrails(1, filterStatus, value, searchServiceId);
  };

  const handleSearchServiceId = (value) => {
    setSearchServiceId(value);
    setPagination(prev => ({ ...prev, current: 1 }));
    fetchTrails(1, filterStatus, searchTransRef, value);
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
          pagination={{ ...pagination, showSizeChanger: false }} 
          onChange={handleTableChange}
          loading={loading}
          rowClassName="smart-row" 
        />
      </Card>

      <Modal
        title={<div style={{ fontSize: 18 }}><FileTextOutlined style={{ color: '#0ea5e9', marginRight: 8 }}/> Trail Details: <Text code>{selectedTrail?.id}</Text></div>}
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={[
          <Button key="close" type="primary" onClick={() => setIsModalVisible(false)} style={{ background: '#0ea5e9' }}>
            Close
          </Button>
        ]}
        width={800}
      >
        {selectedTrail && (
          <Tabs defaultActiveKey="1" style={{ marginTop: 16 }}>
            <TabPane tab="Input Message" key="1">
              <pre style={{ background: '#f8fafc', padding: 16, borderRadius: 8, overflowX: 'auto', border: '1px solid #e2e8f0' }}>
                {JSON.stringify(selectedTrail.inputMessage, null, 2)}
              </pre>
            </TabPane>
            <TabPane tab="Output Message" key="2">
              {selectedTrail.outputMessage ? (
                <pre style={{ background: '#f8fafc', padding: 16, borderRadius: 8, overflowX: 'auto', border: '1px solid #e2e8f0' }}>
                  {JSON.stringify(selectedTrail.outputMessage, null, 2)}
                </pre>
              ) : (
                <div style={{ padding: 16, textAlign: 'center', color: '#94a3b8' }}>No output message (Failed before step 3)</div>
              )}
            </TabPane>
            <TabPane tab="Step Logs" key="3">
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
                        Result: <Text type={log.result === 'success' ? 'success' : 'danger'}>{log.result}</Text>
                        {log.errorCode && <div>Error: <Text code type="danger">{log.errorCode}</Text></div>}
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
