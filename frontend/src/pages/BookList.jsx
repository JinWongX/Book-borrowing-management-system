import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  Table,
  Button,
  Input,
  TreeSelect,
  Space,
  message,
  Modal,
  Typography,
} from 'antd';
import request from '../services/request';
import { useAuth } from '../hooks/useAuth';
import { ROLES } from '../utils/menu';

const { Title } = Typography;

const buildTree = (list, parentId = null) => {
  return list
    .filter((item) => item.parent_id === parentId)
    .map((item) => ({
      key: item.id,
      value: item.id,
      title: item.name,
      children: buildTree(list, item.id),
    }));
};

const BookList = () => {
  const navigate = useNavigate();
  const { role } = useAuth();
  const canManage = role === ROLES.LIBRARIAN || role === ROLES.ADMIN;

  const [books, setBooks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [categoryId, setCategoryId] = useState(undefined);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });

  const fetchCategories = async () => {
    try {
      const res = await request.get('/categories');
      const list = Array.isArray(res.data.data) ? res.data.data : [];
      setCategories(buildTree(list));
    } catch (error) {
      message.error(error.response?.data?.message || '获取分类失败');
    }
  };

  const fetchBooks = async (page = 1, pageSize = pagination.pageSize) => {
    setLoading(true);
    try {
      const res = await request.get('/books', {
        params: {
          keyword,
          category_id: categoryId,
          page,
          page_size: pageSize,
        },
      });
      const result = res.data.data || {};
      setBooks(result.items || result.list || []);
      setPagination({
        current: page,
        pageSize,
        total: result.pagination?.total || result.total || 0,
      });
    } catch (error) {
      message.error(error.response?.data?.message || '获取图书列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchBooks(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keyword, categoryId]);

  const handleTableChange = (newPagination) => {
    fetchBooks(newPagination.current, newPagination.pageSize);
  };

  const handleDelete = (record) => {
    Modal.confirm({
      title: '确认删除图书',
      content: `确定删除图书 "${record.title}" 吗？`,
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          await request.delete(`/books/${record.id}`);
          message.success('删除成功');
          fetchBooks(pagination.current, pagination.pageSize);
        } catch (error) {
          message.error(error.response?.data?.message || '删除失败');
        }
      },
    });
  };

  const columns = [
    { title: '书名', dataIndex: 'title', key: 'title' },
    { title: '作者', dataIndex: 'author', key: 'author' },
    { title: 'ISBN', dataIndex: 'isbn', key: 'isbn' },
    { title: '出版社', dataIndex: 'publisher', key: 'publisher' },
    {
      title: '分类',
      key: 'category',
      render: (_, record) => record.category?.name || record.category_name || '-',
    },
    { title: '库存', dataIndex: 'stock', key: 'stock' },
    { title: '上架位置', dataIndex: 'location', key: 'location' },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space>
          <Button type="link" size="small" onClick={() => navigate(`/books/${record.id}`)}>
            详情
          </Button>
          {canManage && (
            <>
              <Button
                type="link"
                size="small"
                onClick={() => navigate(`/books/edit/${record.id}`)}
              >
                编辑
              </Button>
              <Button
                type="link"
                size="small"
                danger
                onClick={() => handleDelete(record)}
              >
                删除
              </Button>
            </>
          )}
        </Space>
      ),
    },
  ];

  return (
    <Card>
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Title level={4} style={{ margin: 0 }}>图书检索</Title>
          {canManage && (
            <Button type="primary" onClick={() => navigate('/books/new')}>
              新增图书
            </Button>
          )}
        </div>
        <Space wrap>
          <Input.Search
            placeholder="书名 / 作者 / ISBN"
            allowClear
            onSearch={setKeyword}
            style={{ width: 260 }}
          />
          <TreeSelect
            allowClear
            placeholder="按分类筛选"
            treeData={categories}
            treeDefaultExpandAll
            style={{ width: 240 }}
            value={categoryId}
            onChange={setCategoryId}
          />
        </Space>
        <Table
          rowKey="id"
          columns={columns}
          dataSource={books}
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

export default BookList;
