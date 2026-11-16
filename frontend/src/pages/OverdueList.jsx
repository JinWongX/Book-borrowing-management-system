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

const OverdueList = () => {
  const navigate = useNavigate();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });

  const fetchOverdue = async (page = 1, pageSize = pagination.pageSize) => {
    setLoading(true);
    try {
      const res = await request.get('/overdue', {
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
      message.error(error.response?.data?.message || '获取逾期列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverdue();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleTableChange = (newPagination) => {
    fetchOverdue(newPagination.current, newPagination.pageSize);
  };

  const columns = [
    {
      title: '借阅单号',
      dataIndex: 'id',
      key: 'id',
      render: (id) => `BR${String(id).padStart(6, '0')}`,
    },
    {
      title: '借阅人',
      key: 'user',
      render: (_, record) => record.user?.username || record.user_name || '-',
    },
    {
      title: '部门',
      key: 'department',
      render: (_, record) => record.user?.department || record.department || '-',
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
      title: '预计归还日期',
      dataIndex: 'expected_return_date',
      key: 'expected_return_date',
      render: (date) => (date ? date.split('T')[0] : '-'),
    },
    {
      title: '逾期天数',
      dataIndex: 'overdue_days',
      key: 'overdue_days',
      render: (days) => (days !== undefined && days !== null ? <Tag color="red">{days} 天</Tag> : '-'),
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
        <Title level={4} style={{ margin: 0 }}>逾期列表</Title>
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

export default OverdueList;
