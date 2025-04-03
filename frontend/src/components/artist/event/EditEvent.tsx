'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import toast from 'react-hot-toast';
import { api } from '@/utils/api';

interface EventData {
  id: string;
  title: string;
  description?: string;
  location: string;
  startDate: string;
  endDate: string;
  artistId: string;
}

interface EditEventProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function EditEvent({ open, onOpenChange }: EditEventProps) {
  const params = useParams();
  const id = params?.id
    ? Array.isArray(params.id)
      ? params.id[0]
      : params.id
    : null;

  const router = useRouter();
  const token = localStorage.getItem('userToken') || '';

  const [eventData, setEventData] = useState<EventData | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    location: '',
    startDate: '',
    endDate: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const data = await api.events.getEventById(id as string, token);
        setEventData(data);
        setFormData({
          title: data.title,
          description: data.description || '',
          location: data.location,
          startDate: new Date(data.startDate).toISOString().slice(0, 16),
          endDate: new Date(data.endDate).toISOString().slice(0, 16),
        });
      } catch (error) {
        console.error('Error fetching event:', error);
        toast.error('Error fetching event');
      }
    };

    if (id) fetchEvent();
  }, [id, token]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.events.updateEvent(id as string, formData, token);
      toast.success('Event updated successfully');
      onOpenChange(false);
      router.push('/artist/events');
    } catch (error) {
      console.error('Error updating event:', error);
      toast.error('Error updating event');
      setError('An error occurred while updating the event.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!eventData) return <div>Loading...</div>;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Event</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Title</label>
            <Input
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              Description
            </label>
            <Input
              name="description"
              value={formData.description}
              onChange={handleInputChange}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Location</label>
            <Input
              name="location"
              value={formData.location}
              onChange={handleInputChange}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Start Date</label>
            <Input
              name="startDate"
              type="datetime-local"
              value={formData.startDate}
              onChange={handleInputChange}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">End Date</label>
            <Input
              name="endDate"
              type="datetime-local"
              value={formData.endDate}
              onChange={handleInputChange}
              required
            />
          </div>
          <div className="flex justify-end space-x-2">
            <Button
              type="button"
              variant="destructive"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Update'}
            </Button>
          </div>
        </form>
        {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
      </DialogContent>
    </Dialog>
  );
}
