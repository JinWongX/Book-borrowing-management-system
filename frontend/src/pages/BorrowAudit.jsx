import { useEffect, useState } from 'react';
import {
  Card,
  Table,
  Tag,
  Space,
  Typography,
  message,
  Button,
  Modal,
  Form,
  Input,
  Tabs,
} from 'antd';
import request from '../services/request';

const { Title } = Typography;
const { TabPane } = Tabs;
const { TextArea } = Input;

const STATUS_MAP = {
  pending: { text: '待审核', color: 'orange' },
  approved: { text: '已通过', color: 'blue' },
  borrowed: { text: '借阅中', color: 'cyan' },
  returned: { text: '已归还', color: 'green' },
  rejected: { text: '已拒绝', color: 'red' },
};

const BorrowAudit = () => {
  const [pendingRecords, setPendingRecords] = useState([]);
  const [auditedRecords, setAuditedRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('pending');
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [rejectingId, setRejectingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const [pendingRes, auditedRes] = await Promise.all([
        request.get('/borrows/pending'),
        request.get('/borrows', { params: { status: ['approved', 'rejected', 'borrowed', 'returned'] } }).catch(() => ({ data: { data: [] } })),
      ]);
      const pendingData = pendingRes.data.data || {};
      const pendingList = pendingData.items || pendingData.list || (Array.isArray(pendingData) ? pendingData : []);
      setPendingRecords(pendingList);

      const auditedData = auditedRes.data.data || {};
      const auditedList = auditedData.items || auditedData.list || (Array.isArray(auditedData) ? auditedData : []);
      setAuditedRecords(auditedList);
    } catch (error) {
      message.error(error.response?.data?.message || '获取审核列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  const handleApprove = async (id) => {
    try {
      await request.post(`/borrows/${id}/approve`);
      message.success('审核通过');
      fetchRecords();
    } catch (error) {
      message.error(error.response?.data?.message || '操作失败');
    }
  };

  const openRejectModal = (id) => {
    setRejectingId(id);
    form.resetFields();
    setRejectModalVisible(true);
  };

  const handleReject = async () => {
    const values = await form.validateFields();
    setSubmitting(true);
    try {
      await request.post(`/borrows/${rejectingId}/reject`, { reject_reason: values.reason });
      message.success('已拒绝');
      setRejectModalVisible(false);
      form.resetFields();
      fetchRecords();
    } catch (error) {
      message.error(error.response?.data?.message || '操作失败');
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    {
      title: '借阅单号',
      dataIndex: 'id',
      key: 'id',
      render: (id) => `BR${String(id).padStart(6, '0')}`,
    },
    {
      title: '申请人',
      key: 'user',
      render: (_, record) => record.user?.username || record.user_name || '-',
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
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        const config = STATUS_MAP[status] || { text: status, color: 'default' };
        return <Tag color={config.color}>{config.text}</Tag>;
      },
    },
    {
      title: '申请时间',
      dataIndex: 'created_at',
      key: 'created_at',
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
          {record.status === 'pending' && (
            <>
              <Button type="link" size="small" onClick={() => handleApprove(record.id)}>
                通过
              </Button>
              <Button type="link" size="small" danger onClick={() => openRejectModal(record.id)}>
                拒绝
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
        <Title level={4} style={{ margin: 0 }}>借阅审核</Title>
        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          <TabPane tab="待审核" key="pending">
            <Table
              rowKey="id"
              columns={columns}
              dataSource={pendingRecords}
              loading={loading}
              pagination={false}
            />
          </TabPane>
          <TabPane tab="已审核" key="audited">
            <Table
              rowKey="id"
              columns={columns}
              dataSource={auditedRecords}
              loading={loading}
              pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (total) => `共 ${total} 条` }}
            />
          </TabPane>
        </Tabs>
      </Space>

      <Modal
        title="填写拒绝理由"
        open={rejectModalVisible}
        onOk={handleReject}
        onCancel={() => setRejectModalVisible(false)}
        confirmLoading={submitting}
        destroyOnClose
      >
        <Form form={form} layout="vertical" preserve={false}>
          <Form.Item
            label="拒绝理由"
            name="reason"
            rules={[{ required: true, message: '请输入拒绝理由' }]}
          >
            <TextArea rows={4} placeholder="请输入拒绝理由" />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default BorrowAudit;
