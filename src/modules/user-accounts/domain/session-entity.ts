export class SessionEntity {
  id: string;
  userId: string;
  deviceId: string;
  deviceName: string;
  ip: string;
  iat: Date;
  exp: Date;
  createdAt: Date;
  updatedAt: Date;

  constructor(data: Partial<SessionEntity> = {}) {
    Object.assign(this, data);

    this.createdAt = this.createdAt ?? new Date();
    this.updatedAt = this.updatedAt ?? new Date();
  }

  updateDates(iat: number, exp: number): void {
    this.iat = new Date(iat * 1000);
    this.exp = new Date(exp * 1000);
    this.updatedAt = new Date();
  }

  // isExpired(): boolean {
  //   return this.exp.getTime() < Date.now();
  // }
  //
  // updateLastActiveDate(): void {
  //   this.updatedAt = new Date();
  // }
}
