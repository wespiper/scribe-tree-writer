import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Container } from '@/components/Layout';
import { Button } from '@/components/Common/Button';
import { AnalyticsOverview } from '@/components/Analytics';

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false);

  const handleCreateDocument = async () => {
    setCreating(true);
    try {
      const response = await fetch('/api/documents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('authToken')}`,
        },
        body: JSON.stringify({
          title: 'Untitled Document',
          content: '',
        }),
      });

      if (response.ok) {
        const document = await response.json();
        navigate(`/write/${document.id}`);
      }
    } catch (error) {
      console.error('Failed to create document:', error);
    } finally {
      setCreating(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <Container className="min-h-screen py-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
            <p className="text-gray-600">Welcome back, {user?.email}</p>
          </div>
          <Button onClick={handleLogout} variant="secondary">
            Log Out
          </Button>
        </div>

        <div className="mb-8">
          <Button
            onClick={handleCreateDocument}
            disabled={creating}
            className="flex items-center gap-2"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path d="M12 4v16m8-8H4"></path>
            </svg>
            New Document
          </Button>
        </div>

        <section className="mb-12">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">Learning Analytics</h2>
            <Link
              to="/analytics"
              className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              View All Analytics →
            </Link>
          </div>
          <AnalyticsOverview />
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-4">Recent Documents</h2>
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-8 text-center">
            <p className="text-gray-500 dark:text-gray-400 mb-2">
              No documents yet
            </p>
            <p className="text-sm text-gray-400 dark:text-gray-500">
              Create your first document to get started
            </p>
          </div>
        </section>
      </div>
    </Container>
  );
}
