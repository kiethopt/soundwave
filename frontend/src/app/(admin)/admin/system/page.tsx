'use client';

import { useState, useEffect } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { toast } from 'react-toastify';
import {
  Settings,
  RefreshCw,
  Database,
  Server,
  Shield,
  Clock,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { SystemSettings } from '@/types';
import { api } from '@/utils/api';

export default function SystemPage() {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState<string | null>(null);
  const [settings, setSettings] = useState<SystemSettings>({
    cacheEnabled: false,
    maintenanceMode: false,
    debugMode: false,
    sessionTimeout: 60,
    maxUploadSize: 10,
  });

  // Load system settings
  useEffect(() => {
    const initializeCacheStatus = async () => {
      try {
        const token = localStorage.getItem('userToken');
        if (!token) return;

        const response = await api.admin.getCacheStatus(token);
        setSettings((prev) => ({
          ...prev,
          cacheEnabled: response.enabled,
        }));
      } catch (error) {
        console.error('Failed to get cache status:', error);
        toast.error('Failed to load cache status');
      } finally {
        setLoading(false);
      }
    };

    initializeCacheStatus();
  }, []);

  // Update a system setting
  const updateSetting = async (key: keyof SystemSettings, value: any) => {
    try {
      const token = localStorage.getItem('userToken');
      if (!token) {
        toast.error('No authentication token found');
        return;
      }

      if (key === 'cacheEnabled') {
        await api.admin.updateCacheStatus(value, token);
        toast.success('Cache settings updated successfully');
      }
      setSettings((prev) => ({ ...prev, [key]: value }));
    } catch (error) {
      toast.error('Failed to update setting');
      // Revert the setting back if update fails
      setSettings((prev) => ({ ...prev }));
    }
  };

  // Refresh different parts of the system
  const refreshSystem = async (type: string) => {
    try {
      setRefreshing(type);
      // Simulate API request
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // In a real implementation, you would call your API here
      // await api.admin.refreshSystem(type, token);

      toast.success(`${type} refreshed successfully`);
    } catch (error) {
      toast.error(`Failed to refresh ${type}`);
    } finally {
      setRefreshing(null);
    }
  };

  // Clear system cache
  //   const clearCache = async () => {
  //     try {
  //       setRefreshing('cache');
  //       // Simulate API request
  //       await new Promise((resolve) => setTimeout(resolve, 1500));

  //       // In a real implementation, you would call your API here
  //       // await api.admin.clearCache(token);

  //       toast.success('Cache cleared successfully');
  //     } catch (error) {
  //       toast.error('Failed to clear cache');
  //     } finally {
  //       setRefreshing(null);
  //     }
  //   };

  return (
    <div
      className={`container mx-auto space-y-6 p-4 mb-16 md:mb-0 ${
        theme === 'light' ? 'text-gray-900' : 'text-white'
      }`}
    >
      {/* Header Section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-primary flex items-center gap-2">
            <Settings className="h-6 w-6 sm:h-7 sm:w-7" />
            System Settings
          </h1>
          <h2 className="text-sm sm:text-base text-secondary">
            Manage system configuration and maintenance
          </h2>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-48 rounded-lg animate-pulse"
              style={{
                backgroundColor:
                  theme === 'light' ? '#f9fafb' : 'rgba(255, 255, 255, 0.05)',
              }}
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Cache Management Card */}
          <Card
            className={
              theme === 'light' ? 'bg-white' : 'bg-zinc-900 border-zinc-700'
            }
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5 text-blue-500" />
                Cache Management
              </CardTitle>
              <CardDescription>
                Configure system caching behavior
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Enable Caching</Label>
                  <p
                    className={`text-sm ${
                      theme === 'light' ? 'text-gray-500' : 'text-gray-400'
                    }`}
                  >
                    Improves performance by storing frequently accessed data
                  </p>
                </div>
                <Switch
                  checked={settings.cacheEnabled}
                  onCheckedChange={(checked) =>
                    updateSetting('cacheEnabled', checked)
                  }
                />
              </div>

              <Separator
                className={theme === 'light' ? 'bg-gray-200' : 'bg-gray-700'}
              />

              <div className="pt-2">
                <Button
                  variant="outline"
                  className="w-full flex items-center justify-center gap-2"
                  //   onClick={clearCache}
                  disabled={refreshing === 'cache'}
                >
                  {refreshing === 'cache' ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Clearing Cache...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4" />
                      Clear Cache
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* System Mode Card - Disabled */}
          <Card
            className={`${
              theme === 'light' ? 'bg-white' : 'bg-zinc-900 border-zinc-700'
            } opacity-60 relative`}
          >
            <div className="absolute inset-0 flex items-center justify-center z-10">
              <Shield className="h-10 w-10 text-gray-500 opacity-80" />
            </div>
            <div className="absolute inset-0 bg-gray-200 dark:bg-gray-800 opacity-30 z-0"></div>
            <CardHeader className="relative z-1">
              <CardTitle className="flex items-center gap-2">
                <Server className="h-5 w-5 text-purple-500" />
                System Mode
              </CardTitle>
              <CardDescription>
                Configure system operational modes
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 relative z-1">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Maintenance Mode</Label>
                  <p
                    className={`text-sm ${
                      theme === 'light' ? 'text-gray-500' : 'text-gray-400'
                    }`}
                  >
                    Temporarily disable user access for maintenance
                  </p>
                </div>
                <Switch disabled checked={settings.maintenanceMode} />
              </div>

              <Separator
                className={theme === 'light' ? 'bg-gray-200' : 'bg-gray-700'}
              />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Debug Mode</Label>
                  <p
                    className={`text-sm ${
                      theme === 'light' ? 'text-gray-500' : 'text-gray-400'
                    }`}
                  >
                    Enable detailed error messages and logging
                  </p>
                </div>
                <Switch disabled checked={settings.debugMode} />
              </div>
            </CardContent>
          </Card>

          {/* Security Settings Card - Disabled */}
          <Card
            className={`${
              theme === 'light' ? 'bg-white' : 'bg-zinc-900 border-zinc-700'
            } opacity-60 relative`}
          >
            <div className="absolute inset-0 flex items-center justify-center z-10">
              <Shield className="h-10 w-10 text-gray-500 opacity-80" />
            </div>
            <div className="absolute inset-0 bg-gray-200 dark:bg-gray-800 opacity-30 z-0"></div>
            <CardHeader className="relative z-1">
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-green-500" />
                Security Settings
              </CardTitle>
              <CardDescription>
                Configure system security parameters
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 relative z-1">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Session Timeout (minutes)</Label>
                  <p
                    className={`text-sm ${
                      theme === 'light' ? 'text-gray-500' : 'text-gray-400'
                    }`}
                  >
                    Time before inactive users are logged out
                  </p>
                </div>
                <select
                  disabled
                  value={settings.sessionTimeout}
                  className={`rounded-md px-3 py-1.5 ${
                    theme === 'light'
                      ? 'bg-white border-gray-300'
                      : 'bg-zinc-800 border-zinc-700 text-white'
                  }`}
                >
                  <option value={60}>60</option>
                </select>
              </div>

              <Separator
                className={theme === 'light' ? 'bg-gray-200' : 'bg-gray-700'}
              />

              <div className="pt-2">
                <Button
                  variant="outline"
                  className="w-full flex items-center justify-center gap-2"
                  disabled
                >
                  <RefreshCw className="h-4 w-4" />
                  Refresh Security Settings
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Upload Settings Card - Disabled */}
          <Card
            className={`${
              theme === 'light' ? 'bg-white' : 'bg-zinc-900 border-zinc-700'
            } opacity-60 relative`}
          >
            <div className="absolute inset-0 flex items-center justify-center z-10">
              <Shield className="h-10 w-10 text-gray-500 opacity-80" />
            </div>
            <div className="absolute inset-0 bg-gray-200 dark:bg-gray-800 opacity-30 z-0"></div>
            <CardHeader className="relative z-1">
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-amber-500" />
                Upload Settings
              </CardTitle>
              <CardDescription>
                Configure file upload parameters
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 relative z-1">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Max Upload Size (MB)</Label>
                  <p
                    className={`text-sm ${
                      theme === 'light' ? 'text-gray-500' : 'text-gray-400'
                    }`}
                  >
                    Maximum file size for uploads
                  </p>
                </div>
                <select
                  disabled
                  value={settings.maxUploadSize}
                  className={`rounded-md px-3 py-1.5 ${
                    theme === 'light'
                      ? 'bg-white border-gray-300'
                      : 'bg-zinc-800 border-zinc-700 text-white'
                  }`}
                >
                  <option value={10}>10 MB</option>
                </select>
              </div>

              <Separator
                className={theme === 'light' ? 'bg-gray-200' : 'bg-gray-700'}
              />

              <div className="pt-2">
                <Button
                  variant="outline"
                  className="w-full flex items-center justify-center gap-2"
                  disabled
                >
                  <RefreshCw className="h-4 w-4" />
                  Refresh Storage Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
