import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

export const api = axios.create({
  baseURL: API_URL,
  timeout: 120000,
  maxBodyLength: 50 * 1024 * 1024,
  maxContentLength: 50 * 1024 * 1024,
});

export interface Component {
  id: string;
  type: string;
  label: string;
  bbox: number[];
  polygon: number[][];
  area_pixels: number;
  confidence: number;
  mask_base64?: string;
}

export interface Session {
  session_id: string;
  created_at: string;
  step: string;
  original_image_base64?: string;
  image_width?: number;
  image_height?: number;
  components: Component[];
  materials: Record<string, any>;
  visualization_base64?: string;
  estimate?: any;
}
