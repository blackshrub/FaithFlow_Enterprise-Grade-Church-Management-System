/**
 * Community Leave Requests Table
 *
 * Wrapper around LeaveRequestsTable for community terminology.
 */
import { LeaveRequestsTable } from '../Groups/LeaveRequestsTable';

export const CommunityLeaveRequestsTable = (props) => {
  return <LeaveRequestsTable {...props} />;
};
