import Link from 'next/link';

export default function ChooseArtistActionPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-[#2c2c2c] to-[#121212] text-white">
      <h1 className="text-3xl font-bold mb-8">Become an Artist</h1>
      <div className="flex flex-col md:flex-row gap-8">
        <Link href="/claim-artist" className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-6 rounded-lg shadow-lg text-xl font-semibold transition-colors duration-200 text-center">
          Claim an Existing Artist Profile
        </Link>
        <Link href="/request-artist" className="bg-green-600 hover:bg-green-700 text-white px-8 py-6 rounded-lg shadow-lg text-xl font-semibold transition-colors duration-200 text-center">
          Request to Become a New Artist
        </Link>
      </div>
    </div>
  );
} 