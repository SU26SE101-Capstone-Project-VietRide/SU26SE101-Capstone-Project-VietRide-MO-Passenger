# VietRide Goong Skills

Bộ skill/instruction dành cho AI coding agent khi phát triển hoặc migrate tính năng bản đồ của VietRide Passenger từ Google Maps/Places sang Goong.

## Mục tiêu

- Không để code mới phụ thuộc trực tiếp vào Google Maps Platform.
- Chuẩn hóa toàn bộ Goong REST API V2 qua một adapter/service layer.
- Giảm rủi ro đảo `lat/lng`.
- Có migration path an toàn cho codebase hiện tại đang có cả `react-native-maps` và `@rnmapbox/maps`.
- Không bắt agent thay renderer bản đồ một cách mù quáng.
- Tối ưu Autocomplete để tránh gọi API quá nhiều.
- Có checklist test cho booking, parcel, shuttle/address picker và live tracking.

## Cách dùng

### Cách 1 — một skill tổng
Đưa thư mục:

`skills/goong-vietride/`

vào nơi agent của bạn đọc skills, sau đó yêu cầu agent đọc `SKILL.md` trước khi sửa map.

### Cách 2 — skill theo nhiệm vụ
Các sub-skill nằm trong `skills/`:

- `goong-vietride`: router / rule tổng.
- `goong-migration`: migrate Google -> Goong.
- `goong-map-rendering`: map, marker, camera, GeoJSON.
- `goong-places`: Autocomplete, Place Detail, Geocode.
- `goong-routing`: Directions và route polyline.
- `goong-distance-matrix`: distance/ETA theo batch.
- `goong-security`: key, env, proxy.
- `goong-debugging`: lỗi map trắng, API, tọa độ, quota.

Agent chỉ nên đọc skill liên quan đến task hiện tại, không áp dụng toàn bộ bộ skill cho mọi thay đổi.

## Kiến trúc khuyến nghị cho VietRide

```text
Screen / Feature
      |
      v
Hooks / Domain use case
      |
      v
GoongProvider interface
      |
      +--------------------------+
      |                          |
      v                          v
REST adapter                 Map renderer
Goong V2 API                 Current renderer / MapLibre
      |
      v
BE proxy (preferred production)
```

### Quy tắc quan trọng

1. Domain dùng object:

```ts
type GeoPoint = {
  latitude: number;
  longitude: number;
};
```

2. Goong REST nhận:

```text
latitude,longitude
```

3. MapLibre / GeoJSON nhận:

```text
[longitude, latitude]
```

4. Không truyền tuple tọa độ trần xuyên suốt business logic.

5. `Maptiles Key` và `API Key` là hai loại key khác nhau.

6. V2 là default cho code mới.

7. Live GPS của VietRide vẫn là location/socket concern; Goong không thay Socket.IO.

## Tài liệu Goong chính thức dùng để xây bộ skill

- https://help.goong.io/
- https://help.goong.io/kb/rest-api-v2/
- https://help.goong.io/kb/rest-api-v2/autocomplete-rest-api-v2/autocomplete-v2/
- https://help.goong.io/kb/rest-api-v2/place-detail-rest-api-v2/place-detail-place-detail-v2/
- https://help.goong.io/kb/rest-api-v2/geocode-rest-api-v2/geocode-v2/
- https://help.goong.io/kb/rest-api-v2/directions-rest-api-v2/directions-v2/
- https://help.goong.io/kb/rest-api-v2/distance-matrix-rest-api-v2/distance-matrix-v2/
- https://help.goong.io/kb/app/react-native/tich-hop-maplibre-tren-nen-ban-do-goong-trong-react-native/
- https://help.goong.io/kb/gioi-thieu-tong-quan/dang-ky-va-tao-key/dang-ky-tai-khoan-va-tao-key/

## Endpoints V2 được khóa trong bộ skill

```text
GET https://rsapi.goong.io/v2/place/autocomplete
GET https://rsapi.goong.io/v2/place/detail
GET https://rsapi.goong.io/v2/geocode
GET https://rsapi.goong.io/v2/direction
GET https://rsapi.goong.io/v2/distancematrix
```

Nếu Goong thay đổi API sau này, agent phải kiểm tra docs chính thức trước khi đổi constants.
