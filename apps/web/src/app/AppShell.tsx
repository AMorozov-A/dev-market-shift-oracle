import { Layout, Menu, Typography } from 'antd';
import { Link, Outlet, useLocation } from 'react-router-dom';

const { Header, Content, Footer } = Layout;

const menuItems = [
  { key: '/', label: <Link to="/">Обзор</Link> },
  { key: '/trends', label: <Link to="/trends">Тренды</Link> },
  { key: '/skills', label: <Link to="/skills">Навыки</Link> },
  { key: '/forecast', label: <Link to="/forecast">Прогноз</Link> },
  { key: '/data', label: <Link to="/data">Данные</Link> },
];

export function AppShell() {
  const location = useLocation();
  const selected =
    menuItems.find((item) =>
      item.key === '/' ? location.pathname === '/' : location.pathname.startsWith(item.key),
    )?.key ?? '/';

  return (
    <Layout style={{ minHeight: '100vh', background: '#f5f7fa' }}>
      <Header
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 24,
          background: '#102a43',
          paddingInline: 24,
        }}
      >
        <Typography.Title level={4} style={{ color: '#fff', margin: 0, whiteSpace: 'nowrap' }}>
          Dev Market Shift Oracle
        </Typography.Title>
        <Menu
          theme="dark"
          mode="horizontal"
          selectedKeys={[selected]}
          items={menuItems}
          style={{ flex: 1, minWidth: 0, background: 'transparent' }}
        />
      </Header>
      <Content
        style={{
          padding: '24px 16px',
          maxWidth: 1200,
          width: '100%',
          margin: '0 auto',
        }}
      >
        <Outlet />
      </Content>
      <Footer style={{ textAlign: 'center', background: 'transparent' }}>
        RemoteOK · Jobicy · прогноз по выборке вакансий, не по всей профессии
      </Footer>
    </Layout>
  );
}
