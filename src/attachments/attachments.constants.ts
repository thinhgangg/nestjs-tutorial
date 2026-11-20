export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
];
export const MIME_TO_EXTENSION: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};
export const AVATAR_DIR = 'public/avatars';
export const AVATAR_URL_PREFIX = '/public/avatars';
export const ATTACHABLE_TYPE_USER = 'User';
