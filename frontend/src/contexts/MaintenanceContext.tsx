'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';
import { api } from '@/utils/api';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

interface MaintenanceContextType {
  isMaintenanceMode: boolean;
  isLoading: boolean;
}

const MaintenanceContext = createContext<MaintenanceContextType | undefined>(
  undefined
);

export const MaintenanceProvider = ({ children }: { children: ReactNode }) => {
  const [isMaintenanceMode, setIsMaintenanceMode] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const router = useRouter();

  useEffect(() => {
    const checkMaintenanceStatus = async () => {
      setIsLoading(true);
      try {
        const status = await api.auth.getMaintenanceStatus();
        setIsMaintenanceMode(status.enabled);

        // Kiểm tra nếu đang trong chế độ bảo trì và không phải ở trang đăng nhập
        // Hiển thị thông báo cho người dùng
        if (
          status.enabled &&
          !window.location.pathname.includes('/login') &&
          !window.location.pathname.includes('/register') &&
          !localStorage.getItem('maintenance_notified')
        ) {
          toast.error(
            'This website is currently in maintenance mode. Only administrators can log in at this time.'
          );
          localStorage.setItem('maintenance_notified', 'true');
        }
      } catch (error) {
        console.error('Error checking maintenance status:', error);
        setIsMaintenanceMode(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkMaintenanceStatus();

    // Thiết lập polling để cập nhật trạng thái bảo trì mà không cần reload trang
    const intervalId = setInterval(checkMaintenanceStatus, 60000); // Check mỗi phút
    return () => clearInterval(intervalId);
  }, [router]);

  return (
    <MaintenanceContext.Provider value={{ isMaintenanceMode, isLoading }}>
      {children}
    </MaintenanceContext.Provider>
  );
};

export const useMaintenance = (): MaintenanceContextType => {
  const context = useContext(MaintenanceContext);
  if (context === undefined) {
    throw new Error('useMaintenance must be used within a MaintenanceProvider');
  }
  return context;
};
