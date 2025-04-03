'use client';

import React, { useState } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlbumManagement } from '@/components/admin/content/AlbumManagement';
import { TrackManagement } from '@/components/admin/content/TrackManagement';
import { SystemPlaylistManagement } from '@/components/admin/content/SystemPlaylistManagement';

export default function ContentManagement() {
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState('albums');

  return (
    <div className="p-4 md:p-6 space-y-6">
      <h1
        className={`text-2xl font-semibold ${
          theme === 'dark' ? 'text-white' : 'text-gray-900'
        }`}
      >
        Content Management
      </h1>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList
          className={`grid w-full grid-cols-3 ${
            theme === 'dark' ? 'bg-[#282828]' : 'bg-gray-100'
          }`}
        >
          <TabsTrigger
            value="albums"
            className={`${
              theme === 'dark'
                ? 'data-[state=active]:bg-[#3e3e3e] data-[state=active]:text-white'
                : 'data-[state=active]:bg-white data-[state=active]:text-gray-900'
            }`}
          >
            Albums
          </TabsTrigger>
          <TabsTrigger
            value="tracks"
            className={`${
              theme === 'dark'
                ? 'data-[state=active]:bg-[#3e3e3e] data-[state=active]:text-white'
                : 'data-[state=active]:bg-white data-[state=active]:text-gray-900'
            }`}
          >
            Tracks
          </TabsTrigger>
          <TabsTrigger
            value="playlists"
            className={`${
              theme === 'dark'
                ? 'data-[state=active]:bg-[#3e3e3e] data-[state=active]:text-white'
                : 'data-[state=active]:bg-white data-[state=active]:text-gray-900'
            }`}
          >
            System Playlists
          </TabsTrigger>
        </TabsList>

        <TabsContent value="albums" className="mt-4">
          <AlbumManagement theme={theme} />
        </TabsContent>

        <TabsContent value="tracks" className="mt-4">
          <TrackManagement theme={theme} />
        </TabsContent>

        <TabsContent value="playlists" className="mt-4">
          <SystemPlaylistManagement theme={theme} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
