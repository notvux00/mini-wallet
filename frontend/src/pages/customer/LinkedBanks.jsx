import React, { useState, useEffect, useContext } from 'react';
import axios from '../../utils/axios';
import { Card, Typography, List, Button, Modal, Form, Input, InputNumber, message, Tag, Space, Alert, Steps, Row, Col, Spin, Radio, Result, Select, Divider } from 'antd';
import { PlusOutlined, BankOutlined, CreditCardOutlined, SafetyCertificateOutlined, ArrowUpOutlined, ArrowDownOutlined, ArrowRightOutlined, LockOutlined, DownloadOutlined, UploadOutlined } from '@ant-design/icons';
import { SocketContext } from '../../context/SocketContext';
import { useNavigate } from 'react-router-dom';

const { Title, Text } = Typography;

export default function LinkedBanks() {
  const [links, setLinks] = useState([]);
  const [banks, setBanks] = useState([]);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const { io } = useContext(SocketContext);
  const navigate = useNavigate();

  // State for Bank Linking
  const [isLinkModalVisible, setIsLinkModalVisible] = useState(false);
  const [isOtpModalVisible, setIsOtpModalVisible] = useState(false);
  const [currentLinkId, setCurrentLinkId] = useState(null);
  const [linkForm] = Form.useForm();
  const [otpForm] = Form.useForm();

  // State for Transactions
  const [isTransModalVisible, setIsTransModalVisible] = useState(false);
  const [transStep, setTransStep] = useState(0);
  const [transAction, setTransAction] = useState('deposit'); // 'deposit' or 'withdraw'
  const [selectedLink, setSelectedLink] = useState(null);
  const [transRefId, setTransRefId] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [servicesConfig, setServicesConfig] = useState([]);
  
  const [transForm] = Form.useForm();
  const [pinForm] = Form.useForm();

  const fetchLinksAndBalance = async () => {
    try {
      const [linkRes, balRes, svcRes] = await Promise.all([
        axios.post('/api/customer/bank/list'),
        axios.post('/api/customer/dashboard'),
        axios.post('/api/customer/services/list')
      ]);
      setLinks(linkRes.data?.data?.links || []);
      setBanks(linkRes.data?.data?.banks || []);
      setBalance(balRes.data?.data?.balance || 0);
      setServicesConfig(svcRes.data?.data || []);
    } catch (error) {
      console.error('Lỗi tải dữ liệu', error);
      message.error('Lỗi tải dữ liệu ngân hàng');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLinksAndBalance();
  }, []);

  useEffect(() => {
    if (io && io.socket) {
      io.socket.on('transaction_updated', () => {
        fetchLinksAndBalance();
      });
    }
    return () => {
      if (io && io.socket) {
        io.socket.off('transaction_updated');
      }
    };
  }, [io]);

  // --- BANK LINKING METHODS ---
  const handleRequestLink = async (values) => {
    try {
      const response = await axios.post('/api/customer/bank/request-link', values);
      setCurrentLinkId(response.data.data.linkId);
      setIsLinkModalVisible(false);
      setIsOtpModalVisible(true);
      message.success('Vui lòng nhập mã OTP để xác thực');
    } catch (error) {
      message.error(error.response?.data?.message || 'Lỗi gửi yêu cầu liên kết');
    }
  };

  const handleVerifyOtp = async (values) => {
    try {
      await axios.post('/api/customer/bank/verify-link', { linkId: currentLinkId, otp: values.otp });
      message.success('Liên kết thẻ thành công!');
      setIsOtpModalVisible(false);
      linkForm.resetFields();
      otpForm.resetFields();
      fetchLinksAndBalance();
    } catch (error) {
      message.error(error.response?.data?.message || 'Mã OTP không đúng');
    }
  };

  const handleUnlink = async (linkId) => {
    try {
      await axios.post('/api/customer/bank/unlink', { linkId });
      message.success('Đã hủy liên kết thẻ');
      fetchLinksAndBalance();
    } catch (error) {
      message.error('Lỗi hủy liên kết');
    }
  };

  // --- TRANSACTION METHODS ---
  const openTransactionModal = (link, action) => {
    setSelectedLink(link);
    setTransAction(action);
    setTransStep(0);
    setPreviewData(null);
    setTransRefId(null);
    transForm.resetFields();
    transForm.setFieldsValue({
      description: action === 'deposit' ? 'Nạp tiền từ ngân hàng' : 'Rút tiền về thẻ'
    });
    pinForm.resetFields();
    setIsTransModalVisible(true);
  };

  const closeTransactionModal = () => {
    setIsTransModalVisible(false);
    setTransStep(0);
  };

  const handleTransRequest = async (values) => {
    setLoading(true);
    try {
      const serviceId = transAction === 'deposit' ? 'BANK_DEPOSIT' : 'BANK_WITHDRAW';
      const svcConfig = servicesConfig.find(s => s.code === serviceId);
      
      if (!svcConfig) {
        message.error(`Dịch vụ ${serviceId} chưa được cấu hình. Vui lòng F5 lại trang!`);
        setLoading(false);
        return;
      }
      
      const bankLinkField = svcConfig?.bankLinkField || 'BANK_LINK_ID';
      const amountField = svcConfig?.amountField || 'AMOUNT';

      const res = await axios.post('/api/customer/transaction/request', {
        serviceId: svcConfig?.id,
        transData: {
          [bankLinkField]: selectedLink.id,
          [amountField]: values.amount,
          DESCRIPTION: values.description
        },
      });
      const data = res.data.data;
      setTransRefId(data.transRefId);

      // Confirm ngay lập tức
      await axios.post('/api/customer/transaction/confirm', { transRefId: data.transRefId });
      
      setPreviewData({
        ...data.preview,
        description: values.description
      });
      setTransStep(1); // Chuyển sang bước xác nhận & PIN
    } catch (error) {
      message.error(error.response?.data?.message || 'Lỗi tạo giao dịch');
    } finally {
      setLoading(false);
    }
  };

  const handleTransVerify = async (values) => {
    setLoading(true);
    try {
      await axios.post('/api/customer/transaction/verify', {
        transRefId,
        authCode: values.pin,
      });
      setTransStep(2); // Chuyển sang bước hoàn thành
      fetchLinksAndBalance(); // Cập nhật số dư
    } catch (err) {
      let errorMsg = err.response?.data?.data?.message || err.response?.data?.message || err.message || 'Mã PIN không đúng hoặc giao dịch thất bại';
      const rawError = errorMsg;
      
      if (errorMsg.includes(': ')) {
        errorMsg = errorMsg.substring(errorMsg.indexOf(': ') + 2);
      }
      
      if (rawError.includes('PIN_LOCKED') || rawError.includes('INVALID_STATUS')) {
        Modal.error({
          title: 'Giao dịch thất bại',
          content: errorMsg,
          okText: 'Về trang chủ',
          onOk: () => {
            navigate('/app/home');
          }
        });
      } else {
        message.error(errorMsg);
        pinForm.resetFields();
      }
    } finally {
      setLoading(false);
    }
  };

  const transStepItems = [
    { title: 'Nhập số tiền' },
    { title: 'Xác nhận & PIN' },
    { title: 'Hoàn thành' },
  ];

  if (loading && links.length === 0) {
    return <div style={{ textAlign: 'center', padding: 50 }}><Spin size="large" /></div>;
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={3} style={{ margin: 0 }}><BankOutlined /> Liên kết ngân hàng</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsLinkModalVisible(true)} style={{ background: '#0ea5e9' }}>
          Thêm Thẻ Mới
        </Button>
      </div>

      <Card style={{ marginBottom: 24, background: 'linear-gradient(90deg, #e0f2fe 0%, #bae6fd 100%)', border: 'none' }}>
        <Text type="secondary">Số dư khả dụng:</Text>
        <Title level={2} style={{ color: '#0369a1', marginTop: 8, marginBottom: 0 }}>
          {balance.toLocaleString()} VND
        </Title>
      </Card>

      <Card>
        {links.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <CreditCardOutlined style={{ fontSize: 48, color: '#d9d9d9', marginBottom: 16 }} />
            <br />
            <Text type="secondary">Chưa có thẻ nào được liên kết</Text>
          </div>
        ) : (
          <List
            itemLayout="horizontal"
            dataSource={links}
            renderItem={item => (
              <List.Item
                actions={[
                  <Button type="primary" ghost icon={<DownloadOutlined />} onClick={() => openTransactionModal(item, 'deposit')}>Nạp tiền</Button>,
                  <Button icon={<UploadOutlined />} onClick={() => openTransactionModal(item, 'withdraw')}>Rút tiền</Button>,
                  <Button danger type="text" onClick={() => handleUnlink(item.id)}>Hủy liên kết</Button>
                ]}
              >
                <List.Item.Meta
                  avatar={<BankOutlined style={{ fontSize: 32, color: '#10b981' }} />}
                  title={<Text strong>{item.bank?.name || 'Ngân hàng'}</Text>}
                  description={
                    <Space direction="vertical" size="small">
                      <Text code>{item.cardNumber}</Text>
                      <Text type="secondary">{item.cardHolder.toUpperCase()}</Text>
                    </Space>
                  }
                />
              </List.Item>
            )}
          />
        )}
      </Card>

      {/* Modal 1: Nhập thông tin thẻ (Link New Bank) */}
      <Modal
        title="Thêm Thẻ / Tài Khoản Ngân Hàng"
        open={isLinkModalVisible}
        onCancel={() => setIsLinkModalVisible(false)}
        onOk={() => linkForm.submit()}
        okText="Tiếp tục"
        cancelText="Hủy"
        destroyOnClose
      >
        <Form form={linkForm} layout="vertical" onFinish={handleRequestLink}>
          <Form.Item name="bankId" label="Chọn Ngân hàng" rules={[{ required: true, message: 'Vui lòng chọn ngân hàng' }]}>
            <Select
              showSearch
              size="large"
              placeholder="Nhập tên hoặc mã ngân hàng để tìm kiếm..."
              optionFilterProp="children"
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
              options={banks.map(bank => ({
                value: bank.id,
                label: `[${bank.code}] ${bank.name}`
              }))}
            />
          </Form.Item>
          <Form.Item name="cardNumber" label="Số thẻ / Số tài khoản" rules={[{ required: true }]}>
            <Input placeholder="VD: 9704123456789" />
          </Form.Item>
          <Form.Item name="cardHolder" label="Tên chủ thẻ (Không dấu)" rules={[{ required: true }]}>
            <Input placeholder="VD: NGUYEN VAN A" style={{ textTransform: 'uppercase' }} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal 2: Xác thực OTP (Link New Bank) */}
      <Modal
        title="Xác thực OTP"
        open={isOtpModalVisible}
        onCancel={() => setIsOtpModalVisible(false)}
        onOk={() => otpForm.submit()}
        okText="Xác nhận"
        cancelText="Hủy"
        destroyOnClose
      >
        <Alert message="Mã OTP giả lập là: 123456" type="info" showIcon style={{ marginBottom: 16 }} />
        <Form form={otpForm} layout="vertical" onFinish={handleVerifyOtp}>
          <Form.Item name="otp" label="Nhập mã OTP gửi về điện thoại" rules={[{ required: true }]}>
            <Input.OTP length={6} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal 3: Giao dịch Nạp/Rút tiền (Transactions) */}
      <Modal
        title={transAction === 'deposit' ? <span><DownloadOutlined style={{ color: '#10b981' }}/> Nạp tiền vào ví</span> : <span><UploadOutlined style={{ color: '#f59e0b' }}/> Rút tiền về thẻ</span>}
        open={isTransModalVisible}
        onCancel={closeTransactionModal}
        footer={null}
        destroyOnClose
        width={500}
      >
        <Steps current={transStep} items={transStepItems} style={{ marginBottom: 32, marginTop: 16 }} size="small" />

        <div style={{ minHeight: 200 }}>
          {/* STEP 0: NHẬP SỐ TIỀN */}
          <div style={{ display: transStep === 0 ? 'block' : 'none' }}>
            {selectedLink && (
              <div style={{ marginBottom: 24, padding: 16, background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                <Text type="secondary">Nguồn tiền: </Text>
                <Text strong>{selectedLink.bank?.name} - {selectedLink.cardNumber}</Text>
              </div>
            )}
            <Form form={transForm} layout="vertical" onFinish={handleTransRequest}>
              <Form.Item name="amount" label="Số tiền (VND)" rules={[{ required: true, message: 'Vui lòng nhập số tiền!' }]}>
                <InputNumber
                  style={{ width: '100%', fontSize: 18 }}
                  formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={value => value.replace(/\$\s?|(,*)/g, '')}
                  size="large"
                  placeholder="Nhập số tiền..."
                  min={10000}
                />
              </Form.Item>
              <Form.Item name="description" label="Ghi chú">
                <Input.TextArea
                  rows={2}
                  size="large"
                  maxLength={100}
                />
              </Form.Item>
              <Button type="primary" htmlType="submit" size="large" block loading={loading} icon={<ArrowRightOutlined />} style={{ background: '#0ea5e9', marginTop: 16 }}>
                Tiếp tục
              </Button>
            </Form>
          </div>

          {/* STEP 1: XÁC NHẬN & NHẬP PIN */}
          <div style={{ display: transStep === 1 ? 'block' : 'none' }}>
            {previewData && (
              <Card size="small" style={{ marginBottom: 24, background: '#fafafa' }}>
                <div style={{ textAlign: 'center', marginBottom: 16 }}>
                  <Text type="secondary">Mã giao dịch: {transRefId}</Text>
                </div>
                <Row style={{ marginBottom: 8, fontSize: 14 }}>
                  <Col span={12}><Text type="secondary">Số tiền giao dịch</Text></Col>
                  <Col span={12} style={{ textAlign: 'right' }}>
                    <Text strong>{(previewData.amount || 0).toLocaleString()} {previewData.currency}</Text>
                  </Col>
                </Row>
                <Row style={{ marginBottom: 8, fontSize: 14 }}>
                  <Col span={12}><Text type="secondary">Phí giao dịch</Text></Col>
                  <Col span={12} style={{ textAlign: 'right' }}>
                    <Text strong>{(previewData.fee || 0).toLocaleString()} {previewData.currency}</Text>
                  </Col>
                </Row>
                <Row style={{ marginBottom: 8, fontSize: 14 }}>
                  <Col span={12}><Text type="secondary">Ghi chú</Text></Col>
                  <Col span={12} style={{ textAlign: 'right' }}>
                    <Text strong>{previewData.description}</Text>
                  </Col>
                </Row>
                <Divider style={{ margin: '8px 0' }} />
                <Row style={{ marginBottom: 8, fontSize: 14 }}>
                  <Col span={12}><Text type="secondary">Tổng thanh toán</Text></Col>
                  <Col span={12} style={{ textAlign: 'right' }}>
                    <Text strong style={{ color: '#cf1322' }}>
                      {(previewData.totalAmount || 0).toLocaleString()} {previewData.currency}
                    </Text>
                  </Col>
                </Row>
              </Card>
            )}

            <Form form={pinForm} layout="vertical" onFinish={handleTransVerify}>
              <Form.Item 
                name="pin" 
                label="Nhập mã PIN an toàn" 
                rules={[
                  { required: true, message: 'Vui lòng nhập mã PIN!' },
                  { len: 6, message: 'Mã PIN gồm 6 số' }
                ]}
              >
                <Input.Password 
                  size="large" 
                  prefix={<LockOutlined />} 
                  placeholder="••••••" 
                  maxLength={6}
                  style={{ textAlign: 'center', letterSpacing: 8, fontSize: 24 }}
                />
              </Form.Item>

              <Row gutter={16} style={{ marginTop: 24 }}>
                <Col span={12}>
                  <Button size="large" block onClick={() => setTransStep(0)} disabled={loading}>Quay lại</Button>
                </Col>
                <Col span={12}>
                  <Button type="primary" htmlType="submit" size="large" block loading={loading} icon={<SafetyCertificateOutlined />}>
                    Xác nhận
                  </Button>
                </Col>
              </Row>
            </Form>
          </div>

          {/* STEP 2: HOÀN THÀNH */}
          <div style={{ display: transStep === 2 ? 'block' : 'none' }}>
            <Result
              status="success"
              title="Giao dịch thành công!"
              subTitle={`Mã tham chiếu: ${transRefId}`}
              extra={[
                <Button type="primary" key="close" onClick={closeTransactionModal}>
                  Xong
                </Button>,
                <Button key="history" onClick={() => navigate('/app/history')}>
                  Xem lịch sử
                </Button>,
              ]}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
