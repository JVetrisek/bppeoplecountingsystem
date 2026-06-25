import api from './axios';

// Senzory
export const getSensors = () => api.get('/api/sensors');
export const createSensor = (data) => api.post('/api/sensors', data);
export const updateSensor = (id, data) => api.patch(`/api/sensors/${id}`, data);
export const deleteSensor = (id) => api.delete(`/api/sensors/${id}`);

// Místnosti
export const getRooms = () => api.get('/api/rooms');
export const createRoom = (data) => api.post('/api/rooms', data);
export const updateRoom = (id, data) => api.patch(`/api/rooms/${id}`, data);
export const deleteRoom = (id) => api.delete(`/api/rooms/${id}`);
export const getRoomReadings = (id, params) => api.get(`/api/rooms/${id}/readings`, { params });

// Readings
export const getAggregate = (params) => api.get('/api/readings/aggregate', { params });

export default api;