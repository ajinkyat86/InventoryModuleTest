import client from './client'

export const getMaterials = async () => {
  const { data } = await client.get('/materials')
  return data
}

export const getMaterial = async (id) => {
  const { data } = await client.get(`/materials/${id}`)
  return data
}

export const createMaterial = async (payload) => {
  const { data } = await client.post('/materials', payload)
  return data
}

export const updateMaterial = async ({ id, ...payload }) => {
  const { data } = await client.put(`/materials/${id}`, payload)
  return data
}

export const deleteMaterial = async (id) => {
  const { data } = await client.delete(`/materials/${id}`)
  return data
}

export const getMaterialPriceHistory = async (id) => {
  const { data } = await client.get(`/materials/${id}/price-history`)
  return data
}
