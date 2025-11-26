/**
 * Community Cover Image Uploader
 *
 * Wrapper around CoverImageUploader for community terminology.
 */
import { CoverImageUploader } from '../Groups/CoverImageUploader';

export const CommunityCoverUploader = ({ community, ...props }) => {
  // Map 'community' prop to 'group' prop for CoverImageUploader
  return <CoverImageUploader group={community} {...props} />;
};
