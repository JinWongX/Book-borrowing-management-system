import { useEffect, useState } from 'react';
import {
  Card,
  Table,
  Button,
  Input,
  Space,
  Modal,
  Form,
  Checkbox,
  Tag,
  List,
  message,
  Typography,
} from 'antd';
import {
  getRoles,
  createRole,
  updateRole,
  deleteRole,
  getRoleUsers,
} from '../services/roles';
import { useAuth } from '../hooks/useAuth';
import { ROLES } from '../utils/menu';

const { Title } = Typography;

const PERMISSIONS = [
  { label: '图书查看', value: 'book:read' },
  { label: '图书编辑', value: 'book:write' },
  { label: '分类管理', value: 'category:manage' },
  { label: '借阅申请', value: 'borrow:create' },
  { label: '查看本人借阅', value: 'borrow:read-self' },
  { label: '查看全部借阅', value: 'borrow:read-all' },
  { label: '借阅审核', value: 'borrow:review' },
  { label: '借还登记', value: 'borrow:lend-return' },
  { label: '逾期查看', value: 'overdue:read' },
  { label: '统计报表', value: 'statistics:read' },
  { label: '消息查看', value: 'notification:read' },
  { label: '用户管理', value: 'user:manage' },
  { label: '角色管理', value: 'role:manage' },
];

const SYSTEM_ROLE_NAMES = ['admin', 'librarian', 'employee'];

const isSystemRole = (role) => {
  if (role.is_system) return true;
  return SYSTEM_ROLE_NAMES.includes(role.name);
};

const RoleManagement = () => {
  const { role } = useAuth();
  const canManage = role === ROLES.ADMIN;

  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [usersModalVisible, setUsersModalVisible] = useState(false);
  const [usersModalTitle, setUsersModalTitle] = useState('');
  const [roleUsers, setRoleUsers] = useState([]);
  const [roleUsersLoading, setRoleUsersLoading] = useState(false);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  const [form] = Form.useForm();

  const fetchRoles = async (page = 1, pageSize = pagination.pageSize) => {
    setLoading(true);
    try {
      const res = await getRoles({
        keyword,
        page,
        page_size: pageSize,
      });
      const result = res.data.data || {};
      setRoles(result.items || result.list || []);
      setPagination({
        current: page,
        pageSize,
        total: result.pagination?.total || result.total || 0,
      });
    } catch (error) {
      message.error(error.response?.data?.message || '获取角色列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keyword]);

  const handleTableChange = (newPagination) => {
    fetchRoles(newPagination.current, newPagination.pageSize);
  };

  const handleAdd = () => {
    setEditingRole(null);
    form.resetFields();
    form.setFieldsValue({ permissions: [] });
    setModalVisible(true);
  };

  const handleEdit = (record) => {
    setEditingRole(record);
    form.setFieldsValue({
      name: record.name,
      description: record.description,
      permissions: record.permissions || [],
    });
    setModalVisible(true);
  };

  const handleDelete = (record) => {
    if (isSystemRole(record)) {
      message.warning('系统预设角色不允许删除');
      return;
    }
    Modal.confirm({
      title: '确认删除角色',
      content: `确定删除角色 "${record.name}" 吗？`,
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          await deleteRole(record.id);
          message.success('删除成功');
          fetchRoles(pagination.current, pagination.pageSize);
        } catch (error) {
          message.error(error.response?.data?.message || '删除失败');
        }
      },
    });
  };

  const handleViewUsers = async (record) => {
    setUsersModalTitle(`角色 "${record.name}" 关联用户`);
    setUsersModalVisible(true);
    setRoleUsersLoading(true);
    try {
      const res = await getRoleUsers(record.id);
      const result = res.data.data || {};
      setRoleUsers(result.items || result.list || result || []);
    } catch (error) {
      message.error(error.response?.data?.message || '获取关联用户失败');
      setRoleUsers([]);
    } finally {
      setRoleUsersLoading(false);
    }
  };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    const payload = {
      name: values.name,
      description: values.description,
      permissions: values.permissions || [],
    };
    setSubmitting(true);
    try {
      if (editingRole) {
        await updateRole(editingRole.id, payload);
        message.success('角色更新成功');
      } else {
        await createRole(payload);
        message.success('角色新增成功');
      }
      setModalVisible(false);
      fetchRoles(pagination.current, pagination.pageSize);
    } catch (error) {
      message.error(error.response?.data?.message || '操作失败');
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    { title: '角色名称', dataIndex: 'name', key: 'name' },
    { title: '描述', dataIndex: 'description', key: 'description' },
    {
      title: '权限',
      key: 'permissions',
      render: (_, record) => {
        const permissions = record.permissions || [];
        if (permissions.length === 0) return '-';
        return (
          <Space size={[0, 4]} wrap>
            {permissions.slice(0, 3).map((p) => (
              <Tag key={p}>{p}</Tag>
            ))}
            {permissions.length > 3 && <Tag>+{permissions.length - 3}</Tag>}
          </Space>
        );
      },
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space>
          <Button type="link" size="small" onClick={() => handleViewUsers(record)}>
            查看用户
          </Button>
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
          <Title level={4} style={{ margin: 0 }}>角色权限管理</Title>
          {canManage && (
            <Button type="primary" onClick={handleAdd}>
              新增角色
            </Button>
          )}
        </div>
        <Space wrap>
          <Input.Search
            placeholder="角色名称"
            allowClear
            onSearch={setKeyword}
            style={{ width: 260 }}
          />
        </Space>
        <Table
          rowKey="id"
          columns={columns}
          dataSource={roles}
          loading={loading}
          pagination={{
            ...pagination,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条`,
          }}
          onChange={handleTableChange}
        />
      </Space>

      <Modal
        title={editingRole ? '编辑角色' : '新增角色'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        confirmLoading={submitting}
        destroyOnClose
      >
        <Form form={form} layout="vertical" preserve={false}>
          <Form.Item
            label="角色名称"
            name="name"
            rules={[{ required: true, message: '请输入角色名称' }]}
          >
            <Input placeholder="请输入角色名称" />
          </Form.Item>
          <Form.Item label="描述" name="description">
            <Input.TextArea rows={3} placeholder="请输入角色描述" />
          </Form.Item>
          <Form.Item label="权限" name="permissions">
            <Checkbox.Group options={PERMISSIONS} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={usersModalTitle}
        open={usersModalVisible}
        onCancel={() => setUsersModalVisible(false)}
        footer={null}
        destroyOnClose
      >
        {roleUsersLoading ? (
          <div style={{ textAlign: 'center', padding: 20 }}>加载中...</div>
        ) : roleUsers.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 20 }}>暂无关联用户</div>
        ) : (
          <List
            dataSource={roleUsers}
            renderItem={(item) => (
              <List.Item>
                <div>
                  <div>{item.username}</div>
                  {item.department && (
                    <div style={{ color: '#888', fontSize: 12 }}>{item.department}</div>
                  )}
                </div>
              </List.Item>
            )}
          />
        )}
      </Modal>
    </Card>
  );
};

export default RoleManagement;
