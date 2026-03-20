import client from './client'

export const getDashboard = async () => {
  const { data } = await client.get('/dashboard')
  return data
}
