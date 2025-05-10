import Link from 'next/link';

export default function ChooseArtistActionPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-black via-slate-900 to-neutral-900 text-white p-8">
      <div className="text-center mb-16">
        <h1 className="text-5xl md:text-6xl font-extrabold mb-6 tracking-tight">
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-pink-500 to-red-500">
            Soundwave for Artists
          </span>
        </h1>
        <p className="text-xl md:text-2xl text-gray-300 mb-2">Welcome! Let's get you set up.</p>
        <p className="text-md md:text-lg text-gray-400">First, tell us who you are.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-10 w-full max-w-md md:max-w-5xl">
        {/* Artist or Manager Box */}
        <Link
          href="/claim-artist"
          className="flex-1 bg-neutral-800/70 border border-neutral-700 rounded-xl p-6 md:p-8 hover:bg-neutral-700/80 hover:border-purple-500/70 transform hover:scale-105 transition-all duration-300 flex flex-col items-center text-center shadow-xl hover:shadow-purple-500/30"
        >
          <div className="w-32 h-32 md:w-40 md:h-40 bg-gradient-to-br from-purple-600 to-pink-500 rounded-full mb-6 md:mb-8 flex items-center justify-center text-white shadow-lg">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-16 h-16 md:w-20 md:h-20">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
            </svg>
          </div>
          <h2 className="text-xl md:text-2xl font-semibold mb-2">Claim Existing Profile</h2>
          <p className="text-pink-200 text-sm italic px-3">For artists who have appeared on Soundwave.</p>
        </Link>

        {/* Label Team Member Box */}
        <Link
          href="/request-artist"
          className="flex-1 bg-neutral-800/70 border border-neutral-700 rounded-xl p-6 md:p-8 hover:bg-neutral-700/80 hover:border-green-500/70 transform hover:scale-105 transition-all duration-300 flex flex-col items-center text-center shadow-xl hover:shadow-green-500/30"
        >
          <div className="w-32 h-32 md:w-40 md:h-40 bg-gradient-to-br from-green-500 to-emerald-400 rounded-full mb-6 md:mb-8 flex items-center justify-center text-white shadow-lg">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-16 h-16 md:w-20 md:h-20">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M18 8h4M20 6v4" />
            </svg>
          </div>
          <h2 className="text-xl md:text-2xl font-semibold mb-2">Become a New Artist</h2>
          <p className="text-green-200 text-sm italic px-3">For new artists join Soundwave.</p>
        </Link>
      </div>
    </div>
  );
} 