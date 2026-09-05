export interface Item {
  id: string;
  name: string;
  description: string;
  price: number;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ItemRow {
  id: string;
  name: string;
  description: string;
  price: string;
  user_id: string;
  created_at: Date;
  updated_at: Date;
}
