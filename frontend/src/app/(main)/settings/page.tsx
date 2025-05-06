'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useTheme } from '@/contexts/ThemeContext';
import { ExternalLink } from 'lucide-react';
import { EditProfileModal } from '@/components/user/profile/EditProfileModal';
import toast from 'react-hot-toast';
import { api } from '@/utils/api';

export default function SettingsPage() {
  const router = useRouter();
  const { theme } = useTheme();
  const [compactLayout, setCompactLayout] = useState<boolean>(false);
  const [showSocialLists, setShowSocialLists] = useState<boolean>(false);
  const [isEditProfileModalOpen, setIsEditProfileModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const settingPageColor = '#AD8574';

  useEffect(() => {
    const token = localStorage.getItem('userToken');
    if (!token) {
      router.push('/login');
      return;
    }

    // Fetch user data including follow visibility setting
    const fetchUserData = async () => {
      try {
        setIsLoading(true);
        const userData = await api.auth.getMe(token);

        // --- Redirect if Admin or Artist --- 
        if (userData.role === 'ADMIN') {
          router.push('/admin/dashboard');
          return;
        } else if (userData.currentProfile === 'ARTIST') {
          router.push('/artist/dashboard');
          return;
        }
        // --- End Redirect ---

        setShowSocialLists(userData.followVisibility || false);
        
        // Load other settings from localStorage
        try {
          const sidebarCollapsed = JSON.parse(localStorage.getItem('sidebarCollapsed') || 'false');
          setCompactLayout(sidebarCollapsed || false);
        } catch (error) {
          console.error('Error loading sidebar settings:', error);
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
        toast.error('Failed to load user settings');
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserData();
  }, [router]);

  // Listen for sidebar collapsed state changes
  useEffect(() => {
    const checkSidebarState = () => {
      try {
        const sidebarCollapsed = JSON.parse(localStorage.getItem('sidebarCollapsed') || 'false');
        setCompactLayout(sidebarCollapsed);
      } catch (error) {
        console.error('Error reading sidebar state:', error);
      }
    };

    window.addEventListener('storage-changed', checkSidebarState);
    
    return () => {
      window.removeEventListener('storage-changed', checkSidebarState);
    };
  }, []);

  const handleCompactLayoutChange = (value: boolean) => {
    setCompactLayout(value);
    localStorage.setItem('sidebarCollapsed', JSON.stringify(value));
    
    const event = new CustomEvent('sidebar-collapsed-changed', { 
      detail: { collapsed: value } 
    });
    window.dispatchEvent(event);
  };

  const handleEditLoginMethods = () => {
    setIsEditProfileModalOpen(true);
  };

  const handleShowSocialListsChange = async (value: boolean) => {
    setShowSocialLists(value);
    
    const token = localStorage.getItem('userToken');
    if (!token) {
      router.push('/login');
      return;
    }

    try {
      await api.user.setFollowVisibility(token, { isVisible: value });
      toast.success(value 
        ? 'Your follower and following lists are now public' 
        : 'Your follower and following lists are now private');
    } catch (error) {
      console.error('Error updating follow visibility:', error);
      toast.error('Failed to update visibility settings');
      setShowSocialLists(!value);
    }
  }

  return (
    <div className="w-full px-4 py-8"
    style={{
      background: settingPageColor
        ? `linear-gradient(180deg, 
            ${settingPageColor} 0%, 
            ${settingPageColor}50 15%, 
            ${theme === 'light' ? '#ffffff' : '#121212'} 70%)`
        : theme === 'light'
        ? 'linear-gradient(180deg, #f3f4f6 0%, #ffffff 100%)'
        : 'linear-gradient(180deg, #2c2c2c 0%, #121212 100%)',
    }}>
      <h1 className="text-4xl font-bold mb-8">Settings</h1>
      
      {/* Account Section */}
      <div className="mb-8">
        <h2 className="text-xl font-bold mb-4">Account</h2>
        <div className="flex items-center justify-between py-4 border-b border-white/20">
          <span className="text-sm">Edit login methods</span>
          <Button 
            variant="default" 
            size="sm" 
            onClick={handleEditLoginMethods}
            className="flex items-center gap-1"
          >
            Edit <ExternalLink className="w-4 h-4" />
          </Button>
        </div>
      </div>
      
      {/* Your Library Section */}
      <div className="mb-8">
        <h2 className="text-xl font-bold mb-4">Your Library</h2>
        <div className="flex items-center justify-between py-4 border-b border-white/20">
          <span className="text-sm">Use compact library layout</span>
          <Switch 
            checked={compactLayout} 
            onCheckedChange={handleCompactLayoutChange}
            disabled={isLoading}
          />
        </div>
      </div>
      
      {/* Social Section */}
      <div className="mb-8">
        <h2 className="text-xl font-bold mb-4">Social</h2>
        <div className="flex items-center justify-between py-4 border-b border-white/20">
          <span className="text-sm">Show my follower and following lists on my public profile</span>
          <Switch 
            checked={showSocialLists} 
            onCheckedChange={handleShowSocialListsChange}
            disabled={isLoading}
          />
        </div>
      </div>

      <EditProfileModal
        open={isEditProfileModalOpen}
        onOpenChange={setIsEditProfileModalOpen}
        onSuccess={() => {
          // You could refresh data here if needed
          toast.success('Profile updated successfully!');
        }}
      />
    </div>
  );
}