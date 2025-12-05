import React, { useState, useEffect } from 'react';
import { 
  Table, 
  Button, 
  Space, 
  Modal, 
  Form, 
  Input, 
  message, 
  Popconfirm
} from 'antd';
import { 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined,
  UserOutlined 
} from '@ant-design/icons';
import { TransportApiService } from '../../services/api';
import User from '../../@types/User';

const StandardUsersList: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await TransportApiService.getUsers();
      setUsers(data);
    } catch (error) {
      console.error('Erreur lors du chargement des utilisateurs:', error);
      message.error('Erreur lors du chargement des utilisateurs');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingUser(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    form.setFieldsValue({
      username: user.username,
    });
    setModalVisible(true);
  };

  const handleDelete = async (user: User) => {
    if (!user._id) return;
    
    try {
      await TransportApiService.deleteUser(user._id);
      message.success('Utilisateur supprimé avec succès');
      loadUsers();
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      message.error('Erreur lors de la suppression de l\'utilisateur');
    }
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      const userData: Partial<User> = {
        username: values.username,
        password: values.password
      };

      if (editingUser && editingUser._id) {
        await TransportApiService.updateUser(editingUser._id, userData);
        message.success('Utilisateur modifié avec succès');
      } else {
        await TransportApiService.createUser(userData);
        message.success('Utilisateur créé avec succès');
      }
      
      setModalVisible(false);
      loadUsers();
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      message.error('Erreur lors de la sauvegarde de l\'utilisateur');
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
      title: 'Actions',
      key: 'actions',
      render: (record: User) => (
        <Space size="middle">
          <Button 
            type="primary" 
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            Modifier
          </Button>
          <Popconfirm
            title="Êtes-vous sûr de supprimer cet utilisateur ?"
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
          Ajouter un utilisateur
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={users}
        rowKey="_id"
        loading={loading}
      />

      <Modal
        title={editingUser ? "Modifier l'utilisateur" : "Nouvel utilisateur"}
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

export default StandardUsersList;