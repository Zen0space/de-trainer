export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-blue-50 via-white to-purple-50 p-4">
      <div className="text-center max-w-2xl">
        {/* Logo */}
        <div className="w-24 h-24 mx-auto mb-8 rounded-3xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-xl">
          <span className="text-white text-3xl font-bold">JA</span>
        </div>
        
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
          JejakAthlete
        </h1>
        
        <p className="text-lg text-gray-600 mb-8">
          Track your fitness journey, connect with trainers, and achieve your athletic goals.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a
            href="/auth/login"
            className="px-8 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-xl hover:opacity-90 transition shadow-lg"
          >
            Sign In
          </a>
          <a
            href="/auth/register"
            className="px-8 py-3 bg-white text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition shadow-lg border border-gray-200"
          >
            Create Account
          </a>
        </div>
      </div>
    </div>
  );
}
