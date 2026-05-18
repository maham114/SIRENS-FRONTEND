import { createReportFn, getUploadUrlFn, db } from '@/lib/firebase';
import type { ReportDraft } from '@/types/tabs';
import { doc, setDoc } from 'firebase/firestore';

type UploadUrlResponse = {
  uploadUrl?: string;
  imageUrl?: string;
  publicUrl?: string;
  fileUrl?: string;
  fields?: Record<string, string>;
};

export async function uploadReportImage(
  draft: ReportDraft,
  onProgress?: (progress: number) => void
): Promise<string> {
  if (!draft.imageUri) {
    throw new Error('Please add a photo before submitting.');
  }

  onProgress?.(0.2);
  const formData = new FormData();
  formData.append('reqtype', 'fileupload');
  formData.append('fileToUpload', {
    uri: draft.imageUri,
    type: draft.imageMimeType ?? 'image/jpeg',
    name: draft.imageName ?? `report-${Date.now()}.jpg`,
  } as any);

  onProgress?.(0.5);
  const response = await fetch('https://catbox.moe/user/api.php', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error('Image upload to hosting service failed.');
  }

  const imageUrl = await response.text();
  if (!imageUrl || !imageUrl.startsWith('http')) {
    throw new Error('Invalid image link returned from hosting service.');
  }

  onProgress?.(1.0);
  return imageUrl.trim();
}

export async function submitCommunityReport(draft: ReportDraft, imageUrl: string): Promise<string> {
  if (!draft.category) {
    throw new Error('Please select a report type.');
  }

  const createReport = createReportFn();
  const result = await createReport({
    category: draft.category,
    description: draft.description.trim(),
    areaName: draft.areaName.trim(),
    city: draft.city.trim(),
    imageUrl: imageUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=800',
    location: draft.coords
      ? {
          latitude: draft.coords.latitude,
          longitude: draft.coords.longitude,
        }
      : null,
  });

  const resData = result.data as { success?: boolean; reportId?: string };
  const reportId = resData.reportId;

  if (!reportId) {
    throw new Error('Failed to create report document on backend.');
  }

  // Merge custom title and severity directly in Firestore
  const reportDocRef = doc(db, 'reports', reportId);
  await setDoc(
    reportDocRef,
    {
      title: draft.title?.trim() ?? '',
      severity: draft.severity ?? 'medium',
    },
    { merge: true }
  );

  return reportId;
}
