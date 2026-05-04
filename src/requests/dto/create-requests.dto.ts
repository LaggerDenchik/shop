export enum ConfirmedStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

export class CreateRequestDto {
  orderId?: number;
  orgId?: string;
  userId?: string;
  user_confirmed?: ConfirmedStatus;
  org_confirmed?: ConfirmedStatus;
  cause?: string;

  // user_id и created_by берем из токена
}