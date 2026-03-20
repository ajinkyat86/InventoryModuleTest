import client from './client'

export const login = async ({ email, password }) => {
  const { data } = await client.post('/auth/login', { email, password })
  return data
}
