import React, { useState, useEffect, useContext } from 'react';
import { Card, Typography, Table, Tag, notification } from 'antd';
import { ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons';
import { SocketContext } from '../../context/SocketContext';
import { useHistory } from '../../hooks/useCustomer';
import { useQueryClient } from '@tanstack/react-query';

const { Title, Text } = Typography;

export default function CustomerHistory() {
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const { io } = useContext(SocketContext);
  const queryClient = useQueryClient();

  const { data: historyData, isLoading, isError, error } = useHistory({
    page: pagination.current,
    limit: pagination.pageSize
  });

  const history = historyData?.items || [];

  useEffect(() => {
    if (isError) {
      notification.error({ message: 'Lỗi', description: error.message || 'Không thể tải lịch sử giao dịch.' });
    }
  }, [isError, error]);

  useEffect(() => {
    if (io && io.socket) {
      const handleTransactionUpdate = (msg) => {
        if (msg?.transaction?.status === 'done') {
          notification.success({ message: 'Thành công', description: 'Có giao dịch mới được hoàn tất!' });
        }
        queryClient.invalidateQueries({ queryKey: ['customerHistory'] });
      };
      io.socket.on('transaction_updated', handleTransactionUpdate);
      return () => {
        io.socket.off('transaction_updated', handleTransactionUpdate);
      };
    }
  }, [io, queryClient]);

  const handleTableChange = (newPagination) => {
    setPagination(newPagination);
  };

  const columns = [
    {
      title: 'Thời gian',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (val) => val ? new Date(val).toLocaleString('vi-VN') : '---'
    },
    {
      title: 'Mã giao dịch',
      dataIndex: 'transRefId',
      key: 'transRefId',
      render: (text) => <Text copyable>{text}</Text>
    },
    {
      title: 'Số tiền',
      dataIndex: 'amount',
      key: 'amount',
      align: 'right',
      render: (amount, record) => {
        const isCredit = record.direction === 'credit';
        const displayValue = isCredit ? amount : record.totalAmount;
        const sign = isCredit ? '+' : '-';
        const color = isCredit ? '#22c55e' : '#ef4444';
        return (
          <strong style={{ color }}>
            {sign}{displayValue?.toLocaleString('vi-VN')} đ
          </strong>
        );
      }
    },
    {
      title: 'Dịch vụ',
      dataIndex: 'serviceName',
      key: 'serviceName',
      align: 'center',
      render: (serviceName) => <Tag color="blue">{serviceName || 'KHÔNG RÕ'}</Tag>
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      align: 'center',
      render: (status) => <Tag color="success">{status?.toUpperCase()}</Tag>
    },
    {
      title: 'Nội dung',
      dataIndex: 'description',
      key: 'description',
      render: (text) => <Text type="secondary" italic>{text || 'Không có ghi chú'}</Text>
    }
  ];

  return (
    <div>
      <Title level={3} style={{ marginBottom: 24, color: '#0f172a' }}>Lịch sử giao dịch</Title>
      <Card className="glass-card" style={{ borderRadius: 16 }}>
        <Table 
          columns={columns} 
          dataSource={history} 
          rowKey="id"
          pagination={pagination}
          loading={isLoading}
          onChange={handleTableChange}
        />
      </Card>
    </div>
  );
}
