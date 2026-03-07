import { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { Stages } from './components/Stages';
import { Labor } from './components/Labor';
import { Materials } from './components/Materials';
import { Gantt } from './components/Gantt';
import { CreditCards } from './components/CreditCards';
import { Payments } from './components/Payments';
import { MonthlySummary } from './components/MonthlySummary';
import { Auth } from './components/Auth';
import { Planning } from './components/Planning';
import { supabase } from './lib/supabase';
import { Session } from '@supabase/supabase-js';
import { useStore } from './store';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const { fetchInitialData } = useStore();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
      if (session) {
        fetchInitialData();
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        fetchInitialData();
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchInitialData]);

  const renderContent = () => {
    // ... (rest of the component)
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'stages':
        return <Stages />;
      case 'labor':
        return <Labor />;
      case 'materials':
        return <Materials />;
      case 'credit-cards':
        return <CreditCards />;
      case 'payments':
        return <Payments />;
      case 'monthly-summary':
        return <MonthlySummary />;
      case 'gantt':
        return <Gantt />;
      case 'planning':
        return <Planning />;
      default:
        return <Dashboard />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-stone-900"></div>
      </div>
    );
  }

  if (!session) {
    return <Auth />;
  }

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
      {renderContent()}
    </Layout>
  );
}
