'use client';

import { useState, useEffect } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import toast from 'react-hot-toast';
import {
  Settings,
  RefreshCw,
  Database,
  Server,
  Shield,
  Bot,
  AlertCircle,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

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
    aiModel: 'gemini-2.0-flash',
    supportedAIModels: [],
  });

  // Load system settings
  useEffect(() => {
    const initializeSystemSettings = async () => {
      try {
        const token = localStorage.getItem('userToken');
        if (!token) return;

        // Lấy trạng thái cache
        const cacheResponse = await api.admin.getCacheStatus(token);

        // Lấy trạng thái AI model
        const aiModelResponse = await api.admin.getAIModelStatus(token);

        // Lấy trạng thái bảo trì
        const maintenanceResponse = await api.admin.getMaintenanceStatus(token);

        setSettings((prev) => ({
          ...prev,
          cacheEnabled: cacheResponse.enabled,
          aiModel: aiModelResponse.model,
          supportedAIModels: aiModelResponse.supportedModels || [],
          maintenanceMode: maintenanceResponse.enabled || false,
        }));
      } catch (error) {
        console.error('Failed to get system settings:', error);
        toast.error('Failed to load system settings');
      } finally {
        setLoading(false);
      }
    };

    initializeSystemSettings();
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
      } else if (key === 'aiModel') {
        await api.admin.updateAIModelStatus(value, token);
        toast.success('AI model updated successfully');
      } else if (key === 'maintenanceMode') {
        await api.admin.updateMaintenanceStatus(value, token);
        toast.success('Maintenance mode updated successfully');
      }

      setSettings((prev) => ({ ...prev, [key]: value }));
    } catch (error) {
      toast.error('Failed to update setting');
      // Revert the setting back if update fails
      setSettings((prev) => ({ ...prev }));
    }
  };

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

          {/* AI Model Management Card */}
          <Card
            className={
              theme === 'light' ? 'bg-white' : 'bg-zinc-900 border-zinc-700'
            }
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="h-5 w-5 text-emerald-500" />
                AI Model Management
              </CardTitle>
              <CardDescription>
                Configure Gemini AI model for automatic playlist generation
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Selected AI Model</Label>
                <p
                  className={`text-sm mb-2 ${
                    theme === 'light' ? 'text-gray-500' : 'text-gray-400'
                  }`}
                >
                  Choose the Gemini AI model to use for playlist generation
                </p>

                <Select
                  value={settings.aiModel}
                  onValueChange={(value) => updateSetting('aiModel', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select AI model" />
                  </SelectTrigger>
                  <SelectContent>
                    {settings.supportedAIModels?.map((model) => (
                      <SelectItem key={model} value={model}>
                        {model}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div
                  className={`
                    flex items-center gap-2 mt-3 p-3 rounded-md
                    ${
                      theme === 'light'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-emerald-950/30 text-emerald-400 border border-emerald-900'
                    }
                  `}
                >
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span className="text-xs font-medium">
                    Selected model will be used for all AI-powered playlist
                    generation
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* System Mode Card */}
          <Card
            className={
              theme === 'light' ? 'bg-white' : 'bg-zinc-900 border-zinc-700'
            }
          >
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
                <Switch
                  checked={settings.maintenanceMode}
                  onCheckedChange={(checked) =>
                    updateSetting('maintenanceMode', checked)
                  }
                />
              </div>

              <Separator
                className={theme === 'light' ? 'bg-gray-200' : 'bg-gray-700'}
              />

              <div
                className={`
                  flex items-center gap-2 mt-3 p-3 rounded-md
                  ${
                    theme === 'light'
                      ? 'bg-amber-50 text-amber-700 border border-amber-200'
                      : 'bg-amber-950/30 text-amber-400 border border-amber-900'
                  }
                `}
              >
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span className="text-xs font-medium">
                  When enabled, only administrators can access the system. All
                  other users will see a maintenance message.
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
