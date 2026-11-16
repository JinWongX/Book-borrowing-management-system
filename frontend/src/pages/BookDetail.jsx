import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  Descriptions,
  Button,
  Modal,
  Form,
  DatePicker,
  Space,
  message,
  Spin,
  Tag,
  Typography,
} from 'antd';
import dayjs from 'dayjs';
import request from '../services/request';
import { useAuth } from '../hooks/useAuth';
import { ROLES } from '../utils/menu';

const { Title } = Typography;

const BookDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { role, user } = useAuth();
  const isEmployee = role === ROLES.EMPLOYEE;

  const [book, setBook] = useState(null);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();

  const fetchBook = async () => {
    setLoading(true);
    try {
      const res = await request.get(`/books/${id}`);
      setBook(res.data.data || null);
    } catch (error) {
      message.error(error.response?.data?.message || '获取图书详情失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBook();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleBorrow = async () => {
    const values = await form.validateFields();
    if (!book || book.stock <= 0) {
      message.error('该图书库存不足，无法申请借阅');
      return;
    }
    setSubmitting(true);
    try {
      await request.post('/borrows', {
        book_id: Number(id),
        expected_return_date: values.expected_return_date.format('YYYY-MM-DD'),
      });
      message.success('借阅申请已提交，请等待审核');
      setModalVisible(false);
      form.resetFields();
      fetchBook();
    } catch (error) {
      message.error(error.response?.data?.message || '申请借阅失败');
    } finally {
      setSubmitting(false);
    }
  };

  const disabledDate = (current) => {
    return current && current < dayjs().startOf('day');
  };

  if (loading) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: 40 }}>
          <Spin tip="加载中..." />
        </div>
      </Card>
    );
  }

  if (!book) {
    return (
      <Card>
        <Title level={4}>图书不存在</Title>
        <Button type="primary" onClick={() => navigate('/books')}>
          返回列表
        </Button>
      </Card>
    );
  }

  return (
    <Card>
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Title level={4} style={{ margin: 0 }}>图书详情</Title>
          <Space>
            {isEmployee && (
              <Button
                type="primary"
                disabled={book.stock <= 0}
                onClick={() => setModalVisible(true)}
              >
                {book.stock > 0 ? '申请借阅' : '暂无库存'}
              </Button>
            )}
            <Button onClick={() => navigate('/books')}>返回列表</Button>
          </Space>
        </div>

        <Descriptions bordered column={2}>
          <Descriptions.Item label="书名">{book.title}</Descriptions.Item>
          <Descriptions.Item label="ISBN">{book.isbn}</Descriptions.Item>
          <Descriptions.Item label="作者">{book.author || '-'}</Descriptions.Item>
          <Descriptions.Item label="出版社">{book.publisher || '-'}</Descriptions.Item>
          <Descriptions.Item label="分类">
            {book.category?.name || book.category_name || '-'}
          </Descriptions.Item>
          <Descriptions.Item label="库存">
            {book.stock > 0 ? (
              <Tag color="green">{book.stock} 本</Tag>
            ) : (
              <Tag color="red">缺货</Tag>
            )}
          </Descriptions.Item>
          <Descriptions.Item label="上架位置">{book.location || '-'}</Descriptions.Item>
          <Descriptions.Item label="封面">
            {book.cover_url ? (
              <img src={book.cover_url} alt={book.title} style={{ maxHeight: 120 }} />
            ) : (
              '-'
            )}
          </Descriptions.Item>
        </Descriptions>
      </Space>

      <Modal
        title="申请借阅"
        open={modalVisible}
        onOk={handleBorrow}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
        }}
        confirmLoading={submitting}
        destroyOnClose
      >
        <Form form={form} layout="vertical" preserve={false}>
          <Form.Item label="图书">{book.title}</Form.Item>
          <Form.Item label="借阅人">{user?.username}</Form.Item>
          <Form.Item
            label="预计归还日期"
            name="expected_return_date"
            rules={[{ required: true, message: '请选择预计归还日期' }]}
          >
            <DatePicker
              style={{ width: '100%' }}
              placeholder="请选择预计归还日期"
              disabledDate={disabledDate}
            />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default BookDetail;
