import { useEffect, useState } from 'react';
import { Card, List, Badge, Typography, Button, Space, message, Empty } from 'antd';
import request from '../services/request';

const { Title, Text } = Typography;

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await request.get('/notifications');
      const data = res.data.data || {};
      const list = data.items || data.list || (Array.isArray(data) ? data : []);
      setNotifications(list);
    } catch (error) {
      message.error(error.response?.data?.message || '获取消息失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleRead = async (id) => {
    try {
      await request.post(`/notifications/${id}/read`);
      message.success('已标记为已读');
      fetchNotifications();
    } catch (error) {
      message.error(error.response?.data?.message || '标记已读失败');
    }
  };

  const handleReadAll = async () => {
    const unreadIds = notifications.filter((n) => !n.is_read).map((n) => n.id);
    if (unreadIds.length === 0) return;
    try {
      await Promise.all(unreadIds.map((id) => request.post(`/notifications/${id}/read`)));
      message.success('全部已读');
      fetchNotifications();
    } catch (error) {
      message.error(error.response?.data?.message || '标记全部已读失败');
    }
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <Card>
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Title level={4} style={{ margin: 0 }}>
            消息中心
            {unreadCount > 0 && <Badge count={unreadCount} style={{ marginLeft: 12 }} />}
          </Title>
          <Button onClick={handleReadAll} disabled={unreadCount === 0}>
            全部已读
          </Button>
        </div>

        <List
          loading={loading}
          dataSource={notifications}
          locale={{ emptyText: <Empty description="暂无消息" /> }}
          renderItem={(item) => (
            <List.Item
              actions={[
                !item.is_read && (
                  <Button type="link" size="small" onClick={() => handleRead(item.id)}>
                    标记已读
                  </Button>
                ),
              ]}
            >
              <List.Item.Meta
                title={
                  <Space>
                    {!item.is_read && <Badge status="processing" />}
                    <Text strong={!item.is_read}>{item.message}</Text>
                  </Space>
                }
                description={
                  <Text type="secondary">
                    {item.created_at ? item.created_at.replace('T', ' ').slice(0, 19) : '-'}
                  </Text>
                }
              />
            </List.Item>
          )}
        />
      </Space>
    </Card>
  );
};

export default Notifications;
