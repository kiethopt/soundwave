// 'use client';

// import { useState, useCallback } from 'react';
// import {
//   Dialog,
//   DialogContent,
//   DialogHeader,
//   DialogTitle,
// } from '@/components/ui/dialog';
// import { Button } from '@/components/ui/button';
// import useDropzone from 'react-dropzone';
// import { ArtistProfile } from '@/types';
// import { api } from '@/utils/api';
// import { toast } from 'react-toastify';

// interface EditArtistBannerModalProps {
//   artistProfile: ArtistProfile;
//   open: boolean;
//   onOpenChange: (open: boolean) => void;
//   onBannerUpdate?: () => void;
// }

// export function EditArtistBannerModal({
//   artistProfile,
//   open,
//   onOpenChange,
//   onBannerUpdate,
// }: EditArtistBannerModalProps) {
//   const [isLoading, setIsLoading] = useState(false);
//   const [selectedFile, setSelectedFile] = useState<File | null>(null);

//   const onDrop = useCallback((acceptedFiles: File[]) => {
//     const file = acceptedFiles[0];
//     if (file) {
//       // Kiểm tra kích thước file (giới hạn 5MB)
//       if (file.size > 5 * 1024 * 1024) {
//         toast.error('File size should not exceed 5MB');
//         return;
//       }

//       // Kiểm tra định dạng file
//       if (!file.type.startsWith('image/')) {
//         toast.error('Please upload an image file');
//         return;
//       }

//       setSelectedFile(file);
//     }
//   }, []);

//   const { getRootProps, getInputProps, isDragActive } = useDropzone({
//     onDrop,
//     accept: {
//       'image/*': ['.jpeg', '.jpg', '.png', '.gif'],
//     },
//     maxFiles: 1,
//   });

//   const handleSubmit = async (e: React.FormEvent) => {
//     e.preventDefault();
//     if (!selectedFile) return;

//     setIsLoading(true);
//     try {
//       const token = localStorage.getItem('userToken');
//       if (!token) {
//         toast.error('Please login again');
//         return;
//       }

//       if (selectedFile.size > 5 * 1024 * 1024) {
//         toast.error('File size should not exceed 5MB');
//         return;
//       }

//       const formData = new FormData();
//       formData.append('artistBanner', selectedFile);

//       await api.artists.updateProfile(artistProfile.id, formData, token);
//       toast.success('Banner updated successfully');
//       if (onBannerUpdate) onBannerUpdate();
//       onOpenChange(false);
//     } catch (error) {
//       console.error('Error updating banner:', error);
//       toast.error('Failed to update banner');
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   return (
//     <Dialog open={open} onOpenChange={onOpenChange}>
//       <DialogContent>
//         <DialogHeader className="text-white">
//           <DialogTitle>Edit Banner Image</DialogTitle>
//         </DialogHeader>
//         <form onSubmit={handleSubmit} className="flex flex-col space-y-4">
//           <div
//             {...getRootProps()}
//             className={`
//               border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all
//               min-h-[200px] flex items-center justify-center
//               ${
//                 isDragActive
//                   ? 'border-primary bg-primary/10'
//                   : 'border-gray-600 hover:border-primary hover:bg-gray-800/50'
//               }
//             `}
//           >
//             <input {...getInputProps()} />
//             <div className="space-y-4">
//               <div className="text-xl text-white">
//                 {isDragActive
//                   ? 'Drop the file here'
//                   : selectedFile
//                   ? selectedFile.name
//                   : 'Drag and drop your banner image here'}
//               </div>
//               <p className="text-sm text-gray-400">
//                 {!selectedFile && 'or click to select file'}
//               </p>
//               <p className="text-xs text-gray-500">
//                 Supported formats: JPEG, PNG, GIF (max 5MB)
//               </p>
//             </div>
//           </div>

//           <div className="flex justify-end space-x-2">
//             <Button
//               type="button"
//               variant="destructive"
//               onClick={() => onOpenChange(false)}
//               disabled={isLoading}
//             >
//               Cancel
//             </Button>
//             <Button
//               type="submit"
//               variant="default"
//               disabled={isLoading || !selectedFile}
//               onClick={handleSubmit}
//             >
//               {isLoading ? 'Saving...' : 'Save'}
//             </Button>
//           </div>
//         </form>
//       </DialogContent>
//     </Dialog>
//   );
// }
