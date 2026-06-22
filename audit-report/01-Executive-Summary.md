# VietRide Mobile-Backend API Audit Report

## Executive Summary

Tổng quan về việc khớp nối giữa **VietRide Passenger Mobile App** và **VietRide Backend APIs**.

| Chỉ số | Số liệu |
|--------|---------|
| **Tổng APIs cần thiết** | ~45 endpoints |
| **APIs đã có trên BE** | ~26 endpoints |
| **APIs đang thiếu** | ~19 endpoints |
| **Tỷ lệ phủ sóng** | ~58% |
| **Module hoàn toàn** | Auth ✅, Tracking ✅ |
| **Module thiếu** | Parcel ❌, Home ❌, Profile ⚠️ |

---

## Priority Issues

### 🔴 BLOCKERS (Cần triển khai NGAY)
1. ❌ **Parcel Service** - Toàn bộ chưa triển khai
2. ❌ **Cities list API** - Thiếu master data
3. ❌ **Pickup/Dropoff points** - Booking flow không hoàn chỉnh
4. ❌ **Booking retrieval** - Không xem được vé đã đặt
5. ❌ **Ticket/QR download** - Không hiển thị vé

### 🟡 HIGH PRIORITY
6. ⚠️ **Profile update API** - Chỉ có complete-profile (1 lần)
7. ⚠️ **Avatar upload** - Chưa có
8. ⚠️ **Booking history** - Stub, trả về rỗng
9. ⚠️ **Dashboard API** - Home screen không có data
10. ⚠️ **Payment methods** - Không quản lý được

### 🟢 MEDIUM PRIORITY
11. Forgot password reset flow
12. Withdrawal API
13. User settings
14. Notifications read-all
15. WebSocket real-time tracking

---

## Files in This Report

- [02-Backend-API-Catalog.md](./02-Backend-API-Catalog.md) - Danh sách tất cả APIs đã triển khai
- [03-Mobile-Screens.md](./03-Mobile-Screens.md) - Tất cả screens trên mobile và APIs cần dùng
- [04-Gap-Analysis.md](./04-Gap-Analysis.md) - Phân tích thiếu hụt chi tiết theo từng module
- [05-Implementation-Plan.md](./05-Implementation-Plan.md) - Kế hoạch triển khai theo ưu tiên
- [06-File-References.md](./06-File-References.md) - Tham chiếu file source code

---

## Quick Stats

### Mobile Modules Coverage

| Module | Screens | APIs Cần | Đã Có | Thiếu | Coverage |
|--------|---------|----------|-------|-------|----------|
| Auth | 4 | 5 | 5 | 0 | ✅ 100% |
| Booking | 14 | 15+ | 10 | 5 | ⚠️ 67% |
| Parcel | 5 | 8+ | 0 | 8+ | ❌ 0% |
| Profile | 10 | 12+ | 3 | 9 | ❌ 25% |
| Home | 2 | 4 | 0 | 4 | ❌ 0% |
| Chatbot | 1 | 1 | 0 | 1 | ❌ 0%* |
| Tracking | 1 | 2-3 | 3 | 0 | ✅ 100% |

*Chatbot API có nhưng chỉ dành cho internal service

---

## Critical Missing APIs

1. `GET /v1/cities` - Master data cho booking/parcel
2. `GET /v1/routes/popular` - Home/Booking
3. `GET /v1/trips/{tripId}/pickup-points` - Booking flow
4. `GET /v1/trips/{tripId}/dropoff-points` - Booking flow
5. `GET /v1/bookings/{bookingRef}` - Xem vé
6. `GET /v1/bookings/{bookingRef}/ticket` - QR vé
7. `PUT /v1/users/me` - Update profile
8. `POST /v1/users/me/avatar` - Upload avatar
9. `GET /v1/home/dashboard` - Dashboard data
10. `GET /v1/news` - News/promos
11. Full parcel service (~8 endpoints)
12. Payment methods CRUD
13. Withdrawal API
14. User settings endpoints
15. Notifications read-all
16. Forgot password reset flow
17. Public chatbot endpoint
18. WebSocket tracking
19. Booking history pagination

---

**Next:** Xem chi tiết trong [02-Backend-API-Catalog.md](./02-Backend-API-Catalog.md)
