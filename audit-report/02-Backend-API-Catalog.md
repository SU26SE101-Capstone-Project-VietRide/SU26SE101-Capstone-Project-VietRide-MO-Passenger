# Backend API Catalog

## Architecture Overview

**Backend Architecture:** Microservices với NestJS Gateway
**Services:**
- **Gateway** (NestJS) - Reverse proxy + auth + routing
- **Identity** (.NET 8) - User management, authentication
- **Trip** (.NET 8) - Routes, stations, stops, vehicles, schedules
- **Booking** (.NET 8) - Bookings, vouchers
- **Payment** (.NET 8) - Wallet, top-ups, VNPay
- **Parcel** (.NET 8) - ❌ Chưa triển khai (chỉ Ping)
- **Notification** (NestJS) - In-app notifications, emails
- **RAG** (NestJS) - Chatbot, feedback, documents
- **Tracking** (.NET 8) - GPS tracking, ETA

**Gateway URL:** `https://api.vietride.online` (dev: `http://localhost:3000`)
**Auth:** JWT (RS256) + Internal JWT (HS256)
**Response Format:** `ApiResponse<T>` envelope

---

## 1. GATEWAY SERVICE (NestJS)

**Location:** `apps/gateway/`

### Public Endpoints

| Method | Path | Handler | Description |
|--------|------|---------|-------------|
| GET | `/health` | health.get | Liveness probe |
| GET | `/ready` | ready.get | Readiness probe |
| GET | `/docs` | - | Swagger UI aggregated |

---

## 2. IDENTITY SERVICE (.NET 8)

**Location:** `apps/identity/src/VietRide.Identity.Api/Controllers/`

### Authentication (`/v1/auth`)

| Method | Endpoint | Handler | Auth | Description | File |
|--------|----------|---------|------|-------------|------|
| POST | `/register` | Register | none | Register passenger account | AuthController.cs |
| POST | `/verify-email` | VerifyEmail | none | Verify OTP code | AuthController.cs |
| POST | `/set-initial-password` | SetInitialPassword | none | Set initial password via token | AuthController.cs |
| POST | `/login` | Login | none | Email/password login → returns tokens | AuthController.cs |
| POST | `/google` | Google | none | Google OIDC login | AuthController.cs |
| POST | `/refresh` | Refresh | none | Refresh access token | AuthController.cs |
| POST | `/logout` | Logout | user | Revoke refresh token | AuthController.cs |

### Device Tokens (FCM)

| Method | Endpoint | Handler | Auth | Description | File |
|--------|----------|---------|------|-------------|------|
| POST | `/device-token` | RegisterDeviceToken | user | Register FCM token | DevicesController.cs |
| DELETE | `/device-token` | RemoveDeviceToken | user | Deactivate device token | DevicesController.cs |

### User Profile (`/v1/users`)

| Method | Endpoint | Handler | Auth | Description | File |
|--------|----------|---------|------|-------------|------|
| GET | `/me` | GetMe | user | Get user profile | UsersController.cs |
| POST | `/me/complete-profile` | CompleteProfile | user | Complete phone (one-time) | UsersController.cs |

### Passenger (`/v1/passenger`)

| Method | Endpoint | Handler | Auth | Description | File |
|--------|----------|---------|------|-------------|------|
| GET | `/me` | GetMe | user | Alias for /v1/users/me | PassengerController.cs |

### Operator (`/v1/operator`)

| Method | Endpoint | Handler | Auth | Description | File |
|--------|----------|---------|------|-------------|------|
| GET | `/profile` | GetAsync | OPERATOR_ADMIN/STAFF | Get operator profile | OperatorProfileController.cs |
| PATCH | `/profile` | PatchAsync | OPERATOR_ADMIN | Update operator profile | OperatorProfileController.cs |
| GET | `/users` | List | OPERATOR_ADMIN/STAFF | List operator users | OperatorUsersController.cs |
| POST | `/users` | Create | OPERATOR_ADMIN | Create operator user | OperatorUsersController.cs |
| POST | `/users/{userId}/resend-initial-password` | ResendInitialPassword | OPERATOR_ADMIN | Resend initial password | OperatorUsersController.cs |

### Operator Self-Registration

| Method | Endpoint | Handler | Auth | Description | File |
|--------|----------|---------|------|-------------|------|
| POST | `/v1/operators/register` | Register | none | Operator self-registration | OperatorsController.cs |

### Internal Endpoints (Internal JWT)

| Method | Endpoint | Handler | Description | File |
|--------|----------|---------|-------------|------|
| GET | `/internal/v1/users/{userId}` | GetUser | Get user by ID | InternalUsersController.cs |
| GET | `/internal/v1/users/{userId}/device-tokens` | GetDeviceTokens | Get user's device tokens | InternalUsersController.cs |
| GET | `/internal/v1/operators/{operatorId}` | GetOperatorAsync | Get operator profile | InternalOperatorsController.cs |
| GET | `/internal/v1/operators/{operatorId}/subscription` | GetSubscriptionAsync | Get operator subscription | InternalOperatorsController.cs |
| GET | `/internal/v1/operators/{operatorId}/recipient-users` | GetRecipientUsersAsync | Get operator's recipients | InternalOperatorsController.cs |
| POST | `/internal/v1/operators/{operatorId}/usage/increment` | IncrementUsageAsync | Increment usage counter | InternalOperatorsController.cs |

### Admin Endpoints (SYSTEM_ADMIN)

| Method | Endpoint | Handler | Description | File |
|--------|----------|---------|-------------|------|
| GET | `/v1/admin/operators` | List | List all operators | AdminOperatorsController.cs |
| POST | `/v1/admin/operators` | CreateOperator | Create new operator | AdminOperatorsController.cs |
| POST | `/v1/admin/operators/{operatorId}/approve` | Approve | Approve operator | AdminOperatorsController.cs |
| POST | `/v1/admin/operators/{operatorId}/reject` | Reject | Reject operator | AdminOperatorsController.cs |
| POST | `/v1/admin/operators/{operatorId}/suspend` | Suspend | Suspend operator | AdminOperatorsController.cs |
| GET | `/v1/admin/operator-users` | ListOperatorUsers | List all operator users | AdminOperatorUsersController.cs |
| POST | `/v1/admin/users` | CreateAdminUser | Create system admin | AdminUsersController.cs |
| POST | `/v1/admin/booking-stats` | GetBookingStats | Get platform booking stats | (Redirects to Booking) |
| GET | `/v1/admin/trip-settlements` | GetTripSettlements | Get settlement data | (Redirects to Payment) |
| GET | `/v1/admin/platform-wallet` | GetPlatformWallet | Get platform wallet balance | (Redirects to Payment) |

### Public

| Method | Endpoint | Handler | Description | File |
|--------|----------|---------|-------------|------|
| GET | `/.well-known/jwks.json` | GetJwks | Get public JWKS for token verification | JwksController.cs |
| GET | `/v1/ping` | Get | Service health ping | PingController.cs |

---

## 3. TRIP SERVICE (.NET 8)

**Location:** `apps/trip/src/VietRide.Trip.Api/Controllers/`

### Public Trip Endpoints

| Method | Endpoint | Handler | Auth | Description | File |
|--------|----------|---------|------|-------------|------|
| GET | `/v1/trips/search` | SearchAsync | none | Search available trips | TripsController.cs |
| GET | `/v1/trips/{tripId}` | GetAsync | user | Get trip details | TripsController.cs |
| GET | `/v1/trips/{tripId}/seat-map` | GetSeatMapAsync | user | Get seat layout | TripsController.cs |

### Routes (Operator Managed)

| Method | Endpoint | Handler | Auth | Description | File |
|--------|----------|---------|------|-------------|------|
| GET | `/v1/routes` | GetAsync | OPERATOR_STAFF/ADMIN | List operator routes | OperatorRoutesController.cs |
| POST | `/v1/routes` | PostAsync | OPERATOR_ADMIN | Create route | OperatorRoutesController.cs |
| GET | `/v1/routes/{id}` | GetByIdAsync | OPERATOR_STAFF/ADMIN | Get route by ID | OperatorRoutesController.cs |
| PATCH | `/v1/routes/{id}` | PatchAsync | OPERATOR_ADMIN | Update route | OperatorRoutesController.cs |
| POST | `/v1/routes/{id}/stops` | AddStopAsync | OPERATOR_ADMIN | Add stop to route | OperatorRoutesController.cs |
| DELETE | `/v1/routes/{id}/stops/{stopId}` | RemoveStopAsync | OPERATOR_ADMIN | Remove stop | OperatorRoutesController.cs |
| POST | `/v1/routes/{id}/fare-templates` | AddFareTemplateAsync | OPERATOR_ADMIN | Add fare template | OperatorRoutesController.cs |
| GET | `/v1/routes/{id}/fare-templates` | GetFareTemplatesAsync | OPERATOR_STAFF/ADMIN | List fare templates | OperatorRoutesController.cs |
| POST | `/v1/routes/{id}/alternative-routes` | AddAlternativeRouteAsync | OPERATOR_ADMIN | Add alternative route | OperatorRoutesController.cs |
| GET | `/v1/routes/{id}/alternative-routes` | GetAlternativeRoutesAsync | OPERATOR_STAFF/ADMIN | List alternatives | OperatorRoutesController.cs |

### Alternative Routes

| Method | Endpoint | Handler | Auth | Description | File |
|--------|----------|---------|------|-------------|------|
| PATCH | `/v1/operator/alternative-routes/{id}` | PatchAsync | OPERATOR_ADMIN | Update alternative route | OperatorAlternativeRoutesController.cs |
| DELETE | `/v1/operator/alternative-routes/{id}` | DeleteAsync | OPERATOR_ADMIN | Delete alternative route | OperatorAlternativeRoutesController.cs |

### Stations

| Method | Endpoint | Handler | Auth | Description | File |
|--------|----------|---------|------|-------------|------|
| GET | `/v1/stations/search` | SearchAsync | OPERATOR_STAFF/ADMIN | Search stations | StationsController.cs |
| POST | `/v1/operator/stations` | PostAsync | OPERATOR_STAFF/ADMIN | Create or link station | OperatorStationsController.cs |
| GET | `/v1/operator/stations` | GetAsync | OPERATOR_STAFF/ADMIN | List operator stations | OperatorStationsController.cs |
| GET | `/v1/operator/stations/{id}` | GetByIdAsync | OPERATOR_STAFF/ADMIN | Get station | OperatorStationsController.cs |

### Stops

| Method | Endpoint | Handler | Auth | Description | File |
|--------|----------|---------|------|-------------|------|
| GET | `/v1/stops` | GetAsync | OPERATOR_STAFF/ADMIN | List stops (filtered) | OperatorStopsController.cs |
| POST | `/v1/stops` | PostAsync | OPERATOR_ADMIN | Create stop | OperatorStopsController.cs |
| GET | `/v1/stops/{id}` | GetByIdAsync | OPERATOR_STAFF/ADMIN | Get stop by ID | OperatorStopsController.cs |
| PATCH | `/v1/stops/{id}` | PatchAsync | OPERATOR_ADMIN | Update stop | OperatorStopsController.cs |

### Vehicles

| Method | Endpoint | Handler | Auth | Description | File |
|--------|----------|---------|------|-------------|------|
| GET | `/v1/vehicle-types` | GetAsync | OPERATOR_STAFF/ADMIN | Get all vehicle types | VehicleTypesController.cs |
| POST | `/v1/operator/vehicles` | PostAsync | OPERATOR_ADMIN | Register vehicle | OperatorVehiclesController.cs |
| GET | `/v1/operator/vehicles` | GetAsync | OPERATOR_STAFF/ADMIN | List operator vehicles | OperatorVehiclesController.cs |
| GET | `/v1/operator/vehicles/{id}` | GetByIdAsync | OPERATOR_STAFF/ADMIN | Get vehicle | OperatorVehiclesController.cs |
| PATCH | `/v1/operator/vehicles/{id}` | PatchAsync | OPERATOR_ADMIN | Update vehicle | OperatorVehiclesController.cs |

### Driver Schedules

| Method | Endpoint | Handler | Auth | Description | File |
|--------|----------|---------|------|-------------|------|
| POST | `/v1/operator/driver-schedules` | Create | OPERATOR_ADMIN | Create driver schedule | OperatorDriverSchedulesController.cs |
| PATCH | `/v1/operator/driver-schedules/{id}/activate` | Activate | OPERATOR_ADMIN | Activate schedule | OperatorDriverSchedulesController.cs |

### Internal Endpoints (Internal JWT)

| Method | Endpoint | Handler | Description | File |
|--------|----------|---------|-------------|------|
| GET | `/internal/v1/trips/{tripId}` | GetAsync | Get trip snapshot for booking | InternalTripsController.cs |
| POST | `/internal/v1/trips/{tripId}/lock-seats` | LockSeatsAsync | Lock seat selection (idempotent) | InternalTripsController.cs |
| POST | `/internal/v1/trips/{tripId}/release-seats` | ReleaseSeatsAsync | Release seat locks | InternalTripsController.cs |
| POST | `/internal/v1/trips/{tripId}/book-seats` | BookSeatsAsync | Confirm seat booking | InternalTripsController.cs |
| POST | `/internal/v1/trips/round-trip/lock-seats` | LockRoundTripSeatsAsync | Lock round-trip seats | InternalTripsController.cs |
| GET | `/internal/v1/stations/{id}` | GetByIdAsync | Get station details | InternalStationsController.cs |
| GET | `/internal/v1/stops/{id}` | GetByIdAsync | Get stop details | InternalStopsController.cs |

### Public Health

| Method | Endpoint | Handler | Description | File |
|--------|----------|---------|-------------|------|
| GET | `/v1/trip/health` | - | Health check (gateway rewrites) | PingController.cs |

---

## 4. BOOKING SERVICE (.NET 8)

**Location:** `apps/booking/src/VietRide.Booking.Api/Controllers/`

### Bookings (User)

| Method | Endpoint | Handler | Auth | Description | File |
|--------|----------|---------|------|-------------|------|
| POST | `/v1/bookings` | CreateBooking | PASSENGER | Create single-leg booking | BookingsController.cs |
| POST | `/v1/bookings/round-trip` | CreateRoundTripBooking | PASSENGER | Create round-trip booking | BookingsController.cs |
| POST | `/v1/bookings/{bookingId}/edit-pickup` | EditPickup | PASSENGER | Edit pickup location | BookingsController.cs |
| POST | `/v1/bookings/{bookingId}/edit-dropoff` | EditDropoff | PASSENGER | Edit dropoff location | BookingsController.cs |

### Admin Vouchers (SYSTEM_ADMIN)

| Method | Endpoint | Handler | Description | File |
|--------|----------|---------|-------------|------|
| GET | `/v1/admin/vouchers` | ListVouchers | List all vouchers | AdminVouchersController.cs |
| POST | `/v1/admin/vouchers` | CreateVoucher | Create new voucher | AdminVouchersController.cs |
| GET | `/v1/admin/vouchers/{voucherId}/consents` | ListConsents | List voucher consents | AdminVoucherConsentsController.cs |

### Operator Vouchers (OPERATOR_ADMIN)

| Method | Endpoint | Handler | Description | File |
|--------|----------|---------|-------------|------|
| POST | `/v1/operator/vouchers` | CreateVoucher | Create operator voucher | OperatorVouchersController.cs |
| PATCH | `/v1/operator/vouchers/{id}` | UpdateVoucher | Update voucher | OperatorVouchersController.cs |
| DELETE | `/v1/operator/vouchers/{id}` | DeleteVoucher | Delete voucher | OperatorVouchersController.cs |
| POST | `/v1/operator/vouchers/{id}/activate` | ActivateVoucher | Activate voucher | OperatorVouchersController.cs |
| POST | `/v1/operator/vouchers/{id}/deactivate` | DeactivateVoucher | Deactivate voucher | OperatorVouchersController.cs |

### Operator Voucher Consents (OPERATOR_ADMIN/STAFF)

| Method | Endpoint | Handler | Description | File |
|--------|----------|---------|-------------|------|
| GET | `/v1/operator/voucher-consents` | ListConsents | List pending consents | OperatorVoucherConsentsController.cs |
| POST | `/v1/operator/voucher-consents/{id}/accept` | AcceptConsent | Accept voucher consent | OperatorVoucherConsentsController.cs |
| POST | `/v1/operator/voucher-consents/{id}/reject` | RejectConsent | Reject voucher consent | OperatorVoucherConsentsController.cs |

### Health

| Method | Endpoint | Description | File |
|--------|----------|-------------|------|
| GET | `/v1/booking/health` | Health check (gateway rewrites) | PingController.cs |

---

## 5. PAYMENT SERVICE (.NET 8)

**Location:** `apps/payment/src/VietRide.Payment.Api/Controllers/`

### Wallet (User)

| Method | Endpoint | Handler | Auth | Description | File |
|--------|----------|---------|------|-------------|------|
| GET | `/v1/wallet` | GetWallet | PASSENGER | Get wallet balance | WalletController.cs |
| GET | `/v1/wallet/transactions` | GetWalletTransactions | PASSENGER | Get transaction history | WalletController.cs |
| POST | `/v1/wallet/top-up` | CreateTopUp | PASSENGER | Create VNPay top-up | WalletController.cs |

### Payment

| Method | Endpoint | Handler | Auth | Description | File |
|--------|----------|---------|------|-------------|------|
| POST | `/v1/payments/vnpay-topup-ipn` | ConfirmTopUp | none | VNPay IPN callback | VnPayIpnController.cs |
| POST | `/internal/v1/payments/batch-charge` | BatchChargeAsync | Internal JWT | Batch charge (idempotent) | InternalPaymentsController.cs |

### Health

| Method | Endpoint | Description | File |
|--------|----------|-------------|------|
| GET | `/v1/payment/health` | Health check (gateway rewrites) | PingController.cs |

---

## 6. PARCEL SERVICE (.NET 8)

**Status:** ❌ NOT IMPLEMENTED

**Location:** `apps/parcel/src/VietRide.Parcel.Api/Controllers/`

Only Ping controller exists:
- `GET /v1/parcel/ping` - Service health

**Gateway Route:** `/v1/parcels` → Parcel service (but empty)

**Needs full implementation:**
- `GET /v1/parcel/stations`
- `GET /v1/parcel/categories`
- `POST /v1/parcel/estimate`
- `POST /v1/parcel/upload-photo`
- `POST /v1/parcel/bookings`
- `GET /v1/parcel/{id}`
- `GET /v1/parcel/{id}/ticket`
- `GET /v1/parcel/{id}/tracking`
- `GET /v1/parcel/cities/{city}/districts`

---

## 7. NOTIFICATION SERVICE (NestJS)

**Location:** `apps/notification/src/`

### Notifications (User)

| Method | Endpoint | Handler | Auth | Description | File |
|--------|----------|---------|------|-------------|------|
| GET | `/api/v1/notifications` | listNotifications | User JWT | List notifications (paginated) | notifications.controller.ts |
| PATCH | `/api/v1/notifications/{notificationId}` | markRead | User JWT | Mark notification as read | notifications.controller.ts |

### Internal Email

| Method | Endpoint | Handler | Auth | Description | File |
|--------|----------|---------|------|-------------|------|
| POST | `/api/internal/v1/emails` | enqueueEmail | Internal JWT | Queue email for SendGrid | internal-emails.controller.ts |

### Health/Ready

| Method | Endpoint | Description | File |
|--------|----------|-------------|------|
| GET | `/health` | Health check | health.controller.ts |
| GET | `/ready` | Readiness check | ready.controller.ts |

---

## 8. RAG SERVICE (NestJS)

**Location:** `apps/rag/src/`

### Chat (Internal JWT)

| Method | Endpoint | Handler | Auth | Description | File |
|--------|----------|---------|------|-------------|------|
| POST | `/api/v1/rag/chat` | create | Internal JWT | Chat with RAG (SSE stream) | chat/chat.controller.ts |

### Feedback (Internal JWT)

| Method | Endpoint | Handler | Auth | Description | File |
|--------|----------|---------|------|-------------|------|
| POST | `/api/v1/rag/messages/:messageId/feedback` | create | Internal JWT | Create message feedback | chat/feedback.controller.ts |
| GET | `/api/v1/rag/feedback` | list | Internal JWT | List all feedback | chat/feedback.controller.ts |

### Documents (Internal JWT, SYSTEM_ADMIN)

| Method | Endpoint | Handler | Auth | Description | File |
|--------|----------|---------|------|-------------|------|
| POST | `/api/v1/rag/documents` | create | Internal JWT + SYSTEM_ADMIN | Upload knowledge document | documents/documents.controller.ts |
| PUT | `/api/v1/rag/documents/{documentId}/approve` | approve | Internal JWT + SYSTEM_ADMIN | Approve document | documents/documents.controller.ts |

### Admin Runtime Config (Internal JWT, SYSTEM_ADMIN)

| Method | Endpoint | Handler | Description | File |
|--------|----------|---------|-------------|------|
| GET | `/api/v1/admin/rag-config` | list | List runtime configs | admin-config/runtime-config-admin.controller.ts |
| POST | `/api/v1/admin/rag-config/reload` | reload | Reload all configs | admin-config/runtime-config-admin.controller.ts |
| GET | `/api/v1/admin/rag-config/:key` | get | Get single config | admin-config/runtime-config-admin.controller.ts |
| PATCH | `/api/v1/admin/rag-config/:key` | update | Update config | admin-config/runtime-config-admin.controller.ts |
| GET | `/api/v1/admin/rag-config/:key/history` | history | Get config history | admin-config/runtime-config-admin.controller.ts |
| POST | `/api/v1/admin/rag-config/:key/rollback` | rollback | Rollback config | admin-config/runtime-config-admin.controller.ts |

### Health/Ready

| Method | Endpoint | Description | File |
|--------|----------|-------------|------|
| GET | `/health` | Health check | health.controller.ts |
| GET | `/ready` | Readiness check | ready.controller.ts |

---

## 9. TRACKING SERVICE (.NET 8)

**Location:** `apps/tracking/src/tracking-data/`

### Tracking (User)

| Method | Endpoint | Handler | Auth | Description | File |
|--------|----------|---------|------|-------------|------|
| GET | `/v1/tracking/trips/{tripId}/latest` | getLatest | User JWT | Get latest bus location | tracking-data.controller.ts |
| GET | `/v1/tracking/trips/{tripId}/eta` | getEta | User JWT | Get ETA to next stop | tracking-data.controller.ts |
| GET | `/v1/tracking/trips/{tripId}/trail` | getTrail | User JWT | Get location history | tracking-data.controller.ts |

### Health

| Method | Endpoint | Description | File |
|--------|----------|-------------|------|
| GET | `/v1/tracking/health` | Health check (gateway rewrites to Swagger) | PingController.cs |

---

## 10. GATEWAY ROUTING CONFIG

**File:** `apps/gateway/src/config/routes.ts`

### Auth Modes
- `none` - Public, no token required
- `user` - Requires valid user JWT
- `mixed` - Some subpaths public, others require user JWT

### Route Prefix Mapping

```
/v1/auth/*         → Identity (mixed)
/v1/users/*        → Identity (user)
/v1/passenger/*    → Identity (user)
/v1/operators/*    → Identity (mixed: register public)
/v1/admin/*        → Identity (user + role check)
/v1/operator/*     → Identity (user + role check)
/v1/trips/*        → Trip (mixed: search public)
/v1/routes/*       → Trip (user)
/v1/stations/*     → Trip (user)
/v1/stops/*        → Trip (user)
/v1/operator/*     → Trip (user + role check)
/v1/vehicle-types  → Trip (user)
/v1/vehicles       → Trip (user) [NOT IMPLEMENTED]
/v1/driver         → Trip (user) [NOT IMPLEMENTED]
/v1/assistant      → Trip (user) [NOT IMPLEMENTED]
/v1/bookings/*     → Booking (user)
/v1/admin/vouchers → Booking (user + SYSTEM_ADMIN)
/v1/operator/vouchers → Booking (user + OPERATOR_ADMIN)
/v1/vouchers       → Booking (user) [NOT IMPLEMENTED]
/v1/payments/*     → Payment (mixed)
/v1/wallet/*       → Payment (user)
/v1/parcels/*      → Parcel (user) [NOT IMPLEMENTED]
/v1/notifications/* → Notification (user, path prefixed /api)
/v1/rag/*          → RAG (user, path prefixed /api)
/v1/tracking/*     → Tracking (user)
```

---

## Response Envelope Standard

All endpoints (except 204 No Content, Swagger, health) return:

```json
{
  "success": true,
  "statusCode": 200,
  "data": { ... },
  "meta": {
    "traceId": "00-...-01",
    "timestamp": "2025-06-22T..."
  }
}
```

Error response:

```json
{
  "success": false,
  "statusCode": 400,
  "error": {
    "code": "AUTH_INVALID_CREDENTIALS",
    "message": "Invalid email or password",
    "fields": {
      "email": ["Email is required"],
      "password": ["Password is incorrect"]
    }
  },
  "meta": {
    "traceId": "...",
    "timestamp": "..."
  }
}
```

---

## Authentication Types

1. **User JWT** (RS256, 15 min TTL) - For mobile app users
   - Header: `Authorization: Bearer <token>`
   - Validated via JWKS at `/.well-known/jwks.json`
   - Claims: `sub` (userId), `role`, `email`, `phone` (optional)

2. **Internal JWT** (HS256, 120s TTL) - For service-to-service
   - Header: `x-internal-auth: <token>`
   - Shared secret via `INTERNAL_JWT_SECRET`
   - Claims: `iss` (service name), `sub` (userId)

---

**Next:** [03-Mobile-Screens.md](./03-Mobile-Screens.md) - Mobile app screens and API requirements
