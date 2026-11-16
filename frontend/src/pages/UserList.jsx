import { useEffect, useState } from 'react';
import {
  Card,
  Table,
  Button,
  Input,
  Select,
  Space,
  Modal,
  Form,
  Switch,
  message,
  Typography,
} from 'antd';
import {
  getUsers,
  createUser,
  updateUser,
  deleteUser,
  updateUserStatus,
  batchUpdateUserStatus,
} from '../services/users';
import { getRoles } from '../services/roles';
import { useAuth } from '../hooks/useAuth';
import { ROLES } from '../utils/menu';

const { Title } = Typography;

const STATUS_ACTIVE = 'active';
const STATUS_INACTIVE = 'inactive';

const UserList = () => {
  const { role } = useAuth();
  const canManage = role === ROLES.ADMIN;

  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [roleFilter, setRoleFilter] = useState(undefined);
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  const [form] = Form.useForm();

  const fetchRoles = async () => {
    try {
      const res = await getRoles({ page_size: 100 });
      const result = res.data.data || {};
      const list = result.items || result.list || [];
      setRoles(list);
    } catch (error) {
      message.error(error.response?.data?.message || '获取角色列表失败');
    }
  };

  const fetchUsers = async (page = 1, pageSize = pagination.pageSize) => {
    setLoading(true);
    try {
      const res = await getUsers({
        keyword,
        role: roleFilter,
        page,
        page_size: pageSize,
      });
      const result = res.data.data || {};
      setUsers(result.items || result.list || []);
      setPagination({
        current: page,
        pageSize,
        total: result.pagination?.total || result.total || 0,
      });
      setSelectedRowKeys([]);
    } catch (error) {
      message.error(error.response?.data?.message || '获取用户列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  useEffect(() => {
    fetchUsers(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keyword, roleFilter]);

  const handleTableChange = (newPagination) => {
    fetchUsers(newPagination.current, newPagination.pageSize);
  };

  const handleAdd = () => {
    setEditingUser(null);
    form.resetFields();
    form.setFieldsValue({ status: STATUS_ACTIVE });
    setModalVisible(true);
  };

  const handleEdit = (record) => {
    setEditingUser(record);
    form.setFieldsValue({
      username: record.username,
      role: record.role?.id || record.role_id,
      department: record.department,
      status: record.is_active ? STATUS_ACTIVE : STATUS_INACTIVE,
    });
    setModalVisible(true);
  };

  const handleDelete = (record) => {
    Modal.confirm({
      title: '确认删除用户',
      content: `确定删除用户 "${record.username}" 吗？`,
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          await deleteUser(record.id);
          message.success('删除成功');
          fetchUsers(pagination.current, pagination.pageSize);
        } catch (error) {
          message.error(error.response?.data?.message || '删除失败');
        }
      },
    });
  };

  const handleStatusChange = async (record, checked) => {
    try {
      await updateUserStatus(record.id, checked);
      message.success('状态更新成功');
      fetchUsers(pagination.current, pagination.pageSize);
    } catch (error) {
      message.error(error.response?.data?.message || '状态更新失败');
    }
  };

  const handleBatchStatus = async (status) => {
    if (selectedRowKeys.length === 0) {
      message.warning('请至少选择一名用户');
      return;
    }
    const isActive = status === STATUS_ACTIVE;
    try {
      await batchUpdateUserStatus(selectedRowKeys, isActive);
      message.success('批量状态更新成功');
      fetchUsers(pagination.current, pagination.pageSize);
    } catch (error) {
      message.error(error.response?.data?.message || '批量状态更新失败');
    }
  };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    const payload = {
      username: values.username,
      role_id: values.role,
      department: values.department,
      is_active: values.status === STATUS_ACTIVE,
    };
    if (!editingUser) {
      payload.password = values.password;
    }
    setSubmitting(true);
    try {
      if (editingUser) {
        await updateUser(editingUser.id, payload);
        message.success('用户更新成功');
      } else {
        await createUser(payload);
        message.success('用户新增成功');
      }
      setModalVisible(false);
      fetchUsers(pagination.current, pagination.pageSize);
    } catch (error) {
      message.error(error.response?.data?.message || '操作失败');
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    { title: '用户名', dataIndex: 'username', key: 'username' },
    { title: '部门', dataIndex: 'department', key: 'department' },
    {
      title: '角色',
      key: 'role',
      render: (_, record) => record.role?.name || record.role_name || '-',
    },
    {
      title: '状态',
      key: 'status',
      render: (_, record) => (
        <Switch
          checked={record.is_active}
          onChange={(checked) => handleStatusChange(record, checked)}
          disabled={!canManage}
          checkedChildren="启用"
          unCheckedChildren="禁用"
        />
      ),
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space>
          {canManage && (
            <>
              <Button type="link" size="small" onClick={() => handleEdit(record)}>
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
          <Title level={4} style={{ margin: 0 }}>用户管理</Title>
          {canManage && (
            <Button type="primary" onClick={handleAdd}>
              新增用户
            </Button>
          )}
        </div>
        <Space wrap>
          <Input.Search
            placeholder="用户名 / 部门"
            allowClear
            onSearch={setKeyword}
            style={{ width: 260 }}
          />
          <Select
            allowClear
            placeholder="按角色筛选"
            style={{ width: 200 }}
            value={roleFilter}
            onChange={setRoleFilter}
            options={roles.map((r) => ({ label: r.name, value: r.id }))}
          />
          {canManage && selectedRowKeys.length > 0 && (
            <>
              <Button onClick={() => handleBatchStatus(STATUS_ACTIVE)}>批量启用</Button>
              <Button danger onClick={() => handleBatchStatus(STATUS_INACTIVE)}>
                批量禁用
              </Button>
            </>
          )}
        </Space>
        <Table
          rowKey="id"
          columns={columns}
          dataSource={users}
          loading={loading}
          pagination={{
            ...pagination,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条`,
          }}
          onChange={handleTableChange}
          rowSelection={
            canManage
              ? {
                  selectedRowKeys,
                  onChange: setSelectedRowKeys,
                }
              : undefined
          }
        />
      </Space>

      <Modal
        title={editingUser ? '编辑用户' : '新增用户'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        confirmLoading={submitting}
        destroyOnClose
      >
        <Form form={form} layout="vertical" preserve={false}>
          <Form.Item
            label="用户名"
            name="username"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input placeholder="请输入用户名" />
          </Form.Item>
          {!editingUser && (
            <Form.Item
              label="密码"
              name="password"
              rules={[{ required: true, message: '请输入密码' }]}
            >
              <Input.Password placeholder="请输入密码" />
            </Form.Item>
          )}
          <Form.Item
            label="角色"
            name="role"
            rules={[{ required: true, message: '请选择角色' }]}
          >
            <Select
              placeholder="请选择角色"
              options={roles.map((r) => ({ label: r.name, value: r.id }))}
            />
          </Form.Item>
          <Form.Item label="部门" name="department">
            <Input placeholder="请输入部门" />
          </Form.Item>
          <Form.Item
            label="状态"
            name="status"
            rules={[{ required: true, message: '请选择状态' }]}
          >
            <Select
              placeholder="请选择状态"
              options={[
                { label: '启用', value: STATUS_ACTIVE },
                { label: '禁用', value: STATUS_INACTIVE },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default UserList;
