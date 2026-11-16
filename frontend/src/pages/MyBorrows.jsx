import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Table, Tag, Space, Typography, message, Button } from 'antd';
import request from '../services/request';

const { Title } = Typography;

const STATUS_MAP = {
  pending: { text: '待审核', color: 'orange' },
  approved: { text: '已通过', color: 'blue' },
  borrowed: { text: '借阅中', color: 'cyan' },
  returned: { text: '已归还', color: 'green' },
  rejected: { text: '已拒绝', color: 'red' },
};

const MyBorrows = () => {
  const navigate = useNavigate();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });

  const fetchRecords = async (page = 1, pageSize = pagination.pageSize) => {
    setLoading(true);
    try {
      const res = await request.get('/borrows/my', {
        params: { page, page_size: pageSize },
      });
      const result = res.data.data || {};
      const list = result.items || result.list || (Array.isArray(result) ? result : []);
      setRecords(list);
      setPagination({
        current: page,
        pageSize,
        total: result.pagination?.total || result.total || list.length,
      });
    } catch (error) {
      message.error(error.response?.data?.message || '获取借阅记录失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleTableChange = (newPagination) => {
    fetchRecords(newPagination.current, newPagination.pageSize);
  };

  const columns = [
    {
      title: '借阅单号',
      dataIndex: 'id',
      key: 'id',
      render: (id) => `BR${String(id).padStart(6, '0')}`,
    },
    {
      title: '图书',
      key: 'book',
      render: (_, record) => record.book?.title || record.book_title || '-',
    },
    {
      title: 'ISBN',
      key: 'isbn',
      render: (_, record) => record.book?.isbn || record.book_isbn || '-',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        const config = STATUS_MAP[status] || { text: status, color: 'default' };
        return <Tag color={config.color}>{config.text}</Tag>;
      },
    },
    {
      title: '预计归还日期',
      dataIndex: 'expected_return_date',
      key: 'expected_return_date',
      render: (date) => (date ? date.split('T')[0] : '-'),
    },
    {
      title: '实际归还日期',
      dataIndex: 'actual_return_date',
      key: 'actual_return_date',
      render: (date) => (date ? date.split('T')[0] : '-'),
    },
    {
      title: '拒绝理由',
      dataIndex: 'reject_reason',
      key: 'reject_reason',
      render: (reason) => reason || '-',
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space>
          <Button type="link" size="small" onClick={() => navigate(`/books/${record.book_id}`)}>
            查看图书
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <Card>
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        <Title level={4} style={{ margin: 0 }}>我的借阅</Title>
        <Table
          rowKey="id"
          columns={columns}
          dataSource={records}
          loading={loading}
          pagination={{
            ...pagination,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条`,
          }}
          onChange={handleTableChange}
        />
      </Space>
    </Card>
  );
};

export default MyBorrows;
