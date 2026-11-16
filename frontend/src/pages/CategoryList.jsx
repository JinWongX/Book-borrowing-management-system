import { useEffect, useMemo, useState } from 'react';
import {
  Card,
  Tree,
  Button,
  Modal,
  Form,
  Input,
  TreeSelect,
  Space,
  message,
  Spin,
  Typography,
  Empty,
  Badge,
  Tag,
  Tooltip,
} from 'antd';
import {
  FolderOutlined,
  FolderOpenOutlined,
  FileOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  ReloadOutlined,
} from '@ant-design/icons';

import request from '../services/request';
import { useAuth } from '../hooks/useAuth';
import { ROLES } from '../utils/menu';

const { Title, Text } = Typography;

const buildTree = (list, parentId = null) => {
  return list
    .filter((item) => item.parent_id === parentId)
    .map((item) => ({
      key: item.id,
      value: item.id,
      title: item.name,
      id: item.id,
      parent_id: item.parent_id,
      path: item.path,
      children: buildTree(list, item.id),
    }));
};

const getDisabledKeys = (node, set = new Set()) => {
  if (!node) return set;
  set.add(node.key);
  (node.children || []).forEach((child) => getDisabledKeys(child, set));
  return set;
};

const mapDisabled = (nodes, disabledSet) => {
  return nodes.map((node) => ({
    ...node,
    disabled: disabledSet.has(node.key),
    children: mapDisabled(node.children || [], disabledSet),
  }));
};

const countNodes = (nodes) => {
  return nodes.reduce((acc, node) => acc + 1 + countNodes(node.children || []), 0);
};

const CategoryList = () => {
  const { role } = useAuth();
  const canManage = role === ROLES.LIBRARIAN || role === ROLES.ADMIN;

  const [categories, setCategories] = useState([]);
  const [treeData, setTreeData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [disabledKeys, setDisabledKeys] = useState(new Set());
  const [keyword, setKeyword] = useState('');
  const [expandedKeys, setExpandedKeys] = useState([]);
  const [form] = Form.useForm();

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const res = await request.get('/categories');
      const list = Array.isArray(res.data.data) ? res.data.data : [];
      setCategories(list);
      const tree = buildTree(list);
      setTreeData(tree);
      setExpandedKeys(tree.map((n) => n.key));
    } catch (error) {
      message.error(error.response?.data?.message || '获取分类列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const filteredTreeData = useMemo(() => {
    if (!keyword.trim()) return treeData;
    const lower = keyword.toLowerCase();

    const filterNodes = (nodes) =>
      nodes
        .map((node) => {
          const matchedChildren = filterNodes(node.children || []);
          const matchedSelf = node.title.toLowerCase().includes(lower);
          if (matchedSelf || matchedChildren.length > 0) {
            return { ...node, children: matchedChildren };
          }
          return null;
        })
        .filter(Boolean);

    return filterNodes(treeData);
  }, [treeData, keyword]);

  const totalCount = useMemo(() => countNodes(treeData), [treeData]);

  const handleAdd = () => {
    setEditingCategory(null);
    form.resetFields();
    setDisabledKeys(new Set());
    setModalVisible(true);
  };

  const handleEdit = (nodeData) => {
    const category = categories.find((c) => c.id === nodeData.id);
    if (!category) return;
    setEditingCategory(category);
    form.setFieldsValue({
      name: category.name,
      parent_id: category.parent_id,
    });
    const node = treeData.find((n) => n.key === category.id);
    setDisabledKeys(getDisabledKeys(node));
    setModalVisible(true);
  };

  const handleDelete = (nodeData) => {
    const category = categories.find((c) => c.id === nodeData.id);
    if (!category) return;
    Modal.confirm({
      title: '确认删除分类',
      content: `确定删除分类 "${category.name}" 吗？删除后不可恢复。`,
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          await request.delete(`/categories/${category.id}`);
          message.success('删除成功');
          fetchCategories();
        } catch (error) {
          message.error(error.response?.data?.message || '删除失败');
        }
      },
    });
  };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    const payload = {
      name: values.name,
      parent_id: values.parent_id || null,
    };
    setSubmitting(true);
    try {
      if (editingCategory) {
        await request.put(`/categories/${editingCategory.id}`, payload);
        message.success('分类更新成功');
      } else {
        await request.post('/categories', payload);
        message.success('分类新增成功');
      }
      setModalVisible(false);
      fetchCategories();
    } catch (error) {
      message.error(error.response?.data?.message || '操作失败');
    } finally {
      setSubmitting(false);
    }
  };

  const titleRender = (nodeData) => {
    const hasChildren = (nodeData.children || []).length > 0;
    const isTopLevel = nodeData.parent_id === null || nodeData.parent_id === undefined;

    return (
      <div className="category-tree-node">
        <span className="category-tree-node-title">
          {hasChildren ? (
            <FolderOpenOutlined className="category-tree-icon category-tree-icon-folder" />
          ) : (
            <FileOutlined className="category-tree-icon category-tree-icon-file" />
          )}
          <Text strong={hasChildren}>{nodeData.title}</Text>
          {isTopLevel && <Tag color="blue" className="category-tree-tag">顶级</Tag>}
          {hasChildren && (
            <Badge
              count={nodeData.children.length}
              style={{ backgroundColor: '#52c41a' }}
              className="category-tree-badge"
            />
          )}
        </span>
        {canManage && (
          <span className="category-tree-node-actions">
            <Tooltip title="编辑">
              <Button
                type="text"
                size="small"
                icon={<EditOutlined />}
                aria-label="编辑"
                onClick={() => handleEdit(nodeData)}
                className="category-tree-action-btn"
              />
            </Tooltip>
            <Tooltip title="删除">
              <Button
                type="text"
                size="small"
                danger
                icon={<DeleteOutlined />}
                aria-label="删除"
                onClick={() => handleDelete(nodeData)}
                className="category-tree-action-btn"
              />
            </Tooltip>
          </span>
        )}
      </div>
    );
  };

  return (
    <Card className="category-list-card">
      <style>{`
        .category-list-card {
          border-radius: 12px;
        }
        .category-list-card .ant-card-body {
          padding: 24px;
        }
        .category-tree-toolbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 12px;
          margin-bottom: 16px;
        }
        .category-tree-search {
          width: 280px;
        }
        .category-tree-meta {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .category-tree-container {
          background: #fafafa;
          border-radius: 8px;
          padding: 16px;
          min-height: 320px;
        }
        .category-tree-node {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          padding: 4px 0;
        }
        .category-tree-node-title {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .category-tree-icon {
          font-size: 16px;
        }
        .category-tree-icon-folder {
          color: #faad14;
        }
        .category-tree-icon-file {
          color: #8c8c8c;
        }
        .category-tree-tag {
          margin-left: 4px;
          font-size: 12px;
          line-height: 18px;
          height: 20px;
        }
        .category-tree-badge {
          margin-left: 4px;
        }
        .category-tree-node-actions {
          display: flex;
          align-items: center;
          gap: 4px;
          opacity: 0;
          transition: opacity 0.2s;
        }
        .ant-tree-treenode:hover .category-tree-node-actions {
          opacity: 1;
        }
        .category-tree-action-btn {
          padding: 0 6px;
        }
        .category-empty-state {
          padding: 48px 0;
        }
      `}</style>

      <Space direction="vertical" style={{ width: '100%' }} size="large">
        <div className="category-tree-toolbar">
          <Title level={4} style={{ margin: 0 }}>
            图书分类管理
          </Title>
          <Space>
            <Input
              placeholder="搜索分类名称"
              prefix={<SearchOutlined />}
              allowClear
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className="category-tree-search"
            />
            <Tooltip title="刷新">
              <Button icon={<ReloadOutlined />} onClick={fetchCategories} loading={loading} />
            </Tooltip>
            {canManage && (
              <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
                新增分类
              </Button>
            )}
          </Space>
        </div>

        <div className="category-tree-meta">
          <Text type="secondary">
            共 <Text strong>{totalCount}</Text> 个分类
          </Text>
          {keyword && (
            <Text type="secondary">
              搜索结果：{countNodes(filteredTreeData)} 个匹配
            </Text>
          )}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 60 }}>
            <Spin size="large" tip="加载分类中..." />
          </div>
        ) : treeData.length === 0 ? (
          <Empty
            description="暂无分类数据"
            className="category-empty-state"
          >
            {canManage && (
              <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
                新增分类
              </Button>
            )}
          </Empty>
        ) : (
          <div className="category-tree-container">
            <Tree
              treeData={filteredTreeData}
              titleRender={titleRender}
              defaultExpandAll
              expandedKeys={expandedKeys}
              onExpand={setExpandedKeys}
              blockNode
              showLine
              showIcon={false}
            />
          </div>
        )}
      </Space>

      <Modal
        title={editingCategory ? '编辑分类' : '新增分类'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        confirmLoading={submitting}
        destroyOnClose
        width={480}
      >
        <Form form={form} layout="vertical" preserve={false}>
          <Form.Item
            label="分类名称"
            name="name"
            rules={[{ required: true, message: '请输入分类名称' }]}
          >
            <Input placeholder="请输入分类名称" prefix={<FolderOutlined />} />
          </Form.Item>
          <Form.Item label="父分类" name="parent_id">
            <TreeSelect
              allowClear
              placeholder="请选择父分类（留空为顶级分类）"
              treeData={mapDisabled(treeData, disabledKeys)}
              treeDefaultExpandAll
              treeNodeFilterProp="title"
              style={{ width: '100%' }}
            />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default CategoryList;
