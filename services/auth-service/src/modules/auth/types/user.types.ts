import { UserRole, ClientType } from "../schemas/auth.schema.js";

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  passwordHash: string;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserRow {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  password_hash: string;
  role: UserRole;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface CreateSessionInput {
  userId: string;
  clientType: ClientType;
  deviceId?: string;
}

export interface UserProfileResponse {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  createdAt: Date;
}

export interface RegisterResponseData {
  user: UserProfileResponse;
}

export interface LoginResponseData {
  accessToken: string;
  expiresIn: number;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: UserRole;
  };
}

export interface RefreshResponseData {
  accessToken: string;
  expiresIn: number;
}

export interface MeResponseData {
  user: {
    id: string;
    role: string;
  } | undefined;
}
