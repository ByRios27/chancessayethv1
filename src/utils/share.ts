import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

export function downloadDataUrlFile(dataUrl: string, fileName: string) {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = fileName;
  link.click();
}

export async function shareImageDataUrl({
  dataUrl,
  fileName,
  title,
  text,
  dialogTitle
}: {
  dataUrl: string;
  fileName: string;
  title: string;
  text: string;
  dialogTitle: string;
}) {
  let shared = false;

  if (Capacitor.isNativePlatform()) {
    try {
      const imageBase64 = dataUrl.split(',')[1];
      const savedFile = await Filesystem.writeFile({
        path: fileName,
        data: imageBase64,
        directory: Directory.Cache
      });

      try {
        await Share.share({
          title,
          text,
          files: [savedFile.uri],
          dialogTitle
        });
        shared = true;
      } catch (shareWithFilesErr) {
        console.warn('Native share with files failed, trying url fallback', shareWithFilesErr);
        await Share.share({
          title,
          text,
          url: savedFile.uri,
          dialogTitle
        });
        shared = true;
      }
    } catch (nativeErr) {
      console.warn('Native image share unavailable', nativeErr);
    }
  }

  if (!shared && typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      const mimeType = blob.type || (fileName.toLowerCase().endsWith('.jpg') || fileName.toLowerCase().endsWith('.jpeg') ? 'image/jpeg' : 'image/png');
      const extension = mimeType === 'image/jpeg' ? 'jpg' : 'png';
      const normalizedName = fileName.toLowerCase().endsWith(`.${extension}`) ? fileName : `${fileName}.${extension}`;
      const file = new File([blob], normalizedName, { type: mimeType });
      const payload = { title, text, files: [file] };

      if (!navigator.canShare || navigator.canShare(payload)) {
        await navigator.share(payload);
        shared = true;
      }
    } catch (webErr) {
      console.warn('Web share with files unavailable', webErr);
    }
  }

  return shared;
}
