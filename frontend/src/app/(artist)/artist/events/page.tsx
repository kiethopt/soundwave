// 'use client';

// import { useState, useEffect, useCallback } from 'react';
// import type { EventType } from '@/types';
// import { api } from '@/utils/api';
// import toast from 'react-hot-toast';
// import { useTheme } from '@/contexts/ThemeContext';
// import {
//   ColumnFiltersState,
//   getCoreRowModel,
//   getPaginationRowModel,
//   getSortedRowModel,
//   SortingState,
//   useReactTable,
//   VisibilityState,
// } from '@tanstack/react-table';
// import { DataTableWrapper } from '@/components/ui/data-table/data-table-wrapper';
// import Link from 'next/link';
// import { EditEventModal } from '@/components/ui/data-table/data-table-modals';
// import { getEventColumns } from '@/components/ui/data-table/data-table-columns';
// import { useDataTable } from '@/hooks/useDataTable';

// export default function EventManagement() {
//   const { theme } = useTheme();
//   const limit = 10;

//   const {
//     data: events,
//     setData: setEvents,
//     loading,
//     totalPages,
//     currentPage,
//     setActionLoading,
//     searchInput,
//     setSearchInput,
//     statusFilter,
//     setStatusFilter,
//     genreFilter,
//     setGenreFilter,
//     selectedRows,
//     setSelectedRows,
//     updateQueryParam,
//   } = useDataTable<EventType>({
//     fetchData: async (page, params) => {
//       const token = localStorage.getItem('userToken');
//       if (!token) throw new Error('No authentication token found');

//       const response = await api.events.getAllEvents(
//         { artistId: params.get('artistId') || undefined },
//         token
//       );

//       return {
//         data: response.events,
//         pagination: response.pagination,
//       };
//     },
//     limit,
//   });

//   const [sorting, setSorting] = useState<SortingState>([]);
//   const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
//   const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
//   const [rowSelection, setRowSelection] = useState({});

//   const [editingEvent, setEditingEvent] = useState<EventType | null>(null);
//   const [availableArtists, setAvailableArtists] = useState<
//     Array<{ id: string; name: string }>
//   >([]);

//   const fetchMetadata = useCallback(async () => {
//     try {
//       const token = localStorage.getItem('userToken');
//       if (!token) return;

//       const artistsResponse = await api.artists.getAllArtistsProfile(
//         token,
//         1,
//         100
//       );

//       setAvailableArtists(
//         artistsResponse.artists.map((artist: any) => ({
//           id: artist.id,
//           name: artist.artistName,
//         }))
//       );

//       if (editingEvent) {
//         setSelectedArtists(editingEvent.artists.map((a) => a.artistProfile.id));
//       }
//     } catch (error) {
//       console.error('Failed to fetch metadata:', error);
//       toast.error('Failed to load required data');
//     }
//   }, [editingEvent]);

//   useEffect(() => {
//     fetchMetadata();
//   }, [fetchMetadata]);

//   const handleEventVisibility = async (eventId: string, isActive: boolean) => {
//     try {
//       setActionLoading(eventId);
//       const token = localStorage.getItem('userToken');
//       if (!token) {
//         toast.error('No authentication token found');
//         return;
//       }

//       await api.events.updateEvent(eventId, { isActive: !isActive }, token);
//       setEvents((prev) =>
//         prev.map((event) =>
//           event.id === eventId ? { ...event, isActive: !isActive } : event
//         )
//       );
//       toast.success(
//         `Event ${isActive ? 'hidden' : 'made visible'} successfully`
//       );
//     } catch (error) {
//       toast.error(
//         error instanceof Error ? error.message : 'Failed to update event'
//       );
//     } finally {
//       setActionLoading(null);
//     }
//   };

//   const handleDeleteEvents = async (eventIds: string | string[]) => {
//     const ids = Array.isArray(eventIds) ? eventIds : [eventIds];
//     const confirmMessage =
//       ids.length === 1
//         ? 'Are you sure you want to delete this event?'
//         : `Delete ${ids.length} selected events?`;

//     if (!confirm(confirmMessage)) return;

//     try {
//       const token = localStorage.getItem('userToken');
//       if (!token) {
//         toast.error('No authentication token found');
//         return;
//       }

//       if (!Array.isArray(eventIds)) {
//         setActionLoading(eventIds);
//       }

//       await Promise.all(ids.map((id) => api.events.deleteEvent(id, token)));

//       if (!Array.isArray(eventIds)) {
//         setEvents((prev) => prev.filter((event) => event.id !== eventIds));
//       } else {
//         const params = new URLSearchParams();
//         params.set('page', currentPage.toString());
//         params.set('limit', limit.toString());

//         if (searchInput) params.append('q', searchInput);
//         if (statusFilter.length === 1) params.append('status', statusFilter[0]);
//         if (genreFilter.length > 0) {
//           genreFilter.forEach((genre) => params.append('genres', genre));
//         }

//         const token = localStorage.getItem('userToken');
//         if (token) {
//           const response = await api.events.getAllEvents(
//             { artistId: params.get('artistId') || undefined },
//             token
//           );
//           setEvents(response.events);
//         }
//       }

//       toast.success(
//         ids.length === 1
//           ? 'Event deleted successfully'
//           : `Deleted ${ids.length} events successfully`
//       );
//     } catch (error) {
//       toast.error(
//         error instanceof Error ? error.message : 'Failed to delete event(s)'
//       );
//     } finally {
//       if (!Array.isArray(eventIds)) {
//         setActionLoading(null);
//       }
//     }
//   };

//   const handleUpdateEvent = async (eventId: string, formData: FormData) => {
//     try {
//       setActionLoading(eventId);
//       const token = localStorage.getItem('userToken');
//       if (!token) {
//         toast.error('No authentication token found');
//         return;
//       }

//       await api.events.updateEvent(eventId, formData, token);

//       const params = new URLSearchParams();
//       params.set('page', currentPage.toString());
//       params.set('limit', limit.toString());

//       if (searchInput) params.append('q', searchInput);
//       if (statusFilter.length === 1) params.append('status', statusFilter[0]);
//       if (genreFilter.length > 0) {
//         genreFilter.forEach((genre) => params.append('genres', genre));
//       }

//       const response = await api.events.getAllEvents(
//         { artistId: params.get('artistId') || undefined },
//         token
//       );
//       setEvents(response.events);

//       setEditingEvent(null);
//       toast.success('Event updated successfully');
//     } catch (error) {
//       console.error('Update event error:', error);
//       toast.error(
//         error instanceof Error ? error.message : 'Failed to update event'
//       );
//     } finally {
//       setActionLoading(null);
//     }
//   };

//   const columns = getEventColumns({
//     theme,
//     onVisibilityChange: handleEventVisibility,
//     onDelete: handleDeleteEvents,
//     onEdit: (event: EventType) => setEditingEvent(event),
//   });

//   const table = useReactTable({
//     data: events,
//     columns,
//     getCoreRowModel: getCoreRowModel(),
//     getPaginationRowModel: getPaginationRowModel(),
//     getSortedRowModel: getSortedRowModel(),
//     onSortingChange: setSorting,
//     onColumnFiltersChange: setColumnFilters,
//     onColumnVisibilityChange: setColumnVisibility,
//     onRowSelectionChange: (updatedSelection) => {
//       setRowSelection(updatedSelection);
//       const selectedRowData = events.filter(
//         (event, index) =>
//           typeof updatedSelection === 'object' &&
//           updatedSelection[index.toString()]
//       );
//       setSelectedRows(selectedRowData);
//     },
//     state: {
//       sorting,
//       columnFilters,
//       columnVisibility,
//       rowSelection,
//       pagination: {
//         pageIndex: currentPage - 1,
//         pageSize: limit,
//       },
//     },
//     pageCount: totalPages,
//     manualPagination: true,
//   });

//   return (
//     <div
//       className={`container mx-auto space-y-4 p-4 pb-20 ${
//         theme === 'dark' ? 'text-white' : ''
//       }`}
//     >
//       <div className="flex flex-col sm:flex-row sm:justify-between gap-4 mb-6">
//         <div>
//           <h1
//             className={`text-2xl md:text-3xl font-bold tracking-tight ${
//               theme === 'dark' ? 'text-white' : 'text-gray-900'
//             }`}
//           >
//             Event Management
//           </h1>
//           <p
//             className={`text-muted-foreground ${
//               theme === 'dark' ? 'text-white/60' : ''
//             }`}
//           >
//             Manage and monitor your events
//           </p>
//         </div>

//         <Link
//           href="/artist/events/new"
//           className={`px-4 py-2 rounded-md font-medium transition-colors w-fit h-fit ${
//             theme === 'light'
//               ? 'bg-gray-900 text-white hover:bg-gray-800'
//               : 'bg-white text-[#121212] hover:bg-white/90'
//           }`}
//         >
//           New Event
//         </Link>
//       </div>

//       <DataTableWrapper
//         table={table}
//         columns={columns}
//         data={events}
//         pageCount={totalPages}
//         pageIndex={currentPage - 1}
//         loading={loading}
//         onPageChange={(page) => updateQueryParam('page', page + 1)}
//         onRowSelection={setSelectedRows}
//         theme={theme}
//         toolbar={{
//           searchValue: searchInput,
//           onSearchChange: setSearchInput,
//           selectedRowsCount: selectedRows.length,
//           onDelete: () => handleDeleteEvents(selectedRows.map((row) => row.id)),
//           showExport: true,
//           exportData: {
//             data: events,
//             columns: [
//               { key: 'title', header: 'Event Title' },
//               { key: 'location', header: 'Location' },
//               { key: 'startDate', header: 'Start Date' },
//               { key: 'endDate', header: 'End Date' },
//               { key: 'description', header: 'Description' },
//               { key: 'isActive', header: 'Status' },
//               { key: 'createdAt', header: 'Created At' },
//               { key: 'updatedAt', header: 'Updated At' },
//             ],
//             filename: 'events-export',
//           },
//           searchPlaceholder: 'Search events...',
//           statusFilter: {
//             value: statusFilter,
//             onChange: setStatusFilter,
//           },
//         }}
//       />

//       <EditEventModal
//         event={editingEvent}
//         onClose={() => setEditingEvent(null)}
//         onSubmit={handleUpdateEvent}
//         availableArtists={availableArtists}
//         selectedArtists={selectedArtists}
//         setSelectedArtists={setSelectedArtists}
//         theme={theme}
//       />
//     </div>
//   );
// }

export default function EventManagementPage() {
  return <div>Event Management Page</div>;
}
