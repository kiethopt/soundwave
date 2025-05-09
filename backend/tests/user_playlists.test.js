import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { SharedArray } from 'k6/data';
import { Trend, Rate, Counter } from 'k6/metrics';

const BASE_URL = 'http://localhost:10000/api';
const TEST_DURATION = '1m30s'; // Aim for around 250-300 total requests for main APIs
const VUS = 5;

// Custom Metrics
const createPlaylistDuration = new Trend('create_playlist_duration');
const getPlaylistByIdDuration = new Trend('get_playlist_by_id_duration');
const updatePlaylistDuration = new Trend('update_playlist_duration');
const addTrackToPlaylistDuration = new Trend('add_track_to_playlist_duration');
const removeTrackFromPlaylistDuration = new Trend('remove_track_from_playlist_duration');
const reorderTracksDuration = new Trend('reorder_tracks_duration');
const deletePlaylistDuration = new Trend('delete_playlist_duration');
const failedLoginRate = new Rate('failed_login_rate');
const playlistCreationSuccessRate = new Rate('playlist_creation_success_rate');
const playlistUpdateSuccessRate = new Rate('playlist_update_success_rate');
const playlistDeletionSuccessRate = new Rate('playlist_deletion_success_rate');
const addTrackSuccessRate = new Rate('add_track_success_rate');
const removeTrackSuccessRate = new Rate('remove_track_success_rate');
const reorderTracksSuccessRate = new Rate('reorder_tracks_success_rate');

const successfulRequests = new Counter('successful_requests_total');

export const options = {
  vus: VUS,
  duration: TEST_DURATION,
  thresholds: {
    'http_req_failed': ['rate<0.05'], // Global error rate less than 5%
    'http_req_duration': ['p(95)<800'], // 95% of requests should be below 800ms

    'failed_login_rate': ['rate<0.05'],
    'playlist_creation_success_rate': ['rate>0.95'],
    'playlist_update_success_rate': ['rate>0.95'],
    'playlist_deletion_success_rate': ['rate>0.95'],
    'add_track_success_rate': ['rate>0.95'],
    'remove_track_success_rate': ['rate>0.95'],
    'reorder_tracks_success_rate': ['rate>0.95'],

    'create_playlist_duration': ['p(95)<600'],
    'get_playlist_by_id_duration': ['p(95)<500'],
    'update_playlist_duration': ['p(95)<600'],
    'add_track_to_playlist_duration': ['p(95)<550'],
    'remove_track_from_playlist_duration': ['p(95)<550'],
    'reorder_tracks_duration': ['p(95)<600'],
    'delete_playlist_duration': ['p(95)<500'],
  },
};

// Test users - ensure these users exist in your database
const users = new SharedArray('users', function () {
  return [
    { email: 'kiet@soundwave.com', password: '123456' },
    { email: 'aditya.braun92_M15@soundwave-request.com', password: '123456' },
    { email: 'shayda@soundwave.com', password: '123456' },
  ];
});

// Sample track IDs - ensure these tracks exist in your database
const sampleTrackIds = new SharedArray('sampleTrackIds', function () {
  // Replace with actual track IDs from your database
  return [
    "cmah643jw00kwubyws125ougq", // Example track ID 1
    "cmah646sh00tjubywlyrx3gaq", // Example track ID 2
    "cmah650tk01kcubjkyu0jzy28", // Example track ID 3
  ];
});


export default function () {
  const user = users[__VU % users.length];
  let authToken = '';
  let playlistId = '';
  const playlistName = `K6 Test Playlist VU${__VU} Iter${__ITER}`;
  const updatedPlaylistName = `K6 Updated Playlist VU${__VU} Iter${__ITER}`;

  // 1. User Login
  group('User Authentication', function () {
    const loginPayload = JSON.stringify({
      emailOrUsername: user.email,
      password: user.password,
    });
    const loginParams = {
      headers: { 'Content-Type': 'application/json' },
    };
    const loginRes = http.post(`${BASE_URL}/auth/login`, loginPayload, loginParams);
    const loginCheck = check(loginRes, {
      'login successful': (r) => r.status === 200,
      'auth token received': (r) => r.json('token') !== null,
    });

    if (!loginCheck) {
      failedLoginRate.add(1);
      console.error(`Login failed for ${user.email}: ${loginRes.status} ${loginRes.body}`);
      return; // Stop test for this VU if login fails
    }
    failedLoginRate.add(0);
    successfulRequests.add(1);
    authToken = loginRes.json('token');
  });

  if (!authToken) {
    return; // Cannot proceed without auth token
  }

  const authHeaders = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`,
    },
  };

  // 2. Create Playlist
  group('Create Playlist', function () {
    const createPayload = JSON.stringify({
      name: playlistName,
      description: 'A playlist created by K6 load test',
      privacy: 'PRIVATE', // or 'PUBLIC'
    });
    const res = http.post(`${BASE_URL}/playlists`, createPayload, authHeaders);
    const createCheck = check(res, {
      'playlist created successfully': (r) => r.status === 201,
      'playlist ID received': (r) => r.json('data.id') !== null,
    });
    createPlaylistDuration.add(res.timings.duration);
    playlistCreationSuccessRate.add(createCheck);
    if (createCheck) {
      playlistId = res.json('data.id');
      successfulRequests.add(1);
    } else {
      console.error(`Failed to create playlist: ${res.status} ${res.body}`);
    }
  });

  if (!playlistId) {
    console.error('Playlist ID not obtained, skipping further playlist operations.');
    return;
  }
  sleep(1); // Brief pause

  // 3. Get Playlist by ID
  group('Get Playlist by ID', function () {
    const res = http.get(`${BASE_URL}/playlists/${playlistId}`, authHeaders);
    const getCheck = check(res, {
      'get playlist successful': (r) => r.status === 200,
      'playlist data is correct': (r) => r.json('data.name') === playlistName,
    });
    getPlaylistByIdDuration.add(res.timings.duration);
    if(getCheck) successfulRequests.add(1);
  });
  sleep(1);

  // 4. Update Playlist
  group('Update Playlist', function () {
    const updatePayload = JSON.stringify({
      name: updatedPlaylistName,
      description: 'Updated description by K6',
      privacy: 'PUBLIC',
    });
    const res = http.patch(`${BASE_URL}/playlists/${playlistId}`, updatePayload, authHeaders);
    const updateCheck = check(res, {
      'playlist updated successfully': (r) => r.status === 200,
      'playlist name updated': (r) => r.json('data.name') === updatedPlaylistName,
    });
    updatePlaylistDuration.add(res.timings.duration);
    playlistUpdateSuccessRate.add(updateCheck);
    if(updateCheck) successfulRequests.add(1);
  });
  sleep(1);

  // 5. Add Tracks to Playlist
  let tracksInPlaylist = [];
  group('Add Tracks to Playlist', function () {
    if (sampleTrackIds.length > 0) {
      const trackId1 = sampleTrackIds[0];
      const trackId2 = sampleTrackIds.length > 1 ? sampleTrackIds[1] : sampleTrackIds[0]; // Use second track if available

      const addTrackPayload1 = JSON.stringify({ trackId: trackId1 });
      const res1 = http.post(`${BASE_URL}/playlists/${playlistId}/tracks`, addTrackPayload1, authHeaders);
      const addCheck1 = check(res1, {
        'track 1 added successfully': (r) => r.status === 200,
      });
      addTrackToPlaylistDuration.add(res1.timings.duration);
      addTrackSuccessRate.add(addCheck1);
      if (addCheck1) {
        tracksInPlaylist.push(trackId1);
        successfulRequests.add(1);
      } else {
        console.error(`Failed to add track ${trackId1}: ${res1.status} ${res1.body}`);
      }
      sleep(0.5);

      const addTrackPayload2 = JSON.stringify({ trackId: trackId2 });
      const res2 = http.post(`${BASE_URL}/playlists/${playlistId}/tracks`, addTrackPayload2, authHeaders);
      const addCheck2 = check(res2, {
        'track 2 added successfully': (r) => r.status === 200,
      });
      addTrackToPlaylistDuration.add(res2.timings.duration);
      addTrackSuccessRate.add(addCheck2);
      if (addCheck2) {
        tracksInPlaylist.push(trackId2);
        successfulRequests.add(1);
      } else {
         console.error(`Failed to add track ${trackId2}: ${res2.status} ${res2.body}`);
      }
    } else {
      console.warn("No sample track IDs provided to add to playlist.");
    }
  });
  sleep(1);

  // 6. Reorder Tracks in Playlist
  if (tracksInPlaylist.length > 1) {
    group('Reorder Tracks', function () {
      const reorderedTrackIds = [...tracksInPlaylist].reverse(); // Simple reverse order
      const reorderPayload = JSON.stringify({ trackIds: reorderedTrackIds });
      const res = http.patch(`${BASE_URL}/playlists/${playlistId}/reorder`, reorderPayload, authHeaders);
      const reorderCheck = check(res, {
        'tracks reordered successfully': (r) => r.status === 200,
      });
      reorderTracksDuration.add(res.timings.duration);
      reorderTracksSuccessRate.add(reorderCheck);
      if(reorderCheck) successfulRequests.add(1);
    });
    sleep(1);
  }


  // 7. Remove Track from Playlist
  if (tracksInPlaylist.length > 0) {
    group('Remove Track from Playlist', function () {
      const trackToRemove = tracksInPlaylist[0];
      const res = http.del(`${BASE_URL}/playlists/${playlistId}/tracks/${trackToRemove}`, null, authHeaders);
      const removeCheck = check(res, {
        'track removed successfully': (r) => r.status === 200,
      });
      removeTrackFromPlaylistDuration.add(res.timings.duration);
      removeTrackSuccessRate.add(removeCheck);
      if(removeCheck) successfulRequests.add(1);
    });
    sleep(1);
  }

  // 8. Delete Playlist
  group('Delete Playlist', function () {
    const res = http.del(`${BASE_URL}/playlists/${playlistId}`, null, authHeaders);
    const deleteCheck = check(res, {
      'playlist deleted successfully': (r) => r.status === 200,
    });
    deletePlaylistDuration.add(res.timings.duration);
    playlistDeletionSuccessRate.add(deleteCheck);
    if(deleteCheck) successfulRequests.add(1);
  });
  sleep(1);

  // 9. (Optional) User Logout
  group('User Logout', function () {
    const logoutRes = http.post(`${BASE_URL}/auth/logout`, null, authHeaders);
    check(logoutRes, {
      'logout successful': (r) => r.status === 200,
    });
    successfulRequests.add(1);
  });
} 