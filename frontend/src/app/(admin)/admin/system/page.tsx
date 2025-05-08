'use client';

import { useState, useEffect } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import toast from 'react-hot-toast';
import {
  Settings,
  Bot,
  AlertCircle,
  Loader2,
  Server,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { SystemSettings, SystemComponentStatus } from '@/types';
import { api } from '@/utils/api';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function SystemManagementPage() {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState<string | null>(null);
  const [settings, setSettings] = useState<SystemSettings>({
    cacheEnabled: false,
    debugMode: false,
    sessionTimeout: 60,
    maxUploadSize: 10,
    aiModel: '',
    supportedAIModels: [],
  });
  const [systemStatuses, setSystemStatuses] = useState<SystemComponentStatus[]>([]);

  // Load system settings and status
  useEffect(() => {
    const initializeSystemSettings = async () => {
      try {
        const token = localStorage.getItem('userToken');
        if (!token) return;

        // Fetch settings and system status
        const [aiModelResponse, statusResponse] =
          await Promise.all([
            api.admin.getAIModelStatus(token),
            api.admin.getSystemStatus(token),
          ]);

        console.log('[System Page] Raw AI Model Response:', aiModelResponse);

        setSettings((prev) => {
          const newState = {
            ...prev,
            aiModel: aiModelResponse.data?.model || '',
            supportedAIModels: aiModelResponse.data?.validModels || [],
          };
          console.log('[System Page] Updated settings state:', newState);
          return newState;
        });

        // Set system statuses
        if (statusResponse?.success && Array.isArray(statusResponse.data)) {
          setSystemStatuses(statusResponse.data);
        } else {
          console.error('Failed to fetch or parse system status:', statusResponse);
          toast.error('Could not load system component statuses.');
        }
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

      if (key === 'aiModel') {
        await api.admin.updateAIModelStatus(value, token);
        toast.success('AI model updated successfully');
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
            Manage system configuration and status
          </h2>
        </div>
      </div>

      {/* Content Area */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* System Status Card - NEW */}
          <Card
            className={`${theme === 'light' ? 'bg-white' : 'bg-zinc-900 border-zinc-700'}`}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server className="h-5 w-5 text-indigo-500" />
                System Status
              </CardTitle>
              <CardDescription>
                Overview of core system components
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {systemStatuses.length > 0 ? (
                systemStatuses.map((component) => {
                  return (
                    <div key={component.name} className="flex items-center justify-between text-sm border-b pb-2 last:border-b-0 last:pb-0 pt-1 first:pt-0 border-border/30">
                      <span className="font-medium text-primary">{component.name}</span>
                      <span className={`font-semibold ${
                        component.status === 'Available' 
                          ? 'text-green-600 dark:text-green-500' 
                          : 'text-red-600 dark:text-red-500'
                      }`}>
                        {component.status}
                      </span>
                    </div>
                  );
                })
              ) : (
                <p className={`text-sm ${theme === 'light' ? 'text-gray-500' : 'text-gray-400'}`}>
                  System status information is unavailable.
                </p>
              )}
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
                    <SelectValue
                      placeholder={settings.aiModel || 'Select AI model'}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {!settings.supportedAIModels?.length && (
                      <SelectItem value="loading" disabled>
                        No models available
                      </SelectItem>
                    )}
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
        </div>
      )}
    </div>
  );
}
