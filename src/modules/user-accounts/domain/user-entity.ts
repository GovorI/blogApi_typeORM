export class UserEntity {
  id: string;
  login: string;
  email: string;
  passwordHash: string;
  isEmailConfirmed: boolean;
  confirmCode: string | null;
  expirationCode: Date | null;
  passwordRecoveryCode: string | null;
  passwordRecoveryExpiration: Date | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;

  constructor(data: Partial<UserEntity> = {}) {
    Object.assign(this, data);

    this.isEmailConfirmed = this.isEmailConfirmed ?? false;
    this.confirmCode = this.confirmCode ?? null;
    this.expirationCode = this.expirationCode ?? null;
    this.passwordRecoveryCode = this.passwordRecoveryCode ?? null;
    this.passwordRecoveryExpiration = this.passwordRecoveryExpiration ?? null;
    this.deletedAt = this.deletedAt ?? null;
  }

  makeDeleted(): void {
    if (this.deletedAt !== null) {
      throw new Error('Entity already deleted');
    }
    this.deletedAt = new Date();
  }
}
