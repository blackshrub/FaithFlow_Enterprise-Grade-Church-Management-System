/**
 * Community Table Component
 *
 * Wrapper around GroupTable for community terminology.
 * Re-uses the existing GroupTable implementation.
 */
import { GroupTable } from '../Groups/GroupTable';

export const CommunityTable = ({ communities, ...props }) => {
  // Map 'communities' prop to 'groups' prop for GroupTable
  return <GroupTable groups={communities} {...props} />;
};
