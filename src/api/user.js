import axios from 'axios'

const BASE_URL = '/api'

const request = axios.create({
  baseURL: BASE_URL,
  timeout: 10000
})

request.interceptors.request.use(
  config => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`
    }
    return config
  },
  error => {
    return Promise.reject(error)
  }
)

request.interceptors.response.use(
  response => {
    return response.data
  },
  error => {
    return Promise.reject(error)
  }
)

export const userApi = {
  login(userLoginDto) {
    return request.post('/user/login', userLoginDto)
  },

  register(userRegisterDto) {
    return request.post('/user/register', userRegisterDto)
  },

  getUserInfo() {
    return request.get('/user/me')
  },

  logout() {
    return request.post('/user/logout')
  }
}
