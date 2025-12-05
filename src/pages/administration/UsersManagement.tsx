import React, { useState } from 'react';
import { Tabs, Card, Typography } from 'antd';
import { 
  UserOutlined, 
  TeamOutlined, 
  SecurityScanOutlined,
} from '@ant-design/icons';
import './UsersManagement.css';
import StandardUsersList from './StandardUsersList';
import AdminUsersList from './AdminUsersList';
import SupAdminUsersList from './SupAdminUsersList';

const { Title } = Typography;
const { TabPane } = Tabs;

const UsersManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('standard');

  return (
    <div className="users-management">
      <div className="users-management-header">
        <Title level={2}>
          <TeamOutlined /> Gestion des Utilisateurs
        </Title>
        <p>Gérez les différents types d'utilisateurs de l'application</p>
      </div>

      <Card>
        <Tabs 
          activeKey={activeTab} 
          onChange={setActiveTab}
          type="card"
        >
          <TabPane
            tab={
              <span>
                <UserOutlined />
                Utilisateurs Standard
              </span>
            }
            key="standard"
          >
            <StandardUsersList />
          </TabPane>

          <TabPane
            tab={
              <span>
                <SecurityScanOutlined />
                Comptabilité
              </span>
            }
            key="admin"
          >
            <AdminUsersList />
          </TabPane>

          <TabPane
            tab={
              <span>
                <SecurityScanOutlined />
                Administrateurs
              </span>
            }
            key="supadmin"
          >
            <SupAdminUsersList />
          </TabPane>
        </Tabs>
      </Card>
    </div>
  );
};

export default UsersManagement;