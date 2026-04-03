import { useAuth } from '../contexts/AuthContext';

export function usePermission(key: string): boolean {
  return useAuth().hasPermission(key);
}

export function useAnyPermission(keys: string[]): boolean {
  return useAuth().hasAnyPermission(keys);
}
