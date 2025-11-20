/**
 * Smart Landing Page
 * 
 * - If logged in → Redirect to /dashboard
 * - If not logged in → Show Kiosk Home
 */

import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import KioskHome from '../pages/Kiosk/KioskHome';

const SmartLanding = () => {
  const { user } = useAuth();
  
  // If user is logged in, redirect to dashboard
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }
  
  // Otherwise show kiosk home
  return <KioskHome />;
};

export default SmartLanding;
