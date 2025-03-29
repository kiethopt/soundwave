'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'react-toastify';
import { api } from '@/utils/api';

interface DeleteEventProps {
  eventId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleteSuccess: () => void;
}

export default function DeleteEvent({ eventId, open, onOpenChange, onDeleteSuccess }: DeleteEventProps) {
  const token = localStorage.getItem('userToken') || '';
  const [isLoading, setIsLoading] = useState(false);

  const handleDelete = async () => {
    setIsLoading(true);
    try {
      await api.events.deleteEvent(eventId, token);
      toast.success('Event deleted successfully');
      onOpenChange(false);
      onDeleteSuccess();
    } catch (error) {
      console.error('Error deleting event:', error);
      toast.error('Error deleting event');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirm Delete</DialogTitle>
        </DialogHeader>
        <p className="my-4">Are you sure you want to delete this event?</p>
        <DialogFooter>
          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" onClick={handleDelete} disabled={isLoading}>
              {isLoading ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
