export interface IBrokerService {
  connect(userId: string, data?: any): Promise<{ redirectUrl?: string; status: string }>;
  getStatus(userId: string): Promise<{ connected: boolean; lastSyncedAt?: Date; metadata?: any }>;
  syncHoldings(userId: string): Promise<{ syncedCount: number; holdings: any[] }>;
  disconnect(userId: string): Promise<void>;
}
