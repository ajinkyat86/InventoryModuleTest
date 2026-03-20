import client from './client'

export const getInvoices = async (status) => {
  const params = status ? { status } : {}
  const { data } = await client.get('/invoices', { params })
  return data
}

export const getInvoice = async (id) => {
  const { data } = await client.get(`/invoices/${id}`)
  return data
}

export const createInvoice = async (payload) => {
  const { data } = await client.post('/invoices', payload)
  return data
}

export const updateInvoice = async ({ id, ...payload }) => {
  const { data } = await client.put(`/invoices/${id}`, payload)
  return data
}

export const recordPayment = async ({ invoiceId, ...payload }) => {
  const { data } = await client.post(`/invoices/${invoiceId}/payments`, payload)
  return data
}

export const markPaymentPaid = async ({ invoiceId, paymentId }) => {
  const { data } = await client.patch(`/invoices/${invoiceId}/payments/${paymentId}/mark-paid`)
  return data
}
