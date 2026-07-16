import { useState, useEffect, useContext } from 'react';
import { Card, Typography, Tabs, Button, Result, Spin, notification, Alert } from 'antd';
import { QrcodeOutlined, ScanOutlined, DownloadOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { AuthContext } from '../../context/AuthContext';

const { Title, Text } = Typography;

const Scanner = ({ onScanSuccess }) => {
  useEffect(() => {
    // Khởi tạo Html5QrcodeScanner
    const scanner = new Html5QrcodeScanner(
      'reader',
      {
        qrbox: { width: 250, height: 250 },
        fps: 5,
      },
      false
    );

    const handleSuccess = (decodedText, decodedResult) => {
      // Dừng scan sau khi thành công
      scanner.clear().then(() => {
        onScanSuccess(decodedText);
      }).catch(err => console.error(err));
    };

    const handleError = (err) => {
      // Bỏ qua lỗi không tìm thấy mã
    };

    scanner.render(handleSuccess, handleError);

    return () => {
      // Cleanup khi component unmount
      scanner.clear().catch(error => console.error('Failed to clear html5QrcodeScanner.', error));
    };
  }, [onScanSuccess]);

  return <div id="reader" style={{ width: '100%', maxWidth: '400px', margin: '0 auto' }}></div>;
};

export default function QRPayment() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleScanSuccess = (decodedText) => {
    try {
      // Cố gắng parse JSON
      const data = JSON.parse(decodedText);
      if (data.phone) {
        notification.success({
          message: 'Quét mã thành công!',
          description: `Chuyển hướng đến chuyển khoản cho ${data.name || data.phone}`,
        });
        navigate(`/app/transfer?phone=${data.phone}`);
      } else {
        notification.warning({
          message: 'Mã QR không hợp lệ',
          description: 'Mã QR không chứa thông tin số điện thoại của Mini Wallet.',
        });
      }
    } catch (e) {
      // Fallback: nếu quét ra 1 chuỗi số, coi như đó là số điện thoại luôn
      if (/^\d{9,11}$/.test(decodedText.trim())) {
        notification.success({
          message: 'Quét mã thành công!',
        });
        navigate(`/app/transfer?phone=${decodedText.trim()}`);
      } else {
        notification.error({
          message: 'Lỗi định dạng',
          description: 'Mã QR này không thuộc hệ thống Mini Wallet.',
        });
      }
    }
  };

  const handleDownload = () => {
    const svg = document.getElementById('my-qr-code');
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      const pngFile = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.download = 'MiniWallet_QR.png';
      downloadLink.href = `${pngFile}`;
      downloadLink.click();
    };
    
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  // Tạo data mã QR
  const qrData = JSON.stringify({
    phone: user?.phone,
    name: user?.name,
    app: 'MiniWallet'
  });

  const tabItems = [
    {
      key: 'scan',
      label: (
        <span>
          <ScanOutlined />
          Quét mã
        </span>
      ),
      children: (
        <div style={{ textAlign: 'center', padding: '24px 0' }}>
          <Title level={4}>Đưa mã QR vào khung quét</Title>
          <Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>
            Để quét mã, vui lòng cấp quyền sử dụng Camera cho trình duyệt.
          </Text>
          <Scanner onScanSuccess={handleScanSuccess} />
        </div>
      )
    },
    {
      key: 'my_qr',
      label: (
        <span>
          <QrcodeOutlined />
          Mã của tôi
        </span>
      ),
      children: (
        <div style={{ textAlign: 'center', padding: '24px 0' }}>
          <Title level={4}>Mã QR Nhận tiền</Title>
          <Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>
            Đưa mã này cho người khác quét để nhận tiền nhé!
          </Text>
          
          <div style={{ 
            background: '#ffffff', 
            padding: '24px', 
            borderRadius: '16px', 
            display: 'inline-block',
            boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
            border: '1px solid #f0f0f0'
          }}>
            <QRCodeSVG 
              id="my-qr-code"
              value={qrData} 
              size={200}
              level="H"
              includeMargin={true}
              fgColor="#0f172a"
            />
            <Title level={5} style={{ marginTop: 16, marginBottom: 4, color: '#0ea5e9' }}>{user?.name}</Title>
            <Text strong style={{ fontSize: 16 }}>{user?.phone}</Text>
          </div>
          
          <div style={{ marginTop: 24 }}>
            <Button type="primary" icon={<DownloadOutlined />} size="large" onClick={handleDownload}>
              Tải mã xuống
            </Button>
          </div>
        </div>
      )
    }
  ];

  return (
    <div style={{ maxWidth: 600, margin: '0 auto' }}>
      <Title level={3} style={{ marginBottom: 24 }}>
        Thanh toán QR Code
      </Title>
      
      <Card className="glass-card" style={{ borderRadius: 16 }}>
        <Tabs defaultActiveKey="scan" centered items={tabItems} size="large" />
      </Card>
    </div>
  );
}
