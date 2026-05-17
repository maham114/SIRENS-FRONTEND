import { createReportFn, getUploadUrlFn } from '@/lib/firebase';
import type { ReportDraft } from '@/types/tabs';

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

  onProgress?.(0.08);
  const getUploadUrl = getUploadUrlFn();
  const uploadResult = await getUploadUrl({
    contentType: draft.imageMimeType ?? 'image/jpeg',
    fileName: draft.imageName ?? `report-${Date.now()}.jpg`,
  });
  const uploadData = uploadResult.data as UploadUrlResponse;
  const uploadUrl = uploadData.uploadUrl;
  const imageUrl = uploadData.imageUrl ?? uploadData.publicUrl ?? uploadData.fileUrl;

  if (!uploadUrl || !imageUrl) {
    throw new Error('Could not prepare image upload.');
  }

  onProgress?.(0.18);
  const blob = await (await fetch(draft.imageUri)).blob();
  onProgress?.(0.35);

  const response = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': draft.imageMimeType ?? 'image/jpeg' },
    body: blob,
  });

  if (!response.ok) {
    throw new Error('Image upload failed.');
  }

  onProgress?.(1);
  return imageUrl;
}

export async function submitCommunityReport(draft: ReportDraft, imageUrl: string): Promise<void> {
  if (!draft.category) {
    throw new Error('Please select a report type.');
  }

  const createReport = createReportFn();
  await createReport({
    category: draft.category,
    description: draft.description.trim(),
    areaName: draft.areaName.trim(),
    city: draft.city.trim(),
    imageUrl,
  });
}
