import { siteApi } from './site';

export type UploadStatus = 'pending' | 'accepted' | 'rejected';

export interface UploadRequest {
  id: number;
  user: { id: number; username: string; country: string };
  replayUrl: string;
  mapUrl: string;
  skin: string;
  reason: string;
  status: UploadStatus;
  time: number;
  up: number;
  down: number;
  // The viewer's own vote: 1, -1, or 0 for none.
  mine: -1 | 0 | 1;
}

export const uploadRequests = (status: UploadStatus, page: number, signal?: AbortSignal) =>
  siteApi.get<{ pages: number; requests: UploadRequest[] }>(
    '/upload-requests',
    { status, page },
    signal
  );

export const sendUploadRequest = (body: {
  replayUrl: string;
  mapUrl: string;
  skin: string;
  reason: string;
}) => siteApi.post('/upload-requests', body);

export const voteUploadRequest = (id: number, vote: -1 | 0 | 1) =>
  siteApi.put<Pick<UploadRequest, 'up' | 'down' | 'mine'>>(`/upload-requests/${id}/vote`, { vote });

export const withdrawUploadRequest = (id: number) => siteApi.delete(`/upload-requests/${id}`);
