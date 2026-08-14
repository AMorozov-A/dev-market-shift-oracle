import { ConfigProvider, theme } from 'antd';
import ruRU from 'antd/locale/ru_RU';
import { Provider } from 'react-redux';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './AppShell';
import { store } from './store';
import { OverviewPage } from '../pages/OverviewPage';
import { TrendsPage } from '../pages/TrendsPage';
import { SkillsPage } from '../pages/SkillsPage';
import { ForecastPage } from '../pages/ForecastPage';
import { DataPage } from '../pages/DataPage';

export function App() {
  return (
    <Provider store={store}>
      <ConfigProvider
        locale={ruRU}
        theme={{
          algorithm: theme.defaultAlgorithm,
          token: {
            colorPrimary: '#1d4e89',
            colorInfo: '#1d4e89',
            borderRadius: 6,
            fontFamily: "IBM Plex Sans, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
            colorBgLayout: '#f5f7fa',
          },
        }}
      >
        <BrowserRouter>
          <Routes>
            <Route element={<AppShell />}>
              <Route index element={<OverviewPage />} />
              <Route path="trends" element={<TrendsPage />} />
              <Route path="skills" element={<SkillsPage />} />
              <Route path="forecast" element={<ForecastPage />} />
              <Route path="data" element={<DataPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </ConfigProvider>
    </Provider>
  );
}
