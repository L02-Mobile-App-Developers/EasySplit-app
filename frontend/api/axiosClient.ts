import axios from "axios";

const axiosClient = axios.create({
  baseURL: "https://randomuser.me",
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

// tự gắn token
// axiosClient.interceptors.request.use(async (config) => {
//   const token = await getToken();

//   if (token) {
//     config.headers.Authorization = `Bearer ${token}`;
//   }

//   return config;
// });

export default axiosClient;
