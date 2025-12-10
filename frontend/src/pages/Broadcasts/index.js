import { Navigate } from 'react-router-dom';

export default function BroadcastsIndex() {
  return <Navigate to="/broadcasts" replace />;
}

export { default as BroadcastsList } from './BroadcastsList';
export { default as BroadcastEditor } from './BroadcastEditor';
