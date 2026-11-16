import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  Form,
  Input,
  InputNumber,
  TreeSelect,
  Button,
  Space,
  Upload,
  message,
  Typography,
} from 'antd';
import { UploadOutlined } from '@ant-design/icons';
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

const BookForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { role } = useAuth();
  const isEdit = !!id;
  const canManage = role === ROLES.LIBRARIAN || role === ROLES.ADMIN;

  const [form] = Form.useForm();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const coverUrl = Form.useWatch('cover_url', form);

  const fetchCategories = async () => {
    try {
      const res = await request.get('/categories');
      const list = Array.isArray(res.data.data) ? res.data.data : [];
      setCategories(buildTree(list));
    } catch (error) {
      message.error(error.response?.data?.message || '获取分类失败');
    }
  };

  const fetchBook = async () => {
    setLoading(true);
    try {
      const res = await request.get(`/books/${id}`);
      const book = res.data.data || {};
      form.setFieldsValue({
        title: book.title,
        author: book.author,
        isbn: book.isbn,
        publisher: book.publisher,
        category_id: book.category_id,
        stock: book.stock,
        location: book.location,
        cover_url: book.cover_url,
      });
    } catch (error) {
      message.error(error.response?.data?.message || '获取图书详情失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
    if (isEdit) {
      fetchBook();
    } else {
      form.resetFields();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleCoverChange = ({ file }) => {
    if (file.status === 'done') {
      const url = file.response?.data?.url;
      if (url) {
        const baseUrl = request.defaults.baseURL.replace('/api', '');
        const fullUrl = url.startsWith('http') ? url : `${baseUrl}${url}`;
        form.setFieldsValue({ cover_url: fullUrl });
        message.success('封面上传成功');
      }
    } else if (file.status === 'error') {
      message.error(file.response?.message || '封面上传失败');
    }
  };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    const payload = {
      ...values,
      category_id: values.category_id || null,
    };
    setSubmitting(true);
    try {
      if (isEdit) {
        await request.put(`/books/${id}`, payload);
        message.success('图书更新成功');
      } else {
        await request.post('/books', payload);
        message.success('图书新增成功');
      }
      navigate('/books');
    } catch (error) {
      message.error(error.response?.data?.message || '操作失败');
    } finally {
      setSubmitting(false);
    }
  };

  if (!canManage) {
    return (
      <Card>
        <Title level={4}>无权限</Title>
        <p>您没有权限访问图书编辑页面。</p>
      </Card>
    );
  }

  return (
    <Card>
      <Title level={4}>{isEdit ? '编辑图书' : '新增图书'}</Title>
      <Form
        form={form}
        layout="vertical"
        initialValues={{ stock: 0 }}
        style={{ maxWidth: 600, marginTop: 24 }}
      >
        <Form.Item
          label="书名"
          name="title"
          rules={[{ required: true, message: '请输入书名' }]}
        >
          <Input placeholder="请输入书名" />
        </Form.Item>

        <Form.Item label="作者" name="author">
          <Input placeholder="请输入作者" />
        </Form.Item>

        <Form.Item
          label="ISBN"
          name="isbn"
          rules={[{ required: true, message: '请输入ISBN' }]}
        >
          <Input placeholder="请输入ISBN" />
        </Form.Item>

        <Form.Item label="出版社" name="publisher">
          <Input placeholder="请输入出版社" />
        </Form.Item>

        <Form.Item label="分类" name="category_id">
          <TreeSelect
            allowClear
            placeholder="请选择分类"
            treeData={categories}
            treeDefaultExpandAll
          />
        </Form.Item>

        <Form.Item
          label="库存数量"
          name="stock"
          rules={[{ required: true, message: '请输入库存数量' }]}
        >
          <InputNumber min={0} style={{ width: '100%' }} placeholder="请输入库存数量" />
        </Form.Item>

        <Form.Item label="上架位置" name="location">
          <Input placeholder="请输入上架位置" />
        </Form.Item>

        <Form.Item label="封面图" name="cover_url">
          <Space direction="vertical" style={{ width: '100%' }}>
            <Input placeholder="请输入封面图 URL" />
            <Upload
              name="file"
              action={`${request.defaults.baseURL}/books/upload-cover`}
              headers={{
                Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
              }}
              showUploadList={false}
              onChange={handleCoverChange}
            >
              {coverUrl ? (
                <img
                  src={coverUrl}
                  alt="封面预览"
                  style={{ maxHeight: 120, maxWidth: '100%', display: 'block' }}
                />
              ) : (
                <Button icon={<UploadOutlined />}>上传封面</Button>
              )}
            </Upload>
          </Space>
        </Form.Item>

        <Form.Item>
          <Space>
            <Button type="primary" onClick={handleSubmit} loading={submitting || loading}>
              {isEdit ? '保存' : '提交'}
            </Button>
            <Button onClick={() => navigate('/books')}>取消</Button>
          </Space>
        </Form.Item>
      </Form>
    </Card>
  );
};

export default BookForm;
