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
  Tag,
  Alert
} from 'antd';
import { 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined,
  UserOutlined,
  SecurityScanOutlined
} from '@ant-design/icons';
import { TransportApiService } from '../../services/api';
import Supadmin from '../../@types/Supadmin';

const SupAdminUsersList: React.FC = () => {
  const [supAdmins, setSupAdmins] = useState<Supadmin[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState<Supadmin | null>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    loadSupAdmins();
  }, []);

  const loadSupAdmins = async () => {
    setLoading(true);
    try {
      const data = await TransportApiService.getSupadmins();
      setSupAdmins(data);
    } catch (error) {
      console.error('Erreur lors du chargement des administrateurs:', error);
      message.error('Erreur lors du chargement des administrateurs');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingUser(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (user: Supadmin) => {
    setEditingUser(user);
    form.setFieldsValue({
      username: user.username,
    });
    setModalVisible(true);
  };

  const handleDelete = async (user: Supadmin) => {
    if (!user._id) return;
    
    // Empêcher la suppression du dernier administrateur
    if (supAdmins.length <= 1) {
      message.error('Impossible de supprimer le dernier administrateur');
      return;
    }

    try {
      await TransportApiService.deleteSupadmin(user._id);
      message.success('Administrateur supprimé avec succès');
      loadSupAdmins();
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      message.error('Erreur lors de la suppression de l\'administrateur');
    }
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      const userData: Partial<Supadmin> = {
        username: values.username,
        password: values.password
      };

      if (editingUser && editingUser._id) {
        await TransportApiService.updateSupadmin(editingUser._id, userData);
        message.success('Administrateur modifié avec succès');
      } else {
        await TransportApiService.createSupadmin(userData);
        message.success('Administrateur créé avec succès');
      }
      
      setModalVisible(false);
      loadSupAdmins();
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      message.error('Erreur lors de la sauvegarde de l\'administrateur');
    }
  };

  const columns = [
    {
      title: 'Nom d\'utilisateur',
      dataIndex: 'username',
      key: 'username',
      render: (text: string) => (
        <Space>
          <SecurityScanOutlined />
          {text}
        </Space>
      )
    },
    {
      title: 'Rôle',
      key: 'role',
      render: () => <Tag color="red">Administrateur</Tag>
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (record: Supadmin) => (
        <Space size="middle">
          <Button 
            type="primary" 
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            Modifier
          </Button>
          <Popconfirm
            title="Êtes-vous sûr de supprimer cet administrateur ?"
            onConfirm={() => handleDelete(record)}
            okText="Oui"
            cancelText="Non"
            disabled={supAdmins.length <= 1}
          >
            <Button 
              danger 
              icon={<DeleteOutlined />}
              disabled={supAdmins.length <= 1}
            >
              Supprimer
            </Button>
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <div>
      {supAdmins.length <= 1 && (
        <Alert
          message="Attention"
          description="Vous ne pouvez pas supprimer le dernier administrateur."
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      <div style={{ marginBottom: 16 }}>
        <Button 
          type="primary" 
          icon={<PlusOutlined />} 
          onClick={handleAdd}
        >
          Ajouter un administrateur
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={supAdmins}
        rowKey="_id"
        loading={loading}
      />

      <Modal
        title={editingUser ? "Modifier l'administrateur" : "Nouvel administrateur"}
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

export default SupAdminUsersList;