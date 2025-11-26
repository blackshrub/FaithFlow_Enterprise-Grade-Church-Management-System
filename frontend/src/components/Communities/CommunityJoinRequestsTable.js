/**
 * Community Join Requests Table
 *
 * Wrapper around JoinRequestsTable for community terminology.
 */
import { JoinRequestsTable } from '../Groups/JoinRequestsTable';

export const CommunityJoinRequestsTable = (props) => {
  return <JoinRequestsTable {...props} />;
};
