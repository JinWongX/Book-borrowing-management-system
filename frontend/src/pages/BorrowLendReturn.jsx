import { useEffect, useRef, useState } from 'react';
import {
  Card,
  Typography,
  message,
  Button,
  Input,
  Space,
  Table,
  Tag,
  Tabs,
  Form,
  Modal,
} from 'antd';
import { QrcodeOutlined, ScanOutlined } from '@ant-design/icons';
import { Html5QrcodeScanner } from 'html5-qrcode';
import request from '../services/request';

const { Title } = Typography;
const { TabPane } = Tabs;
const { Search } = Input;

const STATUS_MAP = {
  pending: { text: '待审核', color: 'orange' },
  approved: { text: '已通过', color: 'blue' },
  borrowed: { text: '借阅中', color: 'cyan' },
  returned: { text: '已归还', color: 'green' },
  rejected: { text: '已拒绝', color: 'red' },
};

const SCANNER_CONFIG = {
  fps: 10,
  qrbox: { width: 250, height: 250 },
  aspectRatio: 1.0,
};

const BorrowLendReturn = () => {
  const [activeTab, setActiveTab] = useState('lend');
  const [borrowId, setBorrowId] = useState('');
  const [pendingRecords, setPendingRecords] = useState([]);
  const [borrowedRecords, setBorrowedRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [scanModalVisible, setScanModalVisible] = useState(false);
  const scannerRef = useRef(null);
  const scannerContainerRef = useRef(null);
  const [form] = Form.useForm();

  const fetchPending = async () => {
    try {
      const res = await request.get('/borrows/pending');
      const data = res.data.data || {};
      const list = data.items || data.list || (Array.isArray(data) ? data : []);
      setPendingRecords(list);
    } catch (error) {
      message.error(error.response?.data?.message || '获取待借出列表失败');
    }
  };

  const fetchBorrowed = async () => {
    try {
      const res = await request.get('/borrows', { params: { status: ['borrowed'] } }).catch(() => null);
      if (!res) {
        setBorrowedRecords([]);
        return;
      }
      const data = res.data.data || {};
      const list = data.items || data.list || (Array.isArray(data) ? data : []);
      setBorrowedRecords(list);
    } catch (error) {
      message.error(error.response?.data?.message || '获取借阅中列表失败');
    }
  };

  const fetchAll = async () => {
    setLoading(true);
    await Promise.all([fetchPending(), fetchBorrowed()]);
    setLoading(false);
  };

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const extractId = (value) => {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const match = trimmed.match(/BR0*(\d+)$/i);
    if (match) return Number(match[1]);
    const num = Number(trimmed);
    return Number.isNaN(num) ? null : num;
  };

  const handleLend = async (idValue = borrowId) => {
    const id = extractId(idValue);
    if (!id) {
      message.warning('请输入有效的借阅单号，如 BR000001');
      return;
    }
    setActionLoading(true);
    try {
      await request.post(`/borrows/${id}/lend`);
      message.success('借出登记成功');
      setBorrowId('');
      fetchAll();
    } catch (error) {
      message.error(error.response?.data?.message || '借出登记失败');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReturn = async (idValue = borrowId) => {
    const id = extractId(idValue);
    if (!id) {
      message.warning('请输入有效的借阅单号，如 BR000001');
      return;
    }
    setActionLoading(true);
    try {
      await request.post(`/borrows/${id}/return`);
      message.success('归还登记成功');
      setBorrowId('');
      fetchAll();
    } catch (error) {
      message.error(error.response?.data?.message || '归还登记失败');
    } finally {
      setActionLoading(false);
    }
  };

  const startScanner = () => {
    if (scannerRef.current || !scannerContainerRef.current) return;

    const scanner = new Html5QrcodeScanner(
      scannerContainerRef.current.id,
      SCANNER_CONFIG,
      false
    );

    scanner.render(
      (decodedText) => {
        scanner.clear();
        scannerRef.current = null;
        setScanModalVisible(false);
        setBorrowId(decodedText);
        if (activeTab === 'lend') {
          handleLend(decodedText);
        } else {
          handleReturn(decodedText);
        }
      },
      (errorMessage) => {
        // 扫码过程中的错误通常无需提示，避免刷屏
        // eslint-disable-next-line no-console
        console.debug('扫码识别中:', errorMessage);
      }
    );

    scannerRef.current = scanner;
  };

  const openScanModal = () => {
    setScanModalVisible(true);
    // 弹窗渲染完成后启动摄像头
    setTimeout(() => startScanner(), 300);
  };

  const closeScanModal = () => {
    if (scannerRef.current) {
      scannerRef.current.clear();
      scannerRef.current = null;
    }
    setScanModalVisible(false);
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
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space>
          {record.status === 'pending' && (
            <Button type="link" size="small" onClick={() => { setBorrowId(`BR${String(record.id).padStart(6, '0')}`); setActiveTab('lend'); }}>
              借出
            </Button>
          )}
          {record.status === 'borrowed' && (
            <Button type="link" size="small" onClick={() => { setBorrowId(`BR${String(record.id).padStart(6, '0')}`); setActiveTab('return'); }}>
              归还
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <Card>
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        <Title level={4} style={{ margin: 0 }}>借还登记</Title>

        <Form form={form} layout="vertical">
          <Form.Item label="借阅单号 / 图书信息" style={{ marginBottom: 8 }}>
            <Space.Compact style={{ width: '100%', maxWidth: 560 }}>
              <Search
                placeholder="扫描或输入借阅单号，如 BR000001"
                value={borrowId}
                onChange={(e) => setBorrowId(e.target.value)}
                onSearch={activeTab === 'lend' ? handleLend : handleReturn}
                enterButton={activeTab === 'lend' ? '借出' : '归还'}
                loading={actionLoading}
                allowClear
                prefix={<QrcodeOutlined />}
              />
              <Button
                type="primary"
                icon={<ScanOutlined />}
                onClick={openScanModal}
                title="扫码"
              >
                扫码
              </Button>
            </Space.Compact>
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" loading={actionLoading && activeTab === 'lend'} onClick={() => handleLend()}>
                借出登记
              </Button>
              <Button loading={actionLoading && activeTab === 'return'} onClick={() => handleReturn()}>
                归还登记
              </Button>
            </Space>
          </Form.Item>
        </Form>

        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          <TabPane tab="待借出" key="lend">
            <Table
              rowKey="id"
              columns={columns}
              dataSource={pendingRecords}
              loading={loading}
              pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (total) => `共 ${total} 条` }}
            />
          </TabPane>
          <TabPane tab="待归还" key="return">
            <Table
              rowKey="id"
              columns={columns}
              dataSource={borrowedRecords}
              loading={loading}
              pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (total) => `共 ${total} 条` }}
            />
          </TabPane>
        </Tabs>
      </Space>

      <Modal
        title={activeTab === 'lend' ? '扫码借出' : '扫码归还'}
        open={scanModalVisible}
        onCancel={closeScanModal}
        footer={null}
        destroyOnClose
        width={420}
        centered
      >
        <div style={{ textAlign: 'center', padding: '12px 0' }}>
          <div
            id="borrow-scan-reader"
            ref={scannerContainerRef}
            style={{ width: '100%', minHeight: 250 }}
          />
          <p style={{ color: '#888', marginTop: 16 }}>
            请将借阅单二维码对准摄像头，识别成功后将自动{activeTab === 'lend' ? '借出' : '归还'}
          </p>
        </div>
      </Modal>
    </Card>
  );
};

export default BorrowLendReturn;
