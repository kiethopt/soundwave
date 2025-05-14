// const executeBulkDeleteTracks = async () => {
//   if (
//     confirmModalState.action !== "bulkDeleteTracks" ||
//     !confirmModalState.playlistId ||
//     selectedTrackIds.size === 0
//   )
//     return;

//   setIsBulkDeleting(true);
//   setConfirmModalState({ isOpen: false }); // Close confirmation modal

//   const trackIdsToDelete = Array.from(selectedTrackIds);
//   const totalTracksToRemove = trackIdsToDelete.length;
//   let successfullyRemovedCount = 0;

//   // To show aggregated results
//   const results = await Promise.allSettled(
//     trackIdsToDelete.map((trackId) =>
//       api.admin.removeTrackFromSystemPlaylist(
//         confirmModalState.playlistId!,
//         trackId
//       )
//     )
//   );

//   const successfulDeletes = results.filter(
//     (r) => r.status === "fulfilled"
//   ).length;
//   const failedDeletes = totalTracksToRemove - successfulDeletes;

//   if (failedDeletes === 0 && successfulDeletes > 0) {
//     // All succeeded
//     toast.success(`${successfulDeletes} track(s) removed successfully.`);
//     onTracksRemoved(); // Refresh the track list
//     setSelectedTrackIds(new Set()); // Clear selection
//   } else if (successfulDeletes > 0 && failedDeletes > 0) {
//     // Partial success
//     toast(
//       `Partially successful: ${successfulDeletes} track(s) removed, ${failedDeletes} failed.`
//     );
//     onTracksRemoved(); // Refresh the track list
//     setSelectedTrackIds(new Set()); // Clear selection
//   } else if (failedDeletes > 0 && successfulDeletes === 0) {
//     // All failed
//     toast.error("Failed to remove any selected tracks. Please try again.");
//   } else if (totalTracksToRemove === 0) {
//     // Should not happen if button is disabled for 0 selected, but good to handle
//     toast("No tracks were selected for removal.");
//   }

//   setIsBulkDeleting(false);
// };

// try {
//   const successfulDeletes = results.filter(
//     (r) => r.status === "fulfilled"
//   ).length;
//   const failedDeletes = totalTracksToRemove - successfulDeletes;

//   if (failedDeletes === 0) {
//     toast.success(`${successfulDeletes} track(s) removed successfully.`);
//     onTracksRemoved(); // Refresh the track list
//   } else if (successfulDeletes > 0) {
//     toast(
//       `Partially successful: ${successfulDeletes} track(s) removed, ${failedDeletes} failed.`
//     );
//     onTracksRemoved(); // Refresh the track list
//   } else {
//     toast.error("Failed to remove any selected tracks. Please try again.");
//   }
// } catch (error) {
//   // ... existing code ...
// }
