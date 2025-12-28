import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    try {
      const res = await api.post('/auth/login', { email, password });
      if (res.data && res.data.data) {
        // Response format: { status, message, data: { token, user } }
        const { token, user } = res.data.data;
        login(token, user);
        navigate('/');
      }
    } catch (err: any) {
        const msg = err.response?.data?.message || 'Login failed';
        setError(msg);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-neutral-800 p-8 rounded-lg shadow-xl border border-neutral-700">
        <div className="flex items-center gap-4 mb-8">
            <Link to="/" className="text-neutral-400 hover:text-white transition-colors">
                <ArrowLeft size={24} />
            </Link>
            <h2 className="text-2xl font-bold text-white">Login</h2>
        </div>

        {error && (
            <div className="bg-red-900/50 border border-red-700 text-red-200 p-3 rounded mb-4">
                {error}
            </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-neutral-900 border border-neutral-700 rounded p-2 text-white focus:ring-2 focus:ring-amber-500 outline-none"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-neutral-900 border border-neutral-700 rounded p-2 text-white focus:ring-2 focus:ring-amber-500 outline-none"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full bg-amber-600 hover:bg-amber-500 text-white font-bold py-2 rounded transition-colors"
          >
            Sign In
          </button>
        </form>
        <div className="mt-4 text-center text-neutral-400">
            Don't have an account? <Link to="/register" className="text-amber-500 hover:underline">Register</Link>
        </div>
      </div>
    </div>
  );
}
