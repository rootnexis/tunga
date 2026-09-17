export interface ProductSummary {
  id: string;
  name: string;
  slug: string;
  base_price: number;
  sale_price?: number | null;
  currency: string;
  image_url?: string;
  category?: string;
  average_rating?: number;
  short_description?: string;
}

export interface OrderSummary {
  id: string;
  order_number: string;
  status: string;
  total: number;
  currency: string;
  created_at: string;
  item_count?: number;
  items_summary?: string[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  products?: ProductSummary[];
  orders?: OrderSummary[];
}
