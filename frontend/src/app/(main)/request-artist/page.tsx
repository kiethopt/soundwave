'use client';

import { useState, useEffect } from 'react';
import { api } from '@/utils/api';
import { useRouter } from 'next/navigation';
import { SearchableSelect } from '@/components/ui/SearchableSelect';

export default function RequestArtistPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasRequested, setHasRequested] = useState(false);
  const [artistName, setArtistName] = useState('');
  const [bio, setBio] = useState('');
  const [facebookLink, setFacebookLink] = useState('');
  const [twitterLink, setTwitterLink] = useState('');
  const [instagramLink, setInstagramLink] = useState('');
  const [genres, setGenres] = useState<string[]>([]);
  const [avatar, setAvatar] = useState<File | null>(null);
  const [genreOptions, setGenreOptions] = useState<
    { id: string; name: string }[]
  >([]);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('userToken');
    const userData = localStorage.getItem('userData');

    if (!token || !userData) {
      router.push('/login');
      return;
    }

    const user = JSON.parse(userData);
    if (user.verificationRequestedAt) {
      setHasRequested(true);
    }

    const fetchGenres = async () => {
      try {
        const response = await api.user.getAllGenres();
        setGenreOptions(response);
      } catch (err) {
        console.error('Error fetching genres:', err);
        setError('Failed to load genres');
      }
    };

    fetchGenres();
  }, [router]);

  const handleRequest = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('userToken');
      if (!token) {
        throw new Error('No authentication token found');
      }

      // Tạo đối tượng socialMediaLinks từ các link nhập vào
      const socialMediaLinks = {
        facebook: facebookLink,
        twitter: twitterLink,
        instagram: instagramLink,
      };

      // Tạo FormData để gửi file và các trường dữ liệu khác
      const formData = new FormData();
      formData.append('artistName', artistName);
      formData.append('bio', bio);
      formData.append('socialMediaLinks', JSON.stringify(socialMediaLinks));
      formData.append('genres', genres.join(','));
      if (avatar) {
        formData.append('avatar', avatar);
      }

      // Gửi yêu cầu trở thành artist
      const response = await api.user.requestArtistRole(token, formData);

      if (response.message) {
        setHasRequested(true);
        alert(response.message);
      } else {
        throw new Error('No response message from server');
      }
    } catch (err) {
      console.error('Error requesting artist role:', err);
      setError(err instanceof Error ? err.message : 'Failed to submit request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Request to Become an Artist</h1>
      {error && <p className="text-red-500 mb-4">{error}</p>}
      {hasRequested ? (
        <p className="text-green-500 mb-4">
          You have already submitted a request to become an artist.
        </p>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-white">
              Artist Name
            </label>
            <input
              type="text"
              value={artistName}
              onChange={(e) => setArtistName(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-black"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-white">Bio</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-black"
              rows={4}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-white">
              Facebook Link
            </label>
            <input
              type="text"
              value={facebookLink}
              onChange={(e) => setFacebookLink(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-black"
              placeholder="https://www.facebook.com/yourprofile"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-white">
              Twitter Link
            </label>
            <input
              type="text"
              value={twitterLink}
              onChange={(e) => setTwitterLink(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-black"
              placeholder="https://twitter.com/yourprofile"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-white">
              Instagram Link
            </label>
            <input
              type="text"
              value={instagramLink}
              onChange={(e) => setInstagramLink(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-black"
              placeholder="https://www.instagram.com/yourprofile"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-white">
              Genres
            </label>
            <SearchableSelect
              options={genreOptions}
              value={genres}
              onChange={(selected) =>
                setGenres(Array.isArray(selected) ? selected : [selected])
              }
              placeholder="Select genres"
              multiple={true}
              required={true}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-white">
              Avatar
            </label>
            <input
              type="file"
              onChange={(e) =>
                setAvatar(e.target.files ? e.target.files[0] : null)
              }
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-white"
              required
            />
          </div>
          <button
            onClick={handleRequest}
            disabled={loading}
            className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 disabled:opacity-50"
          >
            {loading ? 'Submitting...' : 'Submit Request'}
          </button>
        </div>
      )}
    </div>
  );
}
