import React, { useState, useEffect } from 'react';
import { 
  Table, 
  Button, 
  Space, 
  Modal, 
  Form, 
  Input, 
  message, 
  Popconfirm,
  Tag
} from 'antd';
import { 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined,
  UserOutlined 
} from '@ant-design/icons';
import { TransportApiService } from '../../services/api';
import Adminuser from '../../@types/Adminuser';

const AdminUsersList: React.FC = () => {
  const [adminUsers, setAdminUsers] = useState<Adminuser[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState<Adminuser | null>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    loadAdminUsers();
  }, []);

  const loadAdminUsers = async () => {
    setLoading(true);
    try {
      const data = await TransportApiService.getAdminusers();
      setAdminUsers(data);
    } catch (error) {
      console.error('Erreur lors du chargement des comptabilités:', error);
      message.error('Erreur lors du chargement des comptabilités');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingUser(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (user: Adminuser) => {
    setEditingUser(user);
    form.setFieldsValue({
      username: user.username,
    });
    setModalVisible(true);
  };

  const handleDelete = async (user: Adminuser) => {
    if (!user._id) return;
    
    try {
      await TransportApiService.deleteAdminuser(user._id);
      message.success('Comptabilité supprimée avec succès');
      loadAdminUsers();
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      message.error('Erreur lors de la suppression de la comptabilité');
    }
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      const userData: Partial<Adminuser> = {
        username: values.username,
        password: values.password
      };

      if (editingUser && editingUser._id) {
        await TransportApiService.updateAdminuser(editingUser._id, userData);
        message.success('Comptabilité modifiée avec succès');
      } else {
        await TransportApiService.createAdminuser(userData);
        message.success('Comptabilité créée avec succès');
      }
      
      setModalVisible(false);
      loadAdminUsers();
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      message.error('Erreur lors de la sauvegarde de la comptabilité');
    }
  };

  const columns = [
    {
      title: 'Nom d\'utilisateur',
      dataIndex: 'username',
      key: 'username',
      render: (text: string) => (
        <Space>
          <UserOutlined />
          {text}
        </Space>
      )
    },
    {
      title: 'Rôle',
      key: 'role',
      render: () => <Tag color="green">Comptabilité</Tag>
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (record: Adminuser) => (
        <Space size="middle">
          <Button 
            type="primary" 
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            Modifier
          </Button>
          <Popconfirm
            title="Êtes-vous sûr de supprimer cette comptabilité ?"
            onConfirm={() => handleDelete(record)}
            okText="Oui"
            cancelText="Non"
          >
            <Button danger icon={<DeleteOutlined />}>
              Supprimer
            </Button>
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Button 
          type="primary" 
          icon={<PlusOutlined />} 
          onClick={handleAdd}
        >
          Ajouter une comptabilité
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={adminUsers}
        rowKey="_id"
        loading={loading}
      />

      <Modal
        title={editingUser ? "Modifier la comptabilité" : "Nouvelle comptabilité"}
        open={modalVisible}
        onOk={handleModalOk}
        onCancel={() => setModalVisible(false)}
        okText={editingUser ? "Modifier" : "Créer"}
        cancelText="Annuler"
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="username"
            label="Nom d'utilisateur"
            rules={[
              { required: true, message: 'Veuillez saisir le nom d\'utilisateur' }
            ]}
          >
            <Input prefix={<UserOutlined />} placeholder="Nom d'utilisateur" />
          </Form.Item>
          
          {!editingUser && (
            <Form.Item
              name="password"
              label="Mot de passe"
              rules={[
                { required: true, message: 'Veuillez saisir le mot de passe' },
                { min: 6, message: 'Le mot de passe doit contenir au moins 6 caractères' }
              ]}
            >
              <Input.Password placeholder="Mot de passe" />
            </Form.Item>
          )}
        </Form>
      </Modal>
    </div>
  );
};

export default AdminUsersList;