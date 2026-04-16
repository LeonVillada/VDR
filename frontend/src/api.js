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
    createGlobal: (data) => api.post('/pagos/global', data),
    createLote: (data) => api.post('/pagos/lote', data),
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
    create:           (data)     => api.post('/alcantarillas', data, { headers: { 'Content-Type': 'multipart/form-data' } }),
    update:           (id, data) => api.put(`/alcantarillas/${id}`, data, { headers: { 'Content-Type': 'multipart/form-data' } }),
    delete:           (id)       => api.delete(`/alcantarillas/${id}`),
    getVentas:        (id)       => api.get(`/alcantarillas/${id}/ventas`),
    registrarVenta:   (data)     => api.post('/alcantarillas/ventas', data),
    eliminarVenta:    (id)       => api.delete(`/alcantarillas/ventas/${id}`)
};

export const bancoApi = {
    getFondoGlobal:   () => api.get('/banco/fondo-global'),
    getResumenMaestro: () => api.get('/banco/resumen-maestro'),
};

export const prestamosApi = {
    getAll:          ()         => api.get('/prestamos'),
    getById:         (id)       => api.get(`/prestamos/${id}`),
    getStats:        ()         => api.get('/prestamos/estadisticas'),
    create:          (data)     => api.post('/prestamos', data),
    update:          (id, data) => api.put(`/prestamos/${id}`, data),
    delete:          (id)       => api.delete(`/prestamos/${id}`),
    registrarAbono:  (id, data) => api.post(`/prestamos/${id}/abonos`, data),
    eliminarAbono:   (id)       => api.delete(`/prestamos/abonos/${id}`),
};

export const gastosApi = {
    getAll: async () => {
        const response = await api.get('/gastos');
        return response.data;
    },
    create: async (gasto) => {
        const response = await api.post('/gastos', gasto);
        return response.data;
    },
    update: async (id, gasto) => {
        const response = await api.put(`/gastos/${id}`, gasto);
        return response.data;
    },
    delete: async (id) => {
        await api.delete(`/gastos/${id}`);
    },
};

export const fondosApi = {
    getAll: async () => {
        const response = await api.get('/fondos');
        return response.data;
    },
    create: async (fondo) => {
        const response = await api.post('/fondos', fondo);
        return response.data;
    },
    update: async (id, fondo) => {
        const response = await api.put(`/fondos/${id}`, fondo);
        return response.data;
    },
    delete: async (id) => {
        await api.delete(`/fondos/${id}`);
    },
};

export const fondosEspecificosApi = {
    getAll: async () => {
        const response = await api.get('/fondos-especificos');
        return response.data;
    },
    create: async (fondoEspecifico) => {
        const response = await api.post('/fondos-especificos', fondoEspecifico);
        return response.data;
    },
    update: async (id, fondoEspecifico) => {
        const response = await api.put(`/fondos-especificos/${id}`, fondoEspecifico);
        return response.data;
    },
    delete: async (id) => {
        await api.delete(`/fondos-especificos/${id}`);
    },
};

export default api;

