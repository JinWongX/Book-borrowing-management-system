import request from './request';

export const getUsers = (params) => {
  return request.get('/users', { params });
};

export const getUser = (id) => {
  return request.get(`/users/${id}`);
};

export const createUser = (data) => {
  return request.post('/users', data);
};

export const updateUser = (id, data) => {
  return request.put(`/users/${id}`, data);
};

export const deleteUser = (id) => {
  return request.delete(`/users/${id}`);
};

export const updateUserStatus = (id, isActive) => {
  return request.patch(`/users/${id}/status`, { is_active: isActive });
};

export const batchUpdateUserStatus = (ids, isActive) => {
  return request.patch('/users/batch/status', { ids, is_active: isActive });
};
