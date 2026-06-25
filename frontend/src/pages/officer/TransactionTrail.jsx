import React, { useState } from 'react';
import { Card, Typography, Table, Tag, Button, Modal, Tabs, Timeline } from 'antd';
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

  const columns = [
    { title: 'Trans Ref ID', dataIndex: 'id', key: 'id', align: 'center', render: text => <Text code strong>{text}</Text> },
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

  const data = [
    { 
      key: '1', 
      id: '64f1a2b3c4d5e6f7a8b9c0d1', 
      serviceId: 'P2P_TRANSFER', 
      transStep: 3, 
      status: 'done', 
      createdAt: '2026-06-25 14:00:00',
      updatedAt: '2026-06-25 14:00:05',
      inputMessage: { TRANSBODY: { SERVICEID: "P2P_TRANSFER", SENDERID: "0987654321", RECEIVERID: "0912345678", AMOUNT: 50000, PIN: "******" } },
      outputMessage: { TRANSBODY: { SERVICEID: "P2P_TRANSFER", SENDERID: "pkt_cust_001", RECEIVERID: "pkt_cust_002", AMOUNT: 50000, DEBITFEE: 0, TOTALAMOUNT: 50000, TRANSREFID: "64f1a2b3c4d5e6f7a8b9c0d1" } },
      transStepLog: [
        { step: 'request', timestamp: '2026-06-25 14:00:00', result: 'success' },
        { step: 'authenticate', timestamp: '2026-06-25 14:00:01', result: 'success' },
        { step: 'validate', timestamp: '2026-06-25 14:00:02', result: 'success' },
        { step: 'verify_acid', timestamp: '2026-06-25 14:00:05', result: 'success' }
      ]
    },
    { 
      key: '2', 
      id: '64f1a2b3c4d5e6f7a8b9c0d2', 
      serviceId: 'BILL_PAYMENT', 
      transStep: 2, 
      status: 'failed', 
      createdAt: '2026-06-25 14:05:00',
      updatedAt: '2026-06-25 14:05:02',
      inputMessage: { TRANSBODY: { SERVICEID: "BILL_PAYMENT", SENDERID: "0987654321", BILLERID: "EVN_HANOI", BILLCODE: "PE01234567", AMOUNT: 250000, PIN: "******" } },
      outputMessage: null,
      transStepLog: [
        { step: 'request', timestamp: '2026-06-25 14:05:00', result: 'success' },
        { step: 'authenticate', timestamp: '2026-06-25 14:05:01', result: 'success' },
        { step: 'validate', timestamp: '2026-06-25 14:05:02', result: 'failed', errorCode: 'ERR_INSUFFICIENT_BALANCE' }
      ]
    },
  ];

  return (
    <div>
      <Card className="glass-card" bodyStyle={{ padding: 0, overflow: 'hidden' }}>
        <Table columns={columns} dataSource={data} pagination={false} rowClassName="smart-row" />
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
