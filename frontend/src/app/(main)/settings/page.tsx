'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useTheme } from '@/contexts/ThemeContext';
import { ExternalLink } from 'lucide-react';
import { EditProfileModal } from '@/components/user/profile/EditProfileModal';
import { set } from 'lodash';
import toast from 'react-hot-toast';

export default function SettingsPage() {
  const router = useRouter();
  const { theme } = useTheme();
  const [compactLayout, setCompactLayout] = useState<boolean>(false);
  const [showSocialLists, setShowSocialLists] = useState<boolean>(false);
  const [isEditProfileModalOpen, setIsEditProfileModalOpen] = useState(false);


  useEffect(() => {
    try {
      const sidebarCollapsed = JSON.parse(localStorage.getItem('sidebarCollapsed') || 'false');
      setCompactLayout(sidebarCollapsed || false);
      
      const userSettings = JSON.parse(localStorage.getItem('userSettings') || '{}');
      setShowSocialLists(userSettings.showSocialLists || false);
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  }, []);

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

  useEffect(() => {
    try {
      const userSettings = {
        showSocialLists
      };
      localStorage.setItem('userSettings', JSON.stringify(userSettings));
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  }, [showSocialLists]);

  const handleEditLoginMethods = () => {
    setIsEditProfileModalOpen(true);
  };

  return (
    <div className="w-full px-4 py-8">
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
            onCheckedChange={setShowSocialLists}
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