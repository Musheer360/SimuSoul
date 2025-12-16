import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Compresses an image data URI to reduce file size.
 * Scales the image to a max dimension of 1024px and converts to JPEG.
 * @param dataUri - The base64-encoded image data URI
 * @param quality - JPEG quality (0-1), defaults to 0.8
 * @returns Promise resolving to the compressed data URI
 */
export const compressImage = (dataUri: string, quality = 0.8): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      return resolve(dataUri);
    }
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const MAX_WIDTH = 1024;
      const MAX_HEIGHT = 1024;
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > MAX_WIDTH) {
          height *= MAX_WIDTH / width;
          width = MAX_WIDTH;
        }
      } else {
        if (height > MAX_HEIGHT) {
          width *= MAX_HEIGHT / height;
          height = MAX_HEIGHT;
        }
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        return reject(new Error('Could not get canvas context'));
      }
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = (err) => reject(err);
    img.src = dataUri;
  });
};
