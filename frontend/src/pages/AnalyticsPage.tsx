import { Link } from 'react-router-dom';
import { Container } from '@/components/Layout';
import { AnalyticsOverview } from '@/components/Analytics';
import { Button } from '@/components/Common/Button';

export default function AnalyticsPage() {
  return (
    <Container className="min-h-screen py-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Link
                to="/dashboard"
                className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
              >
                ← Back to Dashboard
              </Link>
            </div>
            <h1 className="text-3xl font-bold mb-2">Learning Analytics</h1>
            <p className="text-gray-600 dark:text-gray-400">
              Track your writing progress and reflection quality over time
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={() => window.print()}
              className="flex items-center gap-2"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path>
              </svg>
              Print Report
            </Button>
          </div>
        </div>

        <AnalyticsOverview />

        <div className="mt-8 p-6 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">
            Pro Tip: Regular Reflection Improves Writing
          </h3>
          <p className="text-blue-800 dark:text-blue-200">
            Students who reflect before each writing session show 40% more
            improvement in their writing quality over time. Make reflection a
            habit!
          </p>
        </div>
      </div>
    </Container>
  );
}
