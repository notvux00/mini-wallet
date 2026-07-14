import React, { useState, useEffect } from 'react';
import { Steps, Form, Input, InputNumber, Button, Select, Card, Switch, Checkbox, Space, Typography, Popconfirm, message, Row, Col, Collapse } from 'antd';
import { PlusOutlined, DeleteOutlined, ArrowRightOutlined, SettingOutlined, MobileOutlined, SafetyCertificateOutlined, AccountBookOutlined, WalletOutlined, UnorderedListOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import axios from '../../utils/axios';

const { Title, Text } = Typography;
const { Option } = Select;

export default function ServiceBuilder() {
  const [currentStep, setCurrentStep] = useState(0);
  const navigate = useNavigate();
  const { id } = useParams();
  const [form] = Form.useForm();
  
  // Data States
  const [basicInfo, setBasicInfo] = useState({ authMethod: 'PIN', feeType: 'fixed', feeValue: 0, action: 'none' });
  const [inputFields, setInputFields] = useState([
    { id: '1', label: 'Số tiền', type: 'number', required: true, variableName: 'AMOUNT' }
  ]);
  const [validations, setValidations] = useState({
    notSameSender: true,
    checkBalance: true,
    minAmount: false,
    maxAmount: false,
    maxAmountValue: 50000000
  });
  const [glSteps, setGlSteps] = useState([
    { id: '1', amountVar: undefined, from: undefined, to: undefined, title: 'Chuyển tiền gốc' }
  ]);
  const [systemPockets, setSystemPockets] = useState([]);

  useEffect(() => {
    const fetchSystemPockets = async () => {
      try {
        const res = await axios.post('/api/officer/pockets/list', { client: 'system', limit: 100 });
        if (res.data && res.data.data) {
          setSystemPockets(Array.isArray(res.data.data) ? res.data.data : (res.data.data.items || []));
        }
      } catch (e) {
        // ignore
      }
    };
    fetchSystemPockets();
  }, []);

  // Lấy dữ liệu nếu là Edit
  useEffect(() => {
    if (id) {
      const fetchDetail = async () => {
        try {
          const res = await axios.post('/api/officer/services/detail', { id });
          if (res.data && res.data.data) {
            const data = res.data.data;
            setBasicInfo(data.serviceInfo);
            form.setFieldsValue(data.serviceInfo);
            
            if (data.fields && data.fields.length > 0) {
              const hiddenFields = ['SERVICEID', 'SENDERID', 'RECEIVERID', 'CURRENCY'];
              setInputFields(data.fields.filter(f => !hiddenFields.includes(f.fieldName)).map(f => ({
                id: f.id || Math.random().toString(),
                label: f.fieldName, // Vì DB backend ko lưu label tiếng việt, ta tạm dùng fieldName
                type: f.fieldFormat,
                required: f.isRequired,
                variableName: f.fieldName,
                minLength: f.minLength,
                maxLength: f.maxLength,
                errorCode: f.errorCode,
                errorMessage: f.errorMessage
              })));
            }
            
            if (data.validations) {
              const ruleMap = {};
              data.validations.forEach(v => {
                if (v.validateFunc === 'validateReceiverIsNotSender') ruleMap.notSameSender = true;
                if (v.validateFunc === 'validateSenderAccountSufficiency') ruleMap.checkBalance = true;
                if (v.validateFunc === 'validateMinAmount') ruleMap.minAmount = true;
                if (v.validateFunc === 'validateMaxAmount') {
                  ruleMap.maxAmount = true;
                  const parts = v.validateFields.split(':');
                  ruleMap.maxAmountValue = parseInt(parts[1], 10) || 50000000;
                }
              });
              setValidations(prev => ({ ...prev, ...ruleMap }));
            }
            
            if (data.accountingSteps && data.accountingSteps.length > 0) {
              const reverseMapTarget = (val) => {
                if (val.level === 'productLevel' && val.target === 'SENDERID') return 'SENDER';
                if (val.level === 'productLevel' && val.target === 'RECEIVERID') return 'RECEIVER';
                if (val.target === 'SYS_BANK') return 'BANK';
                return val.target; // Trả về thẳng Pocket ID của ví hệ thống
              };
              
              setGlSteps(data.accountingSteps.map((step, i) => ({
                id: Math.random().toString(),
                amountVar: step.amount,
                from: reverseMapTarget(step.debit),
                to: reverseMapTarget(step.credit),
                title: `Bút toán ${i + 1}`
              })));
            }
          }
        } catch (error) {
          message.error('Lỗi lấy chi tiết cấu hình dịch vụ');
        }
      };
      fetchDetail();
    }
  }, [id, form]);

  // Handle Input Fields
  const addInputField = () => {
    setInputFields([...inputFields, { id: Date.now().toString(), label: 'Tên trường', type: 'string', required: false, variableName: 'NEW_VAR', minLength: null, maxLength: null, errorCode: '', errorMessage: '' }]);
  };
  const removeInputField = (id) => {
    setInputFields(inputFields.filter(f => f.id !== id));
  };
  const updateInputField = (id, field, value) => {
    setInputFields(inputFields.map(f => f.id === id ? { ...f, [field]: value } : f));
  };

  // Handle GL Steps
  const addGlStep = () => {
    setGlSteps([...glSteps, { id: Date.now().toString(), amountVar: undefined, from: undefined, to: undefined, title: 'Bút toán mới' }]);
  };
  const removeGlStep = (id) => {
    setGlSteps(glSteps.filter(s => s.id !== id));
  };
  const updateGlStep = (id, field, value) => {
    setGlSteps(glSteps.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  // Submit Handler
  const handleFinish = async () => {
    try {
      if (!basicInfo.serviceCode || !basicInfo.serviceName) {
        message.error('Vui lòng quay lại Bước 1 và điền đầy đủ Tên và Mã Dịch vụ!');
        return;
      }
      
      const finalBasicInfo = { ...basicInfo };
      if (finalBasicInfo.action === 'billerTrans') {
        if (!finalBasicInfo.actionParams) finalBasicInfo.actionParams = {};
        if (!finalBasicInfo.actionParams.billerIdField) finalBasicInfo.actionParams.billerIdField = 'BILLERID';
        if (!finalBasicInfo.actionParams.customerCodeField) finalBasicInfo.actionParams.customerCodeField = 'BILLCODE';
      }
      // P2P: đảm bảo receiverPhoneField được gửi lên (fallback 'RECEIVERPHONE' nếu Officer chưa chọn)
      if (!finalBasicInfo.action || finalBasicInfo.action === 'none') {
        if (!finalBasicInfo.actionParams) finalBasicInfo.actionParams = {};
        if (!finalBasicInfo.actionParams.receiverPhoneField) finalBasicInfo.actionParams.receiverPhoneField = 'RECEIVERPHONE';
      }
      // Cash-in: auth bắt buộc NONE, fallback bankPocketField và receiverPhoneField
      if (finalBasicInfo.action === 'cashIn') {
        if (!finalBasicInfo.actionParams) finalBasicInfo.actionParams = {};
        if (!finalBasicInfo.actionParams.bankPocketField) finalBasicInfo.actionParams.bankPocketField = 'BANKID';
        if (!finalBasicInfo.actionParams.receiverPhoneField) finalBasicInfo.actionParams.receiverPhoneField = 'RECEIVERPHONE';
        finalBasicInfo.authMethod = 'NONE'; // Cash-in không cần PIN
      }
      
      // Bank Topup / Withdraw: fallback bankLinkField
      if (finalBasicInfo.action === 'bankDeposit' || finalBasicInfo.action === 'bankWithdraw') {
        if (!finalBasicInfo.actionParams) finalBasicInfo.actionParams = {};
        if (!finalBasicInfo.actionParams.bankLinkField) finalBasicInfo.actionParams.bankLinkField = 'BANK_LINK_ID';
      }
      
      const payload = {
        serviceInfo: finalBasicInfo,
        fields: inputFields,
        rules: validations,
        accountingSteps: glSteps
      };
      
      if (id) payload.id = id;

      const url = id ? '/api/officer/services/update' : '/api/officer/services/create';
      const res = await axios.post(url, payload);
      message.success((res.data && res.data.message) || 'Lưu cấu hình Dịch vụ thành công!');
      navigate('/officer/services');
    } catch (error) {
      if (error.errorFields) {
        message.error('Vui lòng điền đầy đủ thông tin ở Bước 1!');
        setCurrentStep(0);
      } else {
        message.error('Có lỗi xảy ra khi lưu cấu hình.');
      }
    }
  };

  const steps = [
    {
      title: 'Thông tin Dịch vụ',
      icon: <SettingOutlined />,
      content: (
        <Card title="Thông tin cơ bản" className="glass-card">
          <Form form={form} layout="vertical" initialValues={basicInfo} onValuesChange={(_, allValues) => setBasicInfo(prev => ({ ...prev, ...allValues }))}>
            <Row gutter={24}>
              <Col span={12}>
                <Form.Item name="serviceName" label="Tên Dịch vụ hiển thị" rules={[{ required: true }]}>
                  <Input placeholder="VD: Đóng tiền điện EVN" size="large" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="serviceCode" label="Mã Dịch vụ" rules={[{ required: true }]}>
                  <Input placeholder="Ví dụ: P2P_TRANSFER" disabled={!!id} />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={24}>
              <Col span={8}>
                <Form.Item name="authMethod" label="Xác thực">
                  <Select size="large">
                    <Option value="PIN">Yêu cầu nhập mã PIN</Option>
                    <Option value="NONE">Không cần xác thực (NONE)</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="feeType" label="Loại phí">
                  <Select size="large">
                    <Option value="fixed">Cố định (VND)</Option>
                    <Option value="percent">Phần trăm (%)</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="feeValue" label="Mức phí">
                  <Input type="number" size="large" />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={24}>
              <Col span={12}>
                <Form.Item name="action" label="Loại Dịch vụ">
                  <Select size="large">
                    <Option value="none">Chuyển tiền nội bộ (P2P)</Option>
                    <Option value="billerTrans">Thanh toán Hóa đơn (Biller)</Option>
                    <Option value="cashIn">Nạp tiền tại quầy (OTC Cash-in)</Option>
                    <Option value="bankDeposit">Nạp tiền từ thẻ Ngân hàng (Deposit)</Option>
                    <Option value="bankWithdraw">Rút tiền về thẻ Ngân hàng (Withdraw)</Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>
          </Form>
        </Card>
      ),
    },
    {
      title: 'Biến giao dịch',
      icon: <UnorderedListOutlined />,
      content: (
        <Card 
          title="Định nghĩa tham số giao dịch"
          className="glass-card"
        >
          <Text type="secondary" style={{ marginBottom: 16, display: 'block' }}>
            Khai báo cấu trúc dữ liệu (payload) mà Frontend / Client bắt buộc phải gửi lên Engine khi thực hiện giao dịch này.
          </Text>
          {inputFields.map((field, index) => (
            <Card key={field.id} size="small" style={{ marginBottom: 12, background: '#f8fafc', borderColor: '#e2e8f0' }}>
              <Row gutter={16} align="middle">
                <Col span={8}>
                  <Text strong>Tên trường trên App:</Text>
                  <Input value={field.label} onChange={e => updateInputField(field.id, 'label', e.target.value)} />
                </Col>
                <Col span={6}>
                  <Text strong>Kiểu dữ liệu:</Text>
                  <Select value={field.type} onChange={val => updateInputField(field.id, 'type', val)} style={{ width: '100%' }}>
                    <Option value="string">Văn bản (Chữ/Số)</Option>
                    <Option value="number">Số tiền</Option>
                  </Select>
                </Col>
                <Col span={5}>
                  <Text strong>Tên biến tĩnh:</Text>
                  <Input value={field.variableName} onChange={e => updateInputField(field.id, 'variableName', e.target.value)} />
                </Col>
                <Col span={3} style={{ textAlign: 'center' }}>
                  <Text strong>Bắt buộc?</Text><br/>
                  <Switch checked={field.required} onChange={val => updateInputField(field.id, 'required', val)} />
                </Col>
                <Col span={2} style={{ textAlign: 'center' }}>
                  <Button danger type="text" icon={<DeleteOutlined />} onClick={() => removeInputField(field.id)} style={{ marginTop: 22 }} />
                </Col>
              </Row>
              <Collapse ghost size="small" items={[{
                key: '1',
                label: 'Thiết lập nâng cao',
                children: (
                  <Row gutter={16}>
                    <Col span={6}>
                      <Text strong>Độ dài tối thiểu:</Text>
                      <InputNumber style={{ width: '100%', marginTop: 4 }} value={field.minLength} onChange={val => updateInputField(field.id, 'minLength', val)} />
                    </Col>
                    <Col span={6}>
                      <Text strong>Độ dài tối đa:</Text>
                      <InputNumber style={{ width: '100%', marginTop: 4 }} value={field.maxLength} onChange={val => updateInputField(field.id, 'maxLength', val)} />
                    </Col>
                    <Col span={12} style={{ marginTop: 12 }}>
                      <Text strong>Mã lỗi tuỳ chỉnh:</Text>
                      <Input style={{ marginTop: 4 }} value={field.errorCode} placeholder="VD: ERR_INVALID_DATA" onChange={e => updateInputField(field.id, 'errorCode', e.target.value)} />
                    </Col>
                    <Col span={12} style={{ marginTop: 12 }}>
                      <Text strong>Câu thông báo lỗi:</Text>
                      <Input style={{ marginTop: 4 }} value={field.errorMessage} placeholder="VD: Dữ liệu không hợp lệ" onChange={e => updateInputField(field.id, 'errorMessage', e.target.value)} />
                    </Col>
                  </Row>
                )
              }]} />
            </Card>
          ))}
          <Button type="dashed" onClick={addInputField} icon={<PlusOutlined />} block style={{ marginTop: 8 }}>
            Thêm trường nhập liệu
          </Button>
        </Card>
      ),
    },
    {
      title: 'Quy tắc Giao dịch',
      icon: <SafetyCertificateOutlined />,
      content: (
        <Card title="Các điều kiện để giao dịch thành công" className="glass-card">
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            {/* Cash-in: Officer chọn ví Bank nguồn và biến SĐT khách hàng được nạp */}
            {basicInfo.action === 'cashIn' && (
              <Card type="inner" title="Cấu hình Nạp tiền (Cash-in)" style={{ borderColor: '#10b981' }}>
                <Space direction="vertical" style={{ width: '100%' }} size="middle">


                  {/* Chọn biến SĐT khách hàng */}
                  <div>
                    <Text strong>Tên biến chứa Số điện thoại khách hàng được nạp:</Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      Engine dùng biến này để tra cứu ví khách hàng cần nạp tiền.
                    </Text>
                    <Select
                      style={{ width: '100%', marginTop: 8 }}
                      size="large"
                      placeholder="Chọn biến chứa SĐT khách..."
                      value={basicInfo.actionParams?.receiverPhoneField || undefined}
                      onChange={(val) => setBasicInfo({ ...basicInfo, actionParams: { ...basicInfo.actionParams, receiverPhoneField: val } })}
                    >
                      {inputFields.map(f => (
                        <Option key={f.variableName} value={f.variableName}>
                          {f.variableName} {f.label ? `(${f.label})` : ''}
                        </Option>
                      ))}
                    </Select>
                    {!basicInfo.actionParams?.receiverPhoneField && inputFields.length > 0 && (
                      <Text type="warning" style={{ fontSize: 12 }}>
                        ⚠️ Chưa chọn — engine sẽ mặc định tìm biến tên "RECEIVERPHONE"
                      </Text>
                    )}
                  </div>


                </Space>
              </Card>
            )}

            {/* P2P: Officer chọn biến nào chứa SĐT người nhận */}
            {(!basicInfo.action || basicInfo.action === 'none') && (
              <Card type="inner" title="Ánh xạ Biến Người nhận (Dành riêng cho P2P)" style={{ borderColor: '#8b5cf6' }}>
                <Row gutter={24}>
                  <Col span={24}>
                    <Text strong>Tên biến chứa Số điện thoại người nhận:</Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      Engine sẽ dùng biến này để tra cứu ví người nhận. Chọn đúng field SĐT bạn đã định nghĩa ở Bước 2.
                    </Text>
                    <Select
                      style={{ width: '100%', marginTop: 8 }}
                      size="large"
                      placeholder="Chọn biến chứa SĐT người nhận..."
                      value={basicInfo.actionParams?.receiverPhoneField || undefined}
                      onChange={(val) => setBasicInfo({ ...basicInfo, actionParams: { ...basicInfo.actionParams, receiverPhoneField: val } })}
                    >
                      {inputFields.map(f => (
                        <Option key={f.variableName} value={f.variableName}>
                          {f.variableName} {f.label ? `(${f.label})` : ''}
                        </Option>
                      ))}
                    </Select>
                    {!basicInfo.actionParams?.receiverPhoneField && inputFields.length > 0 && (
                      <Text type="warning" style={{ fontSize: 12 }}>
                        ⚠️ Chưa chọn — engine sẽ mặc định tìm biến tên "RECEIVERPHONE"
                      </Text>
                    )}
                  </Col>
                </Row>
              </Card>
            )}

            {/* billerTrans: Officer ánh xạ biến Biller ID và Customer Code */}
            {basicInfo.action === 'billerTrans' && (
              <Card type="inner" title="Ánh xạ Biến Hóa đơn (Dành riêng cho Biller)" style={{ borderColor: '#0ea5e9' }}>
                <Row gutter={24}>
                  <Col span={12}>
                    <Text strong>Tên biến chứa Mã Nhà cung cấp:</Text>
                    <Select 
                      style={{ width: '100%', marginTop: 8 }} 
                      size="large"
                      placeholder="Chọn biến (phải tạo ở Tab Giao diện)"
                      value={basicInfo.actionParams?.billerIdField || undefined}
                      onChange={(val) => setBasicInfo({ ...basicInfo, actionParams: { ...basicInfo.actionParams, billerIdField: val } })}
                    >
                      {inputFields.map(f => (
                        <Option key={f.variableName} value={f.variableName}>{f.variableName} ({f.label})</Option>
                      ))}
                    </Select>
                  </Col>
                  <Col span={12}>
                    <Text strong>Tên biến chứa Mã Khách hàng:</Text>
                    <Select 
                      style={{ width: '100%', marginTop: 8 }} 
                      size="large"
                      placeholder="Chọn biến (phải tạo ở Tab Giao diện)"
                      value={basicInfo.actionParams?.customerCodeField || undefined}
                      onChange={(val) => setBasicInfo({ ...basicInfo, actionParams: { ...basicInfo.actionParams, customerCodeField: val } })}
                    >
                      {inputFields.map(f => (
                        <Option key={f.variableName} value={f.variableName}>{f.variableName} ({f.label})</Option>
                      ))}
                    </Select>
                  </Col>
                </Row>
                <Row gutter={24} style={{ marginTop: 16 }}>
                  <Col span={12}>
                    <Text strong>Tỉ lệ Chiết khấu / Hoàn tiền (%):</Text>
                    <Input 
                      type="number"
                      style={{ width: '100%', marginTop: 8 }} 
                      size="large"
                      placeholder="Nhập phần trăm (VD: 2), để trống nếu không có"
                      value={basicInfo.actionParams?.discountRate || ''}
                      onChange={(e) => setBasicInfo({ ...basicInfo, actionParams: { ...basicInfo.actionParams, discountRate: e.target.value } })}
                    />
                  </Col>
                </Row>
              </Card>
            )}

            {/* Bank Topup / Withdraw: Officer ánh xạ biến chứa Bank Link ID */}
            {(basicInfo.action === 'bankDeposit' || basicInfo.action === 'bankWithdraw') && (
              <Card type="inner" title="Ánh xạ Thẻ Ngân hàng (Dành riêng cho Nạp/Rút)" style={{ borderColor: '#f59e0b' }}>
                <Row gutter={24}>
                  <Col span={24}>
                    <Text strong>Tên biến chứa Mã Thẻ liên kết:</Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      Engine sẽ dùng mã thẻ này để tra cứu chính xác Ví Ngân hàng nào đang tham gia giao dịch.
                    </Text>
                    <Select 
                      style={{ width: '100%', marginTop: 8 }} 
                      size="large"
                      placeholder="Chọn biến chứa Mã thẻ (VD: BANK_LINK_ID)"
                      value={basicInfo.actionParams?.bankLinkField || undefined}
                      onChange={(val) => setBasicInfo({ ...basicInfo, actionParams: { ...basicInfo.actionParams, bankLinkField: val } })}
                    >
                      {inputFields.map(f => (
                        <Option key={f.variableName} value={f.variableName}>{f.variableName} ({f.label})</Option>
                      ))}
                    </Select>
                    {!basicInfo.actionParams?.bankLinkField && inputFields.length > 0 && (
                      <Text type="warning" style={{ fontSize: 12 }}>
                        ⚠️ Chưa chọn — engine sẽ mặc định tìm biến tên "BANK_LINK_ID"
                      </Text>
                    )}
                  </Col>
                </Row>
              </Card>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
              <div>
                <Text strong style={{ fontSize: 16 }}>Khác biệt Người gửi & Người nhận</Text>
                <br/><Text type="secondary">Đảm bảo Khách hàng không thể chuyển tiền cho chính mình.</Text>
              </div>
              <Switch checked={validations.notSameSender} onChange={v => setValidations({...validations, notSameSender: v})} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
              <div>
                <Text strong style={{ fontSize: 16 }}>Kiểm tra đủ Số dư</Text>
                <br/><Text type="secondary">Tự động kiểm tra ví Khách hàng Gửi xem có đủ tiền (bao gồm Tiền gốc + Phí) hay không.</Text>
              </div>
              <Switch checked={validations.checkBalance} onChange={v => setValidations({...validations, checkBalance: v})} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
              <div>
                <Text strong style={{ fontSize: 16 }}>Hạn mức tối thiểu</Text>
                <br/><Text type="secondary">Giao dịch phải lớn hơn 10.000 VND.</Text>
              </div>
              <Switch checked={validations.minAmount} onChange={v => setValidations({...validations, minAmount: v})} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                <div>
                  <Text strong style={{ fontSize: 16 }}>Hạn mức tối đa</Text>
                  <br/><Text type="secondary">Giới hạn số tiền lớn nhất trong một giao dịch.</Text>
                </div>
                <Switch checked={validations.maxAmount} onChange={v => setValidations({...validations, maxAmount: v})} />
              </div>
              {validations.maxAmount && (
                <div style={{ marginTop: 16 }}>
                  <Text strong>Nhập số tiền tối đa (VND):</Text>
                  <InputNumber 
                    style={{ width: '100%', marginTop: 8 }} 
                    size="large"
                    value={validations.maxAmountValue}
                    onChange={val => setValidations({...validations, maxAmountValue: val})}
                    formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                    parser={value => value.replace(/\$\s?|(,*)/g, '')}
                  />
                </div>
              )}
            </div>
          </Space>
        </Card>
      ),
    },
    {
      title: 'Luồng Kế toán',
      icon: <AccountBookOutlined />,
      content: (
        <Card title="Dòng tiền sẽ đi như thế nào?" className="glass-card">
          <Text type="secondary" style={{ marginBottom: 16, display: 'block' }}>
            Sử dụng các biến số ở Bước 2 để định nghĩa các bước di chuyển của dòng tiền (Kế toán ghi sổ kép).
          </Text>
          
          {glSteps.map((step, index) => (
            <Card key={step.id} style={{ marginBottom: 16, borderColor: '#cbd5e1', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <Input 
                  value={step.title} 
                  onChange={e => updateGlStep(step.id, 'title', e.target.value)} 
                  bordered={false} 
                  style={{ fontWeight: 'bold', fontSize: 16, color: '#0ea5e9', padding: 0 }}
                />
                <Button danger type="text" icon={<DeleteOutlined />} onClick={() => removeGlStep(step.id)} />
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', background: '#f8fafc', padding: '16px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                {/* AMOUNT */}
                <div style={{ flex: 1 }}>
                  <Text strong>Lấy khoản tiền:</Text><br/>
                  <Select placeholder="Chọn khoản tiền" value={step.amountVar} onChange={val => updateGlStep(step.id, 'amountVar', val)} style={{ width: '100%', marginTop: 8 }}>
                    {inputFields.map(f => (
                      <Option key={f.variableName} value={f.variableName}>Biến: {f.variableName}</Option>
                    ))}
                    {basicInfo.action === 'billerTrans' && !inputFields.some(f => f.variableName === 'AMOUNT') && (
                      <Option value="AMOUNT">Số tiền Hóa đơn (Do Biller trả về)</Option>
                    )}
                    {basicInfo.actionParams?.discountRate > 0 && (
                      <Option value="DISCOUNT">Chiết khấu (Tính ngầm)</Option>
                    )}
                    <Option value="FEE">Phí dịch vụ (Tính ở B1)</Option>
                  </Select>
                </div>
                
                <div style={{ padding: '0 16px', paddingTop: 24, color: '#94a3b8' }}>
                  <ArrowRightOutlined />
                </div>
                
                {/* FROM POCKET */}
                <div style={{ flex: 1 }}>
                  <Text strong>Trừ từ Ví (Nợ):</Text><br/>
                  <Select placeholder="Chọn ví trừ tiền" value={step.from} onChange={val => updateGlStep(step.id, 'from', val)} style={{ width: '100%', marginTop: 8 }}>
                    <Option value="SENDER">
                      {basicInfo.action === 'cashIn' || basicInfo.action === 'bankDeposit' 
                        ? 'Ví Ngân Hàng' 
                        : 'Ví Khách Hàng Gửi'}
                    </Option>
                    <Option value="RECEIVER">
                      {basicInfo.action === 'bankWithdraw' 
                        ? 'Ví Ngân Hàng' 
                        : 'Ví Khách Hàng / Biller Nhận'}
                    </Option>
                    {systemPockets.map(p => (
                      <Option key={p.id} value={p.id}>Ví Hệ Thống: {p.name || p.id?.slice(-6)}</Option>
                    ))}
                  </Select>
                </div>

                <div style={{ padding: '0 16px', paddingTop: 24, color: '#94a3b8' }}>
                  <ArrowRightOutlined />
                </div>

                {/* TO POCKET */}
                <div style={{ flex: 1 }}>
                  <Text strong>Cộng vào Ví (Có):</Text><br/>
                  <Select placeholder="Chọn ví cộng tiền" value={step.to} onChange={val => updateGlStep(step.id, 'to', val)} style={{ width: '100%', marginTop: 8 }}>
                    <Option value="SENDER">
                      {basicInfo.action === 'cashIn' || basicInfo.action === 'bankDeposit' 
                        ? 'Ví Ngân Hàng' 
                        : 'Ví Khách Hàng Gửi'}
                    </Option>
                    <Option value="RECEIVER">
                      {basicInfo.action === 'bankWithdraw' 
                        ? 'Ví Ngân Hàng' 
                        : 'Ví Khách Hàng / Biller Nhận'}
                    </Option>
                    {systemPockets.map(p => (
                      <Option key={p.id} value={p.id}>Ví Hệ Thống: {p.name || p.id?.slice(-6)}</Option>
                    ))}
                  </Select>
                </div>
              </div>
            </Card>
          ))}
          
          <Button type="dashed" onClick={addGlStep} icon={<PlusOutlined />} block size="large">
            Thêm Thẻ Bút Toán Dòng Tiền
          </Button>
        </Card>
      ),
    },
  ];

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', paddingBottom: 64 }}>
      <div style={{ marginBottom: 32, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Title level={3} style={{ margin: 0, color: '#0f172a' }}>
            <WalletOutlined style={{ color: '#0ea5e9', marginRight: 12 }} /> 
            Thiết kế Dịch vụ mới
          </Title>
          <Text type="secondary">Xây dựng luồng giao dịch mà không cần lập trình</Text>
        </div>
      </div>

      <Steps 
        current={currentStep} 
        items={steps.map(s => ({ title: s.title, icon: s.icon }))} 
        style={{ marginBottom: 32 }}
      />

      <div style={{ minHeight: 400 }}>
        {steps[currentStep].content}
      </div>

      <div style={{ marginTop: 32, display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #e2e8f0', paddingTop: 24 }}>
        <Button 
          size="large" 
          onClick={() => setCurrentStep(prev => prev - 1)} 
          disabled={currentStep === 0}
        >
          Quay lại
        </Button>
        
        {currentStep < steps.length - 1 ? (
          <Button type="primary" size="large" onClick={() => setCurrentStep(prev => prev + 1)}>
            Tiếp tục
          </Button>
        ) : (
          <Popconfirm title="Phát hành dịch vụ này?" onConfirm={handleFinish}>
            <Button type="primary" size="large" style={{ background: '#10b981', borderColor: '#10b981' }}>
              Lưu & Phát hành
            </Button>
          </Popconfirm>
        )}
      </div>
    </div>
  );
}
