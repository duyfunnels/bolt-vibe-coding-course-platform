export type Course = {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  thumbnail_url: string;
  price: number;
  currency: string;
  payment_mode: 'sepay' | 'manual';
  published: boolean;
  created_at: string;
};

export type Module = {
  id: string;
  course_id: string;
  title: string;
  position: number;
};

export type Lesson = {
  id: string;
  module_id: string;
  title: string;
  position: number;
  video_provider: 'youtube' | 'vimeo' | 'gumlet' | 'iframe';
  video_url: string;
  content: string;
  duration_seconds: number;
  is_preview: boolean;
};

export type Order = {
  id: string;
  order_id: string;
  user_id: string | null;
  email: string;
  customer_name: string;
  phone: string;
  course_id: string | null;
  order_amount: number;
  total_money_in: number;
  remain_money: number;
  status: 'pending' | 'paid' | 'failed' | 'cancelled';
  payment_mode: string;
  created_at: string;
  paid_at: string | null;
};

export type BankTransaction = {
  id: string;
  order_id: string | null;
  bank_ref: string | null;
  money_in: number;
  content: string;
  transfer_time: string;
  source: string;
  raw: any;
  created_at: string;
};

export type Profile = {
  id: string;
  email: string;
  full_name: string;
  role: 'user' | 'admin';
};

export type PaymentConfig = {
  sepay_api_key: string;
  sepay_webhook_secret: string;
  bank_id: string;
  bank_name: string;
  account_number: string;
  account_name: string;
  transfer_prefix: string;
};
