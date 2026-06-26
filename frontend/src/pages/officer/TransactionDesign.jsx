import React, { useState } from 'react';
import { Tabs, Table, Button, Select, Input, Popconfirm, Card, Typography, Space, Form, Checkbox, Row, Col, Badge, Switch } from 'antd';
import { 
  PlusOutlined, 
  DeleteOutlined, 
  DatabaseOutlined, 
  ControlOutlined, 
  SafetyCertificateOutlined, 
  AccountBookOutlined,
  SaveOutlined,
  ArrowLeftOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

const { Title, Text } = Typography;
const { Option } = Select;

export default function TransactionDesign() {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  
  // Tab 2: Input Building Data
  const [inputRules, setInputRules] = useState([
    { key: '1', order: 1, fieldName: 'SERVICEID', rule: 'mapping', source: 'parameters', type: 'string', query: '', variable: 'SERVICEID', isReplace: false, errorCode: '', errorMessage: '' },
    { key: '2', order: 2, fieldName: 'AMOUNT', rule: 'mapping', source: 'parameters', type: 'number', query: '', variable: 'AMOUNT', isReplace: false, errorCode: 'ERR_AMT_01', errorMessage: 'Invalid Amount' },
    { key: '3', order: 3, fieldName: 'SENDER_POCKET', rule: 'query', source: 'db', type: 'string', query: 'SELECT pocket_id FROM pockets WHERE cust_id = ?', variable: 'CUST_ID', isReplace: true, errorCode: 'ERR_WLT_01', errorMessage: 'Pocket Not Found' },
  ]);

  // Tab 3: Validations Data
  const [validations, setValidations] = useState([
    { key: '1', order: 1, validateFunc: 'validateSenderAccountSufficiency', validateFields: 'SENDERID:AMOUNT:DEBITFEE', errorCode: 'ERR_BAL_01', status: true },
    { key: '2', order: 2, validateFunc: 'validateReceiverIsNotSender', validateFields: 'SENDERID:RECEIVERID', errorCode: 'ERR_SND_RCV', status: true },
  ]);

  // Tab 4: GL Steps Data
  const [glSteps, setGlSteps] = useState([
    { key: '1', order: 1, debitLevel: 'productLevel', debitTarget: 'SENDERID', creditLevel: 'productLevel', creditTarget: 'RECEIVERID', amount: 'AMOUNT', description: 'Principal Transfer' },
    { key: '2', order: 2, debitLevel: 'productLevel', debitTarget: 'SENDERID', creditLevel: 'wallet', creditTarget: 'pkt_sys_fee', amount: 'DEBITFEE', description: 'Fee Collection' },
  ]);

  // Tab 1: Overview Component
  const OverviewTab = () => (
    <div style={{ padding: '24px 0' }}>
      <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
        <Col>
          <Title level={4} style={{ margin: 0, fontWeight: 700, color: '#0f172a' }}>Service Overview</Title>
          <Text style={{ color: '#64748b' }}>Configure static properties and rules for this service</Text>
        </Col>
      </Row>
      <Form 
        form={form} 
        layout="vertical" 
        style={{ maxWidth: 800 }}
        initialValues={{ 
          serviceCode: 'P2P_TRANSFER', 
          serviceName: 'Chuyển tiền P2P', 
          action: 'none', 
          actionParams: '{}', 
          authMethod: 'PIN', 
          feeType: 'fixed', 
          feeValue: '0',
          status: 'active'
        }}
      >
        <Row gutter={24}>
          <Col span={8}>
            <Form.Item label="Service Code" name="serviceCode" rules={[{ required: true }]}>
              <Input placeholder="e.g., P2P_TRANSFER" disabled />
            </Form.Item>
          </Col>
          <Col span={16}>
            <Form.Item label="Service Name" name="serviceName" rules={[{ required: true }]}>
              <Input placeholder="e.g., Chuyển tiền P2P" />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={24}>
          <Col span={8}>
            <Form.Item label="Action" name="action" rules={[{ required: true }]}>
              <Select>
                <Option value="none">none (P2P, Cash-in)</Option>
                <Option value="billerTrans">billerTrans (Bill Payment)</Option>
              </Select>
            </Form.Item>
          </Col>
          <Col span={16}>
            <Form.Item label="Action Params (JSON)" name="actionParams">
              <Input placeholder='e.g., { "billerId": "64f1a2..." }' />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={24}>
          <Col span={6}>
            <Form.Item label="Auth Method" name="authMethod">
              <Select>
                <Option value="PIN">PIN</Option>
                <Option value="NONE">NONE</Option>
              </Select>
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item label="Fee Type" name="feeType">
              <Select>
                <Option value="fixed">Fixed</Option>
                <Option value="percent">Percent</Option>
              </Select>
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item label="Fee Value" name="feeValue">
              <Input placeholder="e.g., 5000 or 1.5" />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item label="Status" name="status">
              <Select>
                <Option value="active">Active</Option>
                <Option value="inactive">Inactive</Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </div>
  );

  // Tab 2: Input Building Component
  const inputColumns = [
    { title: 'Order', dataIndex: 'order', width: 60, render: (text) => <Input className="smart-input" defaultValue={text} /> },
    { title: 'Field name', dataIndex: 'fieldName', width: 140, render: (text) => <Input className="smart-input" defaultValue={text} style={{ fontWeight: 600, color: '#0f172a' }} /> },
    { title: 'Rule', dataIndex: 'rule', width: 110, render: (text) => (
        <Select className="smart-input" defaultValue={text} style={{ width: '100%' }}>
          <Option value="mapping">Mapping</Option>
          <Option value="query">Query</Option>
          <Option value="fixed">Fixed</Option>
        </Select>
      )
    },
    { title: 'Source', dataIndex: 'source', width: 140, render: (text) => (
        <Select className="smart-input" defaultValue={text} style={{ width: '100%' }}>
          <Option value="parameters">Parameters</Option>
          <Option value="db">Database</Option>
          <Option value="senderPocket">Sender Pocket</Option>
          <Option value="user">User Session</Option>
        </Select>
      )
    },
    { title: 'Type', dataIndex: 'type', width: 100, render: (text) => (
        <Select className="smart-input" defaultValue={text} style={{ width: '100%' }}>
          <Option value="string">String</Option>
          <Option value="number">Number</Option>
          <Option value="boolean">Boolean</Option>
        </Select>
      )
    },
    { title: 'Query / Variable', dataIndex: 'query', width: 180, render: (_, record) => <Input className="smart-input" placeholder="Query or Value..." defaultValue={record.query || record.variable} /> },
    { title: 'Replace', dataIndex: 'isReplace', width: 70, align: 'center', render: (val) => <Checkbox defaultChecked={val} /> },
    { title: 'Error Code', dataIndex: 'errorCode', width: 110, render: (text) => <Input className="smart-input" placeholder="e.g. ERR_01" defaultValue={text} /> },
    { title: 'Error Msg', dataIndex: 'errorMessage', width: 150, render: (text) => <Input className="smart-input" placeholder="Error message..." defaultValue={text} /> },
    { title: '', key: 'action', width: 50, fixed: 'right', render: (_, record) => (
        <Popconfirm title="Delete this rule?" onConfirm={() => setInputRules(inputRules.filter(i => i.key !== record.key))}>
          <Button type="text" danger icon={<DeleteOutlined />} />
        </Popconfirm>
      )
    },
  ];

  const InputBuildingTab = () => (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: 24, marginTop: 24 }}>
        <Col>
          <Title level={4} style={{ margin: 0, fontWeight: 700, color: '#0f172a' }}>Input Building</Title>
          <Text style={{ color: '#64748b' }}>Define how parameters are parsed into transaction fields</Text>
        </Col>
      </Row>
      <div style={{ border: '1px solid #e2e8f0', borderRadius: 6, overflow: 'hidden' }}>
        <Table 
          dataSource={inputRules} 
          columns={inputColumns} 
          size="small"
          rowClassName="smart-row"
          scroll={{ x: 1110 }}
        />
      </div>
      <div style={{ marginTop: 16 }}>
        <Button type="dashed" icon={<PlusOutlined />} style={{ width: 200 }}>Add Rule</Button>
      </div>
    </div>
  );

  // Tab 3: Validations Component
  const validationColumns = [
    { title: 'Order', dataIndex: 'order', width: 80, render: (text) => <Input className="smart-input" defaultValue={text} /> },
    { title: 'Validator Function', dataIndex: 'validateFunc', width: 280, render: (text) => (
        <Select className="smart-input" defaultValue={text} style={{ width: '100%' }}>
          <Option value="validateReceiverIsNotSender">validateReceiverIsNotSender</Option>
          <Option value="validateSenderAccountSufficiency">validateSenderAccountSufficiency</Option>
          <Option value="validateSenderChecksum">validateSenderChecksum</Option>
          <Option value="validateReceiverChecksum">validateReceiverChecksum</Option>
        </Select>
      )
    },
    { title: 'Target Fields', dataIndex: 'validateFields', width: 250, render: (text) => <Input className="smart-input" defaultValue={text} placeholder="e.g. SENDERID:AMOUNT" /> },
    { title: 'Error Code', dataIndex: 'errorCode', width: 140, render: (text) => <Input className="smart-input" defaultValue={text} /> },
    { title: 'Status', dataIndex: 'status', width: 80, align: 'center', render: (val) => <Switch defaultChecked={val} size="small" /> },
    { title: '', key: 'action', width: 50, fixed: 'right', render: (_, record) => (
        <Popconfirm title="Delete this validator?" onConfirm={() => setValidations(validations.filter(i => i.key !== record.key))}>
          <Button type="text" danger icon={<DeleteOutlined />} />
        </Popconfirm>
      )
    },
  ];

  const ValidationsTab = () => (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: 24, marginTop: 24 }}>
        <Col>
          <Title level={4} style={{ margin: 0, fontWeight: 700, color: '#0f172a' }}>Transaction Validations</Title>
          <Text style={{ color: '#64748b' }}>Define business rules and constraints before execution</Text>
        </Col>
      </Row>
      <div style={{ border: '1px solid #e2e8f0', borderRadius: 6, overflow: 'hidden' }}>
        <Table 
          dataSource={validations} 
          columns={validationColumns} 
          pagination={false} 
          rowClassName="smart-row"
          scroll={{ x: 1000 }}
        />
      </div>
      <div style={{ marginTop: 16 }}>
        <Button type="dashed" icon={<PlusOutlined />} style={{ width: 200 }}>Add Validator</Button>
      </div>
    </div>
  );

  // Tab 4: GL Steps Component
  const glColumns = [
    { title: 'Step', dataIndex: 'order', width: 60, render: (text) => <Input className="smart-input" defaultValue={text} /> },
    { title: 'Debit (Dr)', width: 300, render: (_, record) => (
        <Space.Compact style={{ width: '100%' }}>
          <Select className="smart-input" defaultValue={record.debitLevel} style={{ width: '45%' }}>
            <Option value="productLevel">productLevel</Option>
            <Option value="wallet">wallet</Option>
          </Select>
          <Input className="smart-input" defaultValue={record.debitTarget} style={{ width: '55%', color: '#ef4444', fontWeight: 600 }} placeholder="Target (e.g. SENDERID)" />
        </Space.Compact>
      )
    },
    { title: 'Credit (Cr)', width: 300, render: (_, record) => (
        <Space.Compact style={{ width: '100%' }}>
          <Select className="smart-input" defaultValue={record.creditLevel} style={{ width: '45%' }}>
            <Option value="productLevel">productLevel</Option>
            <Option value="wallet">wallet</Option>
          </Select>
          <Input className="smart-input" defaultValue={record.creditTarget} style={{ width: '55%', color: '#10b981', fontWeight: 600 }} placeholder="Target" />
        </Space.Compact>
      )
    },
    { title: 'Amount Var', dataIndex: 'amount', width: 140, render: (text) => <Input className="smart-input" defaultValue={text} placeholder="e.g. AMOUNT" /> },
    { title: 'Description', dataIndex: 'description', render: (text) => <Input className="smart-input" defaultValue={text} /> },
    { title: '', key: 'action', width: 50, fixed: 'right', render: (_, record) => (
        <Popconfirm title="Delete this step?" onConfirm={() => setGlSteps(glSteps.filter(i => i.key !== record.key))}>
          <Button type="text" danger icon={<DeleteOutlined />} />
        </Popconfirm>
      )
    },
  ];

  const GlStepsTab = () => (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: 24, marginTop: 24 }}>
        <Col>
          <Title level={4} style={{ margin: 0, fontWeight: 700, color: '#0f172a' }}>Transaction Definition</Title>
          <Text style={{ color: '#64748b' }}>Define double-entry bookkeeping movements</Text>
        </Col>
        <Col>
          <Space>
            <Text strong style={{ color: '#64748b' }}>Definition Status:</Text>
            <Switch checkedChildren="Active" unCheckedChildren="Inactive" defaultChecked />
          </Space>
        </Col>
      </Row>
      <div style={{ border: '1px solid #e2e8f0', borderRadius: 6, overflow: 'hidden' }}>
        <Table 
          dataSource={glSteps} 
          columns={glColumns} 
          pagination={false} 
          rowClassName="smart-row"
          scroll={{ x: 1000 }}
        />
      </div>
      <div style={{ marginTop: 16 }}>
        <Button type="dashed" icon={<PlusOutlined />} style={{ width: 200 }}>Add GL Step</Button>
      </div>
    </div>
  );

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      
      {/* Context Toolbar */}
      <Card bodyStyle={{ padding: '12px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} style={{ marginBottom: 24, border: '1px solid #e2e8f0', borderRadius: 8, background: '#ffffff', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <Space size="middle" align="center">
          <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate('/officer/services')} style={{ fontSize: 16, color: '#64748b' }} />
          <Text strong style={{ fontSize: 20, color: '#0f172a' }}>Chuyển tiền P2P</Text>
          <Badge status="processing" text="Active Config" style={{ marginLeft: 8 }} />
        </Space>
        
        <Button type="primary" icon={<SaveOutlined />} size="large" style={{ background: '#0ea5e9' }}>
          Save Configuration
        </Button>
      </Card>
      
      <Tabs 
        className="vip-tabs"
        defaultActiveKey="1"
        tabPosition="top"
        items={[
          { key: '1', label: <Space><DatabaseOutlined /> Overview</Space>, children: <Card className="glass-card"><OverviewTab /></Card> },
          { key: '2', label: <Space><ControlOutlined /> Input Building</Space>, children: <Card className="glass-card"><InputBuildingTab /></Card> },
          { key: '3', label: <Space><SafetyCertificateOutlined /> Transaction Validations</Space>, children: <Card className="glass-card"><ValidationsTab /></Card> },
          { key: '4', label: <Space><AccountBookOutlined /> Transaction Definition</Space>, children: <Card className="glass-card"><GlStepsTab /></Card> },
        ]} 
      />
    </div>
  );
}
