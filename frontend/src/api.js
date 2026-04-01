import axios from 'axios';

const api = axios.create({
    baseURL: `http://${window.location.hostname}:2014/api`,
});

export const personasApi = {
    getAll: () => api.get('/personas'),
    getById: (id) => api.get(`/personas/${id}`),
    create: (data) => api.post('/personas', data),
    createMasivo: (data) => api.post('/personas/masivo', data),
    update: (id, data) => api.put(`/personas/${id}`, data),
    delete: (id) => api.delete(`/personas/${id}`),
};

export const pagosApi = {
    getAll: () => api.get('/pagos'),
    getByPersona: (id) => api.get(`/pagos/persona/${id}`),
    create: (data) => api.post('/pagos', data),
    delete: (id) => api.delete(`/pagos/${id}`),
    getStats: () => api.get('/pagos/estadisticas')
};

export const metasApi = {
    getAll: () => api.get('/metas'),
    create: (data) => api.post('/metas', data),
    update: (id, data) => api.put(`/metas/${id}`, data),
    delete: (id) => api.delete(`/metas/${id}`)
};

export const alcantarillasApi = {
    getAll:           ()         => api.get('/alcantarillas'),
    getStats:         ()         => api.get('/alcantarillas/estadisticas'),
    create:           (data)     => api.post('/alcantarillas', data),
    update:           (id, data) => api.put(`/alcantarillas/${id}`, data),
    delete:           (id)       => api.delete(`/alcantarillas/${id}`),
    getVentas:        (id)       => api.get(`/alcantarillas/${id}/ventas`),
    registrarVenta:   (data)     => api.post('/alcantarillas/ventas', data),
    eliminarVenta:    (id)       => api.delete(`/alcantarillas/ventas/${id}`)
};


export default api;
