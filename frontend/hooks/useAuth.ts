import { useAuthStore } from "@/store/auth.store";

export const useAuth = () => {
  const user = useAuthStore((state) => state.user);

  const login = useAuthStore((state) => state.login);

  const register = useAuthStore((state) => state.register);

  const logout = useAuthStore((state) => state.logout);

  const fetchMe = useAuthStore((state) => state.fetchMe);

  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const loading = useAuthStore((state) => state.loading);

  return {
    user,
    login,
    register,
    logout,
    fetchMe,
    isAuthenticated,
    loading,
  };
};
