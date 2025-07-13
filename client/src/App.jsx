import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Helmet } from 'react-helmet';

// Import components
import Navbar from './components/Navbar';
import Home from './pages/Home';
import PrintJob from './pages/PrintJob';
import ThankYou from './pages/ThankYou';
import Tracking from './pages/Tracking';
import Admin from './pages/Admin';
import AdminLogin from './pages/AdminLogin';
import NotFound from './pages/NotFound';

// Import contexts
import { useAuth } from './context/AuthContext';

function App() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="App">
      <Helmet>
        <title>Print Repository System</title>
        <meta name="description" content="Efficient printing management for educational institutions" />
      </Helmet>
      
      <Navbar />
      
      <main className="container-fluid p-0">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/print-job" element={<PrintJob />} />
          <Route path="/thank-you" element={<ThankYou />} />
          <Route path="/tracking" element={<Tracking />} />
          <Route 
            path="/admin" 
            element={
              isAuthenticated ? <Admin /> : <AdminLogin />
            } 
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
    </div>
  );
}

export default App; 