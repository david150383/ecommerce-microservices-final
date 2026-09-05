import { UserRole, ClientType } from "../schemas/auth.schema.js";
export interface User {
  id: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  role: UserRole;
  created_at: Date;
  updated_at: Date;
}

export interface CreateSessionInput {
  userId: string;
  clientType: ClientType;
  deviceId?: string;
}
