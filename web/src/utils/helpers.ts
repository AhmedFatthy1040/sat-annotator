/**
 * Generate a unique ID for annotations
 */
export const generateUniqueId = (): string => {
  return `annot_${Math.random().toString(36).substring(2, 9)}_${Date.now()}`;
};
