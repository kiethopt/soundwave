import React, { useState } from 'react';
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
import { api } from '@/utils/api';
import { ReportType } from '@/types';
import { AlertTriangle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAuth } from '@/hooks/useAuth';

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
  const [reportType, setReportType] = useState<ReportType>('COPYRIGHT_VIOLATION');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { isAuthenticated, handleProtectedAction } = useAuth();

  const resetForm = () => {
    setReportType('COPYRIGHT_VIOLATION');
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            Report {formatEntityType(entityType)}
          </DialogTitle>
          <DialogDescription>
            Report inappropriate content or copyright infringement for "{entityName}"
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <label htmlFor="report-type" className="text-sm font-medium">
              Report Type
            </label>
            <Select
              value={reportType}
              onValueChange={handleReportChange}
            >
              <SelectTrigger id="report-type">
                <SelectValue placeholder="Select report type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="COPYRIGHT_VIOLATION">Copyright Violation</SelectItem>
                <SelectItem value="INAPPROPRIATE_CONTENT">Inappropriate Content</SelectItem>
                <SelectItem value="AI_GENERATION_ISSUE">AI Generation Issue</SelectItem>
                <SelectItem value="OTHER">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <label htmlFor="description" className="text-sm font-medium">
              Description
            </label>
            <Textarea
              id="description"
              placeholder="Please provide details about your report..."
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!description.trim() || isSubmitting}
          >
            {isSubmitting ? 'Submitting...' : 'Submit Report'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 