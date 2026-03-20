import client from './client'

export const getPurchaseOrders = async (status) => {
  const params = status ? { status } : {}
  const { data } = await client.get('/purchase-orders', { params })
  return data
}

export const getPurchaseOrder = async (id) => {
  const { data } = await client.get(`/purchase-orders/${id}`)
  return data
}

export const createPurchaseOrder = async (payload) => {
  const { data } = await client.post('/purchase-orders', payload)
  return data
}

export const updatePurchaseOrder = async ({ id, ...payload }) => {
  const { data } = await client.put(`/purchase-orders/${id}`, payload)
  return data
}

export const updatePurchaseOrderStatus = async ({ id, status }) => {
  const { data } = await client.patch(`/purchase-orders/${id}/status`, { status })
  return data
}

export const deletePurchaseOrder = async (id) => {
  const { data } = await client.delete(`/purchase-orders/${id}`)
  return data
}
