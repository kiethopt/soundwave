'use client';

import { useState, useRef } from 'react';
import { api } from '@/utils/api';
import { useTheme } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/button';
import { FileAudio, Upload, X, Check, Info, AlertCircle, Download, Image } from 'lucide-react';
import toast from 'react-hot-toast';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface UploadResult {
  trackId: string;
  title: string;
  artistName: string;
  artistId: string;
  duration: number;
  audioUrl: string;
  coverUrl?: string;
  tempo: number | null;
  mood: string | null;
  key: string | null;
  scale: string | null;
  fileName: string;
  genres?: string[];
  success: boolean;
  error?: string;
  danceability?: number | null;
  energy?: number | null;
  instrumentalness?: number | null;
  acousticness?: number | null;
  loudness?: number | null;
  speechiness?: number | null;
  valence?: number | null;
}

export default function BulkUploadPage() {
  const { theme } = useTheme();
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [results, setResults] = useState<UploadResult[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      // Convert FileList to array
      const fileArray = Array.from(e.target.files);
      
      // Filter only audio files
      const audioFiles = fileArray.filter(file => file.type.startsWith('audio/'));
      
      if (audioFiles.length !== fileArray.length) {
        toast.error('Only audio files are accepted.');
      }

      setFiles(prev => [...prev, ...audioFiles]);
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      toast.error('Please select at least one audio file to upload.');
      return;
    }

    try {
      setUploading(true);
      setUploadProgress(0);
      setResults([]);

      const token = localStorage.getItem('userToken');
      if (!token) {
        throw new Error('Authentication token not found');
      }

      const formData = new FormData();
      files.forEach(file => {
        formData.append('audioFiles', file);
      });

      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + 5;
        });
      }, 500);

      const response = await api.admin.bulkUploadTracks(formData, token);
      
      clearInterval(progressInterval);
      setUploadProgress(100);

      if (response && response.createdTracks) {
        setResults(response.createdTracks);
        const successCount = response.createdTracks.filter((r: UploadResult) => r.success).length;
        toast.success(`Successfully processed ${successCount} of ${files.length} files`);
        
        if (successCount === files.length) {
          setFiles([]);
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
        }
      }
    } catch (error) {
      console.error('Error uploading files:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to upload files');
    } finally {
      setUploading(false);
    }
  };

  const formatDuration = (seconds?: number): string => {
    if (!seconds) return '0:00';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const exportToExcel = () => {
    if (!results.length) return;
    
    // Create CSV headers
    const headers = [
      'Status', 
      'File Name', 
      'Track Title', 
      'Artist', 
      'Duration', 
      'Tempo', 
      'Mood', 
      'Key', 
      'Scale', 
      'Genres', 
      'Cover URL', 
      'Track ID', 
      'Audio URL',
      'Danceability',
      'Energy',
      'Instrumentalness',
      'Acousticness',
      'Loudness',
      'Speechiness',
      'Valence'
    ];
    
    // Convert results to CSV rows
    const csvRows = results.map(result => {
      return [
        result.success ? 'Success' : 'Failed',
        result.fileName,
        result.title || '',
        result.artistName || '',
        formatDuration(result.duration),
        result.tempo || '',
        result.mood || '',
        result.key || '',
        result.scale || '',
        result.genres ? result.genres.join(', ') : '',
        result.coverUrl || '',
        result.trackId || '',
        result.audioUrl || '',
        result.danceability !== undefined ? result.danceability : '',
        result.energy !== undefined ? result.energy : '',
        result.instrumentalness !== undefined ? result.instrumentalness : '',
        result.acousticness !== undefined ? result.acousticness : '',
        result.loudness !== undefined ? result.loudness : '',
        result.speechiness !== undefined ? result.speechiness : '',
        result.valence !== undefined ? result.valence : '',
        result.error || ''
      ].join(',');
    });
    
    // Combine headers and rows
    const csvContent = [headers.join(','), ...csvRows].join('\n');
    
    // Create a Blob and download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    link.download = `track-upload-results-${date}.csv`;
    link.click();
  };

  return (
    <div className="container mx-auto space-y-6 p-4 pb-20">
      <div className="mb-6">
        <h1 className={`text-2xl md:text-3xl font-bold tracking-tight`}>
          Bulk Upload Tracks
        </h1>
        <p className={`text-sm md:text-base ${theme === 'dark' ? 'text-white/60' : 'text-gray-600'}`}>
          Upload multiple audio files to create track entries with automatically extracted metadata
        </p>
      </div>

      <div className={cn(
        "p-6 rounded-lg shadow-md",
        theme === 'dark' ? 'bg-gray-800' : 'bg-white'
      )}>
        <div className="mb-4">
          <div className="flex items-center space-x-2">
            <FileAudio className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-medium">Select Audio Files</h2>
          </div>
          <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'} mt-1`}>
            Upload MP3 files to automatically create tracks with artist profiles and generate cover images
          </p>
        </div>

        <div 
          className={cn(
            'border-2 border-dashed rounded-lg p-8 text-center mb-4 transition-all duration-200',
            theme === 'dark' 
              ? 'border-gray-700 hover:border-gray-600' 
              : 'border-gray-300 hover:border-gray-400'
          )}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="audio/*"
            onChange={handleFileChange}
            className="hidden"
            id="file-upload"
            disabled={uploading}
          />
          <label
            htmlFor="file-upload"
            className={`flex flex-col items-center justify-center cursor-pointer ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <Upload className={`h-12 w-12 mb-3 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`} />
            <p className="text-lg font-medium mb-1">Drag and drop files here or click to browse</p>
            <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
              MP3 files only (max 50 files at once)
            </p>
          </label>
        </div>

        {files.length > 0 && (
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-medium">Files to upload ({files.length})</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFiles([])}
                disabled={uploading}
              >
                Clear all
              </Button>
            </div>
            
            <div className={cn(
              "max-h-60 overflow-y-auto rounded-md p-1",
              theme === 'dark' ? 'bg-gray-900' : 'bg-gray-100'
            )}>
              {files.map((file, index) => (
                <div 
                  key={index}
                  className={cn(
                    "flex items-center justify-between p-2 rounded mb-1",
                    theme === 'dark' ? 'hover:bg-gray-800' : 'hover:bg-gray-200'
                  )}
                >
                  <div className="flex items-center space-x-2 overflow-hidden">
                    <FileAudio className="h-4 w-4 flex-shrink-0" />
                    <span className="text-sm truncate">{file.name}</span>
                    <span className="text-xs text-gray-500">
                      {(file.size / (1024 * 1024)).toFixed(2)} MB
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => removeFile(index)}
                    disabled={uploading}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        <Button
          className="w-full"
          size="lg"
          disabled={files.length === 0 || uploading}
          onClick={handleUpload}
        >
          {uploading ? 'Uploading...' : 'Upload and Process Files'}
        </Button>

        {uploading && (
          <div className="mt-4">
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm">Uploading and processing...</span>
              <span className="text-sm">{uploadProgress}%</span>
            </div>
            <Progress value={uploadProgress} className="h-2" />
          </div>
        )}
      </div>

      {results.length > 0 && (
        <div className={cn(
          "p-6 rounded-lg shadow-md",
          theme === 'dark' ? 'bg-gray-800' : 'bg-white'
        )}>
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center space-x-2">
              <Info className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-medium">Upload Results</h2>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={exportToExcel}
            >
              <Download className="h-4 w-4 mr-2" />
              Download as Excel
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className={cn(
              "min-w-full divide-y",
              theme === 'dark' 
                ? 'divide-gray-700 text-gray-200' 
                : 'divide-gray-200 text-gray-700'
            )}>
              <thead className={cn(
                theme === 'dark' ? 'bg-gray-700/50' : 'bg-gray-50'
              )}>
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium tracking-wider uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium tracking-wider uppercase">Cover</th>
                  <th className="px-6 py-3 text-left text-xs font-medium tracking-wider uppercase">File Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium tracking-wider uppercase">Track Title</th>
                  <th className="px-6 py-3 text-left text-xs font-medium tracking-wider uppercase">Artist</th>
                  <th className="px-6 py-3 text-left text-xs font-medium tracking-wider uppercase">Duration</th>
                  <th className="px-6 py-3 text-left text-xs font-medium tracking-wider uppercase">Tempo</th>
                  <th className="px-6 py-3 text-left text-xs font-medium tracking-wider uppercase">Audio Analysis</th>
                  <th className="px-6 py-3 text-left text-xs font-medium tracking-wider uppercase">Genres</th>
                  <th className="px-6 py-3 text-left text-xs font-medium tracking-wider uppercase">Audio</th>
                </tr>
              </thead>
              <tbody className={cn(
                "divide-y",
                theme === 'dark' 
                  ? 'bg-gray-800/50 divide-gray-700' 
                  : 'bg-white divide-gray-200'
              )}>
                {results.map((result, index) => (
                  <tr key={index} className={cn(
                    result.success 
                      ? "" 
                      : theme === 'dark'
                        ? "bg-red-900/30"
                        : "bg-red-50"
                  )}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {result.success ? (
                        <span className={cn(
                          "px-2 inline-flex text-xs leading-5 font-semibold rounded-full",
                          theme === 'dark'
                            ? "bg-green-900/30 text-green-200"
                            : "bg-green-100 text-green-800"
                        )}>
                          Success
                        </span>
                      ) : (
                        <span className={cn(
                          "px-2 inline-flex text-xs leading-5 font-semibold rounded-full",
                          theme === 'dark'
                            ? "bg-red-900/30 text-red-200"
                            : "bg-red-100 text-red-800"
                        )}>
                          Failed
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {result.coverUrl ? (
                        <div className="w-12 h-12 rounded-md overflow-hidden">
                          <img 
                            src={result.coverUrl} 
                            alt={`Cover for ${result.title}`} 
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className={cn(
                          "w-12 h-12 rounded-md flex items-center justify-center",
                          theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'
                        )}>
                          <Image className="w-6 h-6 opacity-50" />
                        </div>
                      )}
                    </td>
                    <td className={cn(
                      "px-6 py-4 whitespace-nowrap text-sm font-medium",
                      theme === 'dark' ? 'text-gray-200' : 'text-gray-900'
                    )}>
                      {result.fileName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">{result.title}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">{result.artistName}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">{formatDuration(result.duration)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">{result.tempo}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {result.success ? (
                        <div>
                          <div>Mood: {result.mood || 'Unknown'}</div>
                          <div>Key: {result.key || 'Unknown'} {result.scale || ''}</div>
                        </div>
                      ) : (
                        <div className={theme === 'dark' ? 'text-red-400' : 'text-red-500'}>
                          {result.error}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {result.genres && result.genres.length > 0 
                        ? result.genres.join(', ') 
                        : 'None'
                      }
                    </td>
                    <td className="px-6 py-4 text-sm max-w-xs truncate">
                      {result.audioUrl ? (
                        <a 
                          href={result.audioUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className={cn(
                            "text-primary hover:underline",
                            theme === 'dark' ? 'text-[#A57865]' : 'text-primary'
                          )}
                        >
                          Listen
                        </a>
                      ) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
} 