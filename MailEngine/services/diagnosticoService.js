import { apiFetch } from './fetch';

export async function guardar(data) {
  return apiFetch('/diagnosticos', {
    method: 'POST',
    body: data
  });
}

export async function listar() {
  return apiFetch('/diagnosticos');
}

export async function obtener(id) {
  return apiFetch(`/diagnosticos/${id}`);
}

const diagnosticoService = {
  guardar,
  listar,
  obtener
};

export default diagnosticoService;
