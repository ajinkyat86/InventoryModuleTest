import client from './client'

export const getSuppliers = async () => {
  const { data } = await client.get('/suppliers')
  return data
}

export const getSupplier = async (id) => {
  const { data } = await client.get(`/suppliers/${id}`)
  return data
}

export const createSupplier = async (payload) => {
  const { data } = await client.post('/suppliers', payload)
  return data
}

export const updateSupplier = async ({ id, ...payload }) => {
  const { data } = await client.put(`/suppliers/${id}`, payload)
  return data
}

export const deleteSupplier = async (id) => {
  const { data } = await client.delete(`/suppliers/${id}`)
  return data
}
