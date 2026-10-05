import { api } from './client';
import type { ScoreWithBeatmap } from './scores';

export type UploadStatus = 'pending' | 'accepted' | 'rejected';

export interface UploadRequest {
  id: number;
  user: { id: number; username: string; country: string };
  score_id: number;
  // Null once the score is gone, for example after a wipe.
  score: ScoreWithBeatmap | null;
  skin: string;
  reason: string;
  status: UploadStatus;
  created_at: number;
  up: number;
  down: number;
  // The viewer's own vote: 1, -1, or 0 for none.
  mine: -1 | 0 | 1;
}

export const uploadRequests = (status: UploadStatus, page: number, signal?: AbortSignal) =>
  api.get<{ pages: number; requests: UploadRequest[] }>(
    '/upload-requests/',
    { status, page },
    signal
  );

export const sendUploadRequest = (body: { score_id: number; skin: string; reason: string }) =>
  api.post('/upload-requests/', body);

export const voteUploadRequest = (id: number, vote: -1 | 0 | 1) =>
  api.put<Pick<UploadRequest, 'up' | 'down' | 'mine'>>(`/upload-requests/${id}/vote`, { vote });

export const withdrawUploadRequest = (id: number) => api.delete(`/upload-requests/${id}`);

export const reviewUploadRequest = (id: number, status: UploadStatus) =>
  api.put(`/upload-requests/${id}/status`, { status });
