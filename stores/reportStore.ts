import { create } from 'zustand';
import { submitCommunityReport, uploadReportImage } from '@/services/reportService';
import type { ReportCategory, ReportDraft, UploadStage } from '@/types/tabs';

const initialDraft: ReportDraft = {
  category: null,
  description: '',
  areaName: '',
  city: '',
  imageUri: null,
};

type ReportStore = {
  draft: ReportDraft;
  stage: UploadStage;
  progress: number;
  error: string | null;
  submitting: boolean;
  setCategory: (category: ReportCategory) => void;
  setField: <K extends keyof ReportDraft>(key: K, value: ReportDraft[K]) => void;
  setImage: (image: { uri: string; mimeType?: string; fileName?: string }) => void;
  reset: () => void;
  validate: () => string | null;
  submit: () => Promise<boolean>;
};

export const useReportStore = create<ReportStore>((set, get) => ({
  draft: initialDraft,
  stage: 'idle',
  progress: 0,
  error: null,
  submitting: false,
  setCategory: (category) => set((state) => ({ draft: { ...state.draft, category }, error: null })),
  setField: (key, value) => set((state) => ({ draft: { ...state.draft, [key]: value }, error: null })),
  setImage: (image) =>
    set((state) => ({
      draft: {
        ...state.draft,
        imageUri: image.uri,
        imageMimeType: image.mimeType,
        imageName: image.fileName,
      },
      error: null,
    })),
  reset: () => set({ draft: initialDraft, stage: 'idle', progress: 0, error: null, submitting: false }),
  validate: () => {
    const { draft } = get();
    if (!draft.category) return 'Please select a report type.';
    if (!draft.imageUri) return 'Please add a photo.';
    if (!draft.city.trim()) return 'Please enter a city.';
    if (!draft.areaName.trim()) return 'Please enter an area name.';
    if (!draft.description.trim() || draft.description.trim().length < 10) {
      return 'Please add a short description with at least 10 characters.';
    }
    return null;
  },
  submit: async () => {
    const validationError = get().validate();
    if (validationError) {
      set({ error: validationError });
      return false;
    }

    if (get().submitting) return false;

    set({ submitting: true, stage: 'uploading', progress: 0, error: null });
    try {
      const imageUrl = await uploadReportImage(get().draft, (progress) => set({ progress }));
      set({ stage: 'submitting', progress: 1 });
      await submitCommunityReport(get().draft, imageUrl);
      set({ stage: 'success' });
      get().reset();
      return true;
    } catch (error: any) {
      set({ error: error.message || 'Could not submit report.', stage: 'idle' });
      return false;
    } finally {
      set({ submitting: false });
    }
  },
}));
