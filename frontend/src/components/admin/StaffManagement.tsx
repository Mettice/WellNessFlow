import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useToast } from '../../contexts/ToastContext';
import { useTheme } from '../../contexts/ThemeContext';

interface StaffMember {
  id: number;
  email: string;
  role: 'staff' | 'therapist';
  is_active: boolean;
  last_login: string | null;
  created_at: string;
}

const StaffManagement: React.FC = () => {
  const { theme } = useTheme();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const { showToast } = useToast();

  // Form states
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    role: 'staff' as 'staff' | 'therapist'
  });

  useEffect(() => {
    fetchStaff();
  }, []);

  const fetchStaff = async () => {
    try {
      const response = await axios.get('/api/admin/staff');
      setStaff(response.data);
    } catch (error) {
      console.error('Error fetching staff:', error);
      showToast({
        title: 'Failed to load staff members',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await axios.post('/api/admin/staff', formData);
      showToast({
        title: 'Staff member added successfully',
        type: 'success'
      });
      setStaff([...staff, response.data.user]);
      setShowAddModal(false);
      setFormData({ email: '', password: '', role: 'staff' });
    } catch (error: any) {
      console.error('Error adding staff:', error);
      showToast({
        title: error.response?.data?.error || 'Failed to add staff member',
        type: 'error'
      });
    }
  };

  const handleUpdateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaff) return;

    try {
      const response = await axios.put(`/api/admin/staff/${selectedStaff.id}`, formData);
      showToast({
        title: 'Staff member updated successfully',
        type: 'success'
      });
      setStaff(staff.map(s => s.id === selectedStaff.id ? response.data.user : s));
      setShowEditModal(false);
      setSelectedStaff(null);
    } catch (error: any) {
      console.error('Error updating staff:', error);
      showToast({
        title: error.response?.data?.error || 'Failed to update staff member',
        type: 'error'
      });
    }
  };

  const handleDeleteStaff = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this staff member?')) return;

    try {
      await axios.delete(`/api/admin/staff/${id}`);
      showToast({
        title: 'Staff member deleted successfully',
        type: 'success'
      });
      setStaff(staff.filter(s => s.id !== id));
    } catch (error: any) {
      console.error('Error deleting staff:', error);
      showToast({
        title: error.response?.data?.error || 'Failed to delete staff member',
        type: 'error'
      });
    }
  };

  const openEditModal = (staffMember: StaffMember) => {
    setSelectedStaff(staffMember);
    setFormData({
      email: staffMember.email,
      password: '', // Don't populate password
      role: staffMember.role
    });
    setShowEditModal(true);
  };

  const renderModal = (isEdit: boolean) => {
    const modalTitle = isEdit ? 'Edit Staff Member' : 'Add New Staff Member';
    const handleSubmit = isEdit ? handleUpdateStaff : handleAddStaff;
    const closeModal = () => {
      if (isEdit) {
        setShowEditModal(false);
        setSelectedStaff(null);
      } else {
        setShowAddModal(false);
      }
      setFormData({ email: '', password: '', role: 'staff' });
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-lg p-6 w-full max-w-md`}>
          <h2 className={`text-xl font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            {modalTitle}
          </h2>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                  required
                />
              </div>
              <div>
                <label className={`block text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  Password {isEdit && '(leave blank to keep current)'}
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={e => setFormData({ ...formData, password: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                  required={!isEdit}
                />
              </div>
              <div>
                <label className={`block text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  Role
                </label>
                <select
                  value={formData.role}
                  onChange={e => setFormData({ ...formData, role: e.target.value as 'staff' | 'therapist' })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                >
                  <option value="staff">Staff</option>
                  <option value="therapist">Therapist</option>
                </select>
              </div>
            </div>
            <div className="mt-6 flex justify-end space-x-3">
              <button
                type="button"
                onClick={closeModal}
                className={`px-4 py-2 rounded-md ${
                  theme === 'dark'
                    ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-primary-500 text-white rounded-md hover:bg-primary-600"
              >
                {isEdit ? 'Update' : 'Add'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className={`p-6 rounded-lg ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
      <div className="flex justify-between items-center mb-6">
        <h2 className={`text-2xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
          Staff Management
        </h2>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-primary-500 text-white rounded-md hover:bg-primary-600"
        >
          Add Staff Member
        </button>
      </div>

      {staff.length === 0 ? (
        <p className={`text-center py-8 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
          No staff members found. Add your first staff member to get started.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className={theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}>
              <tr>
                <th className={`px-6 py-3 text-left text-xs font-medium ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-500'
                } uppercase tracking-wider`}>
                  Email
                </th>
                <th className={`px-6 py-3 text-left text-xs font-medium ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-500'
                } uppercase tracking-wider`}>
                  Role
                </th>
                <th className={`px-6 py-3 text-left text-xs font-medium ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-500'
                } uppercase tracking-wider`}>
                  Status
                </th>
                <th className={`px-6 py-3 text-left text-xs font-medium ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-500'
                } uppercase tracking-wider`}>
                  Last Login
                </th>
                <th className={`px-6 py-3 text-right text-xs font-medium ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-500'
                } uppercase tracking-wider`}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className={`divide-y ${theme === 'dark' ? 'divide-gray-700' : 'divide-gray-200'}`}>
              {staff.map(member => (
                <tr key={member.id}>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-900'
                  }`}>
                    {member.email}
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-900'
                  }`}>
                    {member.role}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      member.is_active
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {member.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-500'
                  }`}>
                    {member.last_login
                      ? new Date(member.last_login).toLocaleDateString()
                      : 'Never'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => openEditModal(member)}
                      className="text-primary-500 hover:text-primary-600 mr-4"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteStaff(member.id)}
                      className="text-red-500 hover:text-red-600"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showAddModal && renderModal(false)}
      {showEditModal && renderModal(true)}
    </div>
  );
};

export default StaffManagement; 