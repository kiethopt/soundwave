import React, { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { api } from '@/utils/api';
import { ReportType } from '@/types';
import { AlertTriangle, Flag, XIcon } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/contexts/ThemeContext';
import { cn } from '@/lib/utils';

interface ReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityType: 'track' | 'playlist' | 'album';
  entityId: string;
  entityName: string; // Track title, playlist name, or album title
  onReportSuccess?: () => void;
}

export function ReportDialog({
  open,
  onOpenChange,
  entityType,
  entityId,
  entityName,
  onReportSuccess
}: ReportDialogProps) {
  // For playlists, default to AI_GENERATION_ISSUE
  const [reportType, setReportType] = useState<ReportType>(
    entityType === 'playlist' ? ReportType.AI_GENERATION_ISSUE : ReportType.COPYRIGHT_VIOLATION
  );
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { isAuthenticated, handleProtectedAction } = useAuth();
  const { theme } = useTheme();
  
  const isDarkTheme = theme === 'dark';

  // Reset the form when the dialog opens with the appropriate default
  useEffect(() => {
    if (open) {
      setReportType(entityType === 'playlist' ? ReportType.AI_GENERATION_ISSUE : ReportType.COPYRIGHT_VIOLATION);
      setDescription('');
    }
  }, [open, entityType]);

  const resetForm = () => {
    setReportType(entityType === 'playlist' ? ReportType.AI_GENERATION_ISSUE : ReportType.COPYRIGHT_VIOLATION);
    setDescription('');
  };

  const handleReportChange = (value: string) => {
    setReportType(value as ReportType);
  };

  const handleSubmit = async () => {
    handleProtectedAction(async () => {
      if (!description.trim()) {
        toast.error('Please provide a description');
        return;
      }

      try {
        setIsSubmitting(true);
        const token = localStorage.getItem('userToken');
        if (!token) {
          toast.error('Authentication required');
          return;
        }

        const data: any = {
          type: reportType,
          description: description.trim(),
        };

        // Set the appropriate entity ID
        if (entityType === 'track') {
          data.trackId = entityId;
        } else if (entityType === 'playlist') {
          data.playlistId = entityId;
        } else if (entityType === 'album') {
          data.albumId = entityId;
        }

        const response = await api.reports.create(data, token);

        if (response.success || response.message) {
          toast.success('Report submitted successfully. We will review it shortly.');
          resetForm();
          onOpenChange(false);
          if (onReportSuccess) {
            onReportSuccess();
          }
        } else {
          toast.error('Failed to submit report. Please try again.');
        }
      } catch (error: any) {
        console.error('Error submitting report:', error);
        toast.error(error.message || 'Failed to submit report');
      } finally {
        setIsSubmitting(false);
      }
    });
  };

  // Format entity type for display
  const formatEntityType = (type: string) => {
    return type.charAt(0).toUpperCase() + type.slice(1);
  };
  
  // Get warning message for report type
  const getWarningMessage = () => {
    if (reportType === 'COPYRIGHT_VIOLATION') {
      return (
        <div className={cn(
          "mt-4 p-3 rounded-md text-sm",
          isDarkTheme 
            ? "bg-amber-900/20 text-amber-300 border border-amber-700/30"
            : "bg-amber-50 text-amber-800 border border-amber-200"
        )}>
          <span className="font-medium">Important:</span> Copyright violation reports may result in content being removed. False reports may lead to account restrictions.
        </div>
      );
    } else if (reportType === 'AI_GENERATION_ISSUE' && entityType === 'playlist') {
      return (
        <div className={cn(
          "mt-4 p-3 rounded-md text-sm",
          isDarkTheme 
            ? "bg-blue-900/20 text-blue-300 border border-blue-700/30"
            : "bg-blue-50 text-blue-800 border border-blue-200"
        )}>
          <span className="font-medium">Note:</span> Your feedback helps us improve our AI playlist generation. Please provide specific details about what you feel could be improved.
        </div>
      );
    }
    return null;
  };

  // Render different report type options based on entity type
  const renderReportTypeOptions = () => {
    if (entityType === 'playlist') {
      return (
        <SelectContent className={isDarkTheme ? "bg-neutral-600 border-neutral-500" : ""}>
          <SelectItem value="AI_GENERATION_ISSUE">AI Generation Quality</SelectItem>
          <SelectItem value="INAPPROPRIATE_CONTENT">Inappropriate Content</SelectItem>
          <SelectItem value="OTHER">Other</SelectItem>
        </SelectContent>
      );
    }
    
    // For tracks and albums
    return (
      <SelectContent className={isDarkTheme ? "bg-neutral-600 border-neutral-500" : ""}>
        <SelectItem value="COPYRIGHT_VIOLATION">Copyright Violation</SelectItem>
        <SelectItem value="INAPPROPRIATE_CONTENT">Inappropriate Content</SelectItem>
        <SelectItem value="AI_GENERATION_ISSUE">AI Generation Issue</SelectItem>
        <SelectItem value="OTHER">Other</SelectItem>
      </SelectContent>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(
        "sm:max-w-[425px] p-0 overflow-hidden shadow-lg",
        isDarkTheme 
          ? "bg-neutral-700/90 text-neutral-100 border-neutral-600"
          : "bg-white border-gray-200"
      )}>
        {/* Header */}
        <div className="px-6 pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={cn(
                "w-12 h-12 flex items-center justify-center rounded-full",
                isDarkTheme ? "bg-amber-900/20" : "bg-amber-100"
              )}>
                <AlertTriangle className={cn(
                  "w-7 h-7",
                  isDarkTheme ? "text-amber-300" : "text-amber-600"
                )} strokeWidth={1.5} />
              </div>
              <div>
                <DialogTitle className={cn(
                  "text-lg font-bold",
                  isDarkTheme ? "text-neutral-100" : "text-gray-900"
                )}>
                  Report {formatEntityType(entityType)}
                </DialogTitle>
                <DialogDescription className={cn(
                  "text-sm mt-1",
                  isDarkTheme ? "text-neutral-300" : "text-gray-600"
                )}>
                  {entityType === 'playlist' 
                    ? `Report issues with the AI-generated playlist "${entityName}"`
                    : `Report inappropriate content or copyright infringement for "${entityName}"`}
                </DialogDescription>
              </div>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="px-6 pt-4 pb-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="report-type" className={cn(
              "text-sm font-medium",
              isDarkTheme ? "text-neutral-300" : "text-gray-700"
            )}>
              Report Type
            </Label>
            <Select
              value={reportType}
              onValueChange={handleReportChange}
            >
              <SelectTrigger id="report-type" className={cn(
                isDarkTheme 
                  ? "bg-neutral-600 border-neutral-500 text-neutral-100"
                  : "bg-white border-gray-300"
              )}>
                <SelectValue placeholder="Select report type" />
              </SelectTrigger>
              {renderReportTypeOptions()}
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className={cn(
              "text-sm font-medium",
              isDarkTheme ? "text-neutral-300" : "text-gray-700"
            )}>
              Description
            </Label>
            <Textarea
              id="description"
              placeholder={entityType === 'playlist' 
                ? "Please describe what issues you found with this AI-generated playlist..." 
                : "Please provide details about your report..."}
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={cn(
                isDarkTheme 
                  ? "bg-neutral-600 border-neutral-500 text-neutral-100 placeholder:text-neutral-400"
                  : "bg-white border-gray-300 placeholder:text-gray-500"
              )}
            />
          </div>
          
          {getWarningMessage()}
        </div>

        {/* Footer */}
        <div className={cn(
          "px-6 py-4 flex gap-3 border-t",
          isDarkTheme 
            ? "border-neutral-600 bg-neutral-600/60"
            : "border-gray-100 bg-gray-50"
        )}>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
            className={cn(
              "flex-1",
              isDarkTheme 
                ? "bg-neutral-600 hover:bg-neutral-500 text-neutral-100 border-neutral-500"
                : "border-gray-300"
            )}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!description.trim() || isSubmitting}
            className="flex-1"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Report'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
} 