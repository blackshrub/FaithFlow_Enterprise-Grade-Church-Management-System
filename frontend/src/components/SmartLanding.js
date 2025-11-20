/**
 * Smart Landing Page
 * 
 * - If logged in → Redirect to /dashboard
 * - If not logged in → Show Church Selector
 */

import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ChurchSelector from './Kiosk/ChurchSelector';

const SmartLanding = () => {
  const { user } = useAuth();
  
  // If user is logged in, redirect to dashboard
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }
  
  // Otherwise show church selector
  return <ChurchSelector />;
};

export default SmartLanding;
