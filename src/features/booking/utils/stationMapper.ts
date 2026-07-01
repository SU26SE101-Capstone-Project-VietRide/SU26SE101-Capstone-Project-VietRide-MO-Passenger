export const MOCK_STATIONS: Record<string, string> = {
  'Sài Gòn': '3fa85f64-5717-4562-b3fc-2c963f66afa6',
  'Đà Lạt': '3fa85f64-5717-4562-b3fc-2c963f66afa7',
  'Nha Trang': '3fa85f64-5717-4562-b3fc-2c963f66afa8',
};

export function getMockStationId(city: string, fallback: string): string {
  return MOCK_STATIONS[city] || fallback;
}
