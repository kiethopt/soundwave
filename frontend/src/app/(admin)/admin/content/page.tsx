'use client';

import React, { useState } from 'react';
import { AlbumManagement } from '@/components/admin/content/AlbumManagement';
import { TrackManagement } from '@/components/admin/content/TrackManagement';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTheme } from '@/contexts/ThemeContext';
import { Album, Disc3 } from 'lucide-react';

export default function ContentManagement() {
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState('albums');

  return (
    <div className={`container mx-auto space-y-6 p-4 pb-20 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
      <div className="mb-6">
        <h1 className={`text-2xl md:text-3xl font-bold tracking-tight ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
          Content Management
        </h1>
        <p className={`text-muted-foreground ${theme === 'dark' ? 'text-white/60' : 'text-gray-600'}`}>
          Manage albums, tracks, and system playlists
        </p>
      </div>

      <Tabs 
        value={activeTab} 
        onValueChange={setActiveTab} 
        className="w-full"
      >
        <TabsList className={`grid w-full grid-cols-2 mb-6 ${theme === 'dark' ? 'bg-gray-800' : ''}`}>
          <TabsTrigger 
            value="albums"
            className={`flex items-center gap-2 ${theme === 'dark' ? 'data-[state=active]:bg-gray-700 data-[state=active]:text-white' : ''}`}
          >
            <Album className="h-4 w-4" />
            <span className="hidden sm:inline">Albums</span>
          </TabsTrigger>
          <TabsTrigger 
            value="tracks"
            className={`flex items-center gap-2 ${theme === 'dark' ? 'data-[state=active]:bg-gray-700 data-[state=active]:text-white' : ''}`}
          >
            <Disc3 className="h-4 w-4" />
            <span className="hidden sm:inline">Tracks</span>
          </TabsTrigger>
          {/*
          <TabsTrigger 
            value="playlists"
            className={`flex items-center gap-2 ${theme === 'dark' ? 'data-[state=active]:bg-gray-700 data-[state=active]:text-white' : ''}`}
          >
            <ListMusic className="h-4 w-4" />
            <span className="hidden sm:inline">System Playlists</span>
          </TabsTrigger>
          */}
        </TabsList>

        <TabsContent value="albums" className="space-y-4">
          <AlbumManagement theme={theme} />
        </TabsContent>

        <TabsContent value="tracks" className="space-y-4">
          <TrackManagement theme={theme} />
        </TabsContent>

        {/*
        <TabsContent value="playlists" className="space-y-4">
          <SystemPlaylistManagement theme={theme} />
        </TabsContent>
        */}
      </Tabs>
    </div>
  );
}
