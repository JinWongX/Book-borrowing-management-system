import { useEffect, useState } from 'react';
import {
  Card,
  Table,
  Tabs,
  Typography,
  message,
  Button,
  Space,
  Spin,
} from 'antd';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import request from '../services/request';

const { Title } = Typography;
const { TabPane } = Tabs;

const TYPE_ENDPOINTS = {
  books: '/statistics/books',
  categories: '/statistics/categories',
  departments: '/statistics/departments',
  users: '/statistics/users',
};

const Statistics = () => {
  const [activeTab, setActiveTab] = useState('books');
  const [data, setData] = useState({
    books: [],
    categories: [],
    departments: [],
    users: [],
    top20: [],
  });
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [booksRes, categoriesRes, departmentsRes, usersRes, top20Res] = await Promise.all([
        request.get(TYPE_ENDPOINTS.books),
        request.get(TYPE_ENDPOINTS.categories),
        request.get(TYPE_ENDPOINTS.departments),
        request.get(TYPE_ENDPOINTS.users),
        request.get('/statistics/top20'),
      ]);

      const parseList = (res) => {
        const result = res.data.data || {};
        return result.items || result.list || (Array.isArray(result) ? result : []);
      };

      setData({
        books: parseList(booksRes),
        categories: parseList(categoriesRes),
        departments: parseList(departmentsRes),
        users: parseList(usersRes),
        top20: parseList(top20Res),
      });
    } catch (error) {
      message.error(error.response?.data?.message || '获取统计数据失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleExport = async (type, format) => {
    try {
      const response = await request.get('/statistics/export', {
        params: { type, format },
        responseType: 'blob',
      });
      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${type}_statistics.${format === 'excel' ? 'xlsx' : 'csv'}`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      message.error(error.response?.data?.message || '导出失败');
    }
  };

  const renderExportButtons = (type) => (
    <Space>
      <Button size="small" onClick={() => handleExport(type, 'excel')}>
        导出 Excel
      </Button>
      <Button size="small" onClick={() => handleExport(type, 'csv')}>
        导出 CSV
      </Button>
    </Space>
  );

  const bookColumns = [
    { title: '图书', dataIndex: 'name', key: 'name' },
    { title: '借阅次数', dataIndex: 'borrow_count', key: 'borrow_count', sorter: (a, b) => a.borrow_count - b.borrow_count },
  ];

  const categoryColumns = [
    { title: '分类', dataIndex: 'name', key: 'name' },
    { title: '借阅次数', dataIndex: 'borrow_count', key: 'borrow_count', sorter: (a, b) => a.borrow_count - b.borrow_count },
  ];

  const departmentColumns = [
    { title: '部门', dataIndex: 'name', key: 'name', render: (v) => v || '未设置' },
    { title: '借阅次数', dataIndex: 'borrow_count', key: 'borrow_count', sorter: (a, b) => a.borrow_count - b.borrow_count },
  ];

  const userColumns = [
    { title: '用户', dataIndex: 'name', key: 'name' },
    { title: '借阅次数', dataIndex: 'borrow_count', key: 'borrow_count', sorter: (a, b) => a.borrow_count - b.borrow_count },
  ];

  return (
    <Card>
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Title level={4} style={{ margin: 0 }}>统计报表</Title>
          <Button onClick={fetchData} loading={loading}>
            刷新
          </Button>
        </div>

        {loading && data.books.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <Spin tip="加载中..." />
          </div>
        ) : (
          <Tabs activeKey={activeTab} onChange={setActiveTab}>
            <TabPane tab="按图书统计" key="books">
              <Table
                rowKey="id"
                columns={bookColumns}
                dataSource={data.books}
                loading={loading}
                pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (total) => `共 ${total} 条` }}
                title={() => renderExportButtons('books')}
              />
            </TabPane>
            <TabPane tab="按分类统计" key="categories">
              <Table
                rowKey="id"
                columns={categoryColumns}
                dataSource={data.categories}
                loading={loading}
                pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (total) => `共 ${total} 条` }}
                title={() => renderExportButtons('categories')}
              />
            </TabPane>
            <TabPane tab="按部门统计" key="departments">
              <Table
                rowKey="id"
                columns={departmentColumns}
                dataSource={data.departments}
                loading={loading}
                pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (total) => `共 ${total} 条` }}
                title={() => renderExportButtons('departments')}
              />
            </TabPane>
            <TabPane tab="按个人统计" key="users">
              <Table
                rowKey="id"
                columns={userColumns}
                dataSource={data.users}
                loading={loading}
                pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (total) => `共 ${total} 条` }}
                title={() => renderExportButtons('users')}
              />
            </TabPane>
            <TabPane tab="热门图书 Top20" key="top20">
              <div style={{ marginBottom: 16 }}>
                <Space>
                  <Button size="small" onClick={() => handleExport('top20', 'excel')}>
                    导出 Excel
                  </Button>
                  <Button size="small" onClick={() => handleExport('top20', 'csv')}>
                    导出 CSV
                  </Button>
                </Space>
              </div>
              <div style={{ height: 400, marginBottom: 24 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.top20} layout="vertical" margin={{ left: 80, right: 30, top: 10, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={180} tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="borrow_count" name="借阅次数" fill="#1890ff" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <Table
                rowKey="id"
                columns={[
                  { title: '排名', key: 'rank', render: (_, __, index) => index + 1 },
                  { title: '图书', dataIndex: 'name', key: 'name' },
                  { title: '借阅次数', dataIndex: 'borrow_count', key: 'borrow_count' },
                ]}
                dataSource={data.top20}
                loading={loading}
                pagination={{ pageSize: 10 }}
              />
            </TabPane>
          </Tabs>
        )}
      </Space>
    </Card>
  );
};

export default Statistics;
