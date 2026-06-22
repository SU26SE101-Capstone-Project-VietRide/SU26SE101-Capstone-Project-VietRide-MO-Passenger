# Implementation Plan - Recommended Order

## Phase 1: Foundation & Core Booking (Week 1-2)

### Goal
Enable complete bus booking flow from search to ticket.

### Sprint 1.1: Master Data APIs (2-3 days)

**Tasks:**

1. **Implement Cities List** (Trip service)
   - File: `apps/trip/src/VietRide.Trip.Api/Controllers/TripsController.cs` (or new `CitiesController.cs`)
   - Add: `GET /v1/cities`
   - Return: `[{ id, name, region }]`
   - Data: From `cities` table or static seed data
   - Cache: 5 minutes

2. **Implement Popular Routes** (Trip service)
   - File: Same as above
   - Add: `GET /v1/routes/popular`
   - Return: `[{ id, from, to, price, gradientColors }]`
   - Logic: Top 20 routes by booking count (last 30 days) OR admin-defined

3. **Implement Pickup/Dropoff Points** (Trip service)
   - File: `apps/trip/src/VietRide.Trip.Api/Controllers/TripsController.cs` or `TripStopsController.cs`
   - Add:
     - `GET /v1/trips/{tripId}/pickup-points`
     - `GET /v1/trips/{tripId}/dropoff-points`
   - Return: Stop data with time, address, order
   - Calculate times based on departure time + stop sequence

**Test:**
- Verify endpoints return proper JSON
- Check gateway routing (`routes.ts` needs new routes added)
- Test from Postman/curl

---

### Sprint 1.2: Booking Completion (3-4 days)

**Tasks:**

1. **Implement Booking Retrieval** (Booking service)
   - File: `apps/booking/src/VietRide.Booking.Api/Controllers/BookingsController.cs`
   - Add: `GET /v1/bookings/{bookingRef}`
   - Verify user ownership or operator role
   - Return full `BookingDto` with nested trip, seats, stops

2. **Implement Ticket/QR Generation** (Booking service)
   - Same file
   - Add: `GET /v1/bookings/{bookingRef}/ticket`
   - Generate QR code (library: QRCoder for .NET)
   - Return signed URL to S3/Cloudinary or base64 image

3. **Complete Booking History** (Identity or Booking service)
   - File: `apps/booking/src/VietRide.Booking.Api/Controllers/BookingsController.cs` or new `UserBookingsController.cs`
   - Implement: `GET /v1/users/me/bookings` (already exists stub)
   - Add pagination: `?page=1&limit=20&status=all`
   - Query: Filter by user ID from JWT `sub` claim

4. **Mobile Integration** (parallel)
   - Connect BusSearchScreen to cities/popular routes APIs
   - Connect TripResultsScreen to trip search (already exists)
   - Connect SeatSelection to seat lock API (exists)
   - Connect PickUp/DropOff screens to new point APIs
   - Connect CreateTicketBooking to create booking (exists)
   - Connect DigitalTicket to booking retrieval + ticket APIs
   - Connect TrackingScreen to tracking APIs (exists)

**Test:**
- End-to-end booking flow: search → seats → pickup/dropoff → create → ticket
- Verify ticket QR displays
- Check tracking shows stops

---

## Phase 2: Profile & Wallet (Week 3)

### Goal
Complete user profile management and wallet functionality.

### Sprint 2.1: Profile Management (2-3 days)

1. **Update Profile** (Identity service)
   - File: `apps/identity/src/VietRide.Identity.Api/Controllers/UsersController.cs`
   - Add: `PUT /v1/users/me`
   - Body: `{ fullName?, email? }`
   - Validate email uniqueness if changing

2. **Avatar Upload** (Identity service)
   - Same file
   - Add: `POST /v1/users/me/avatar`
   - Body: multipart/form-data with image
   - Upload to S3/R2, return URL
   - Update user.avatarUrl

3. **User Settings** (Identity service)
   - File: new `UserSettingsController.cs` or extend UsersController
   - Add:
     - `GET /v1/users/me/settings`
     - `PUT /v1/users/me/settings`
   - Store: JSON column `settings` in users table or separate table

4. **Mobile Integration**
   - Connect EditProfileScreen to update/avatar APIs
   - Connect SettingsScreen to settings APIs

---

### Sprint 2.2: Payment Methods (2-3 days)

1. **Payment Methods CRUD** (Payment service)
   - File: new `apps/payment/src/VietRide.Payment.Api/Controllers/PaymentMethodsController.cs`
   - Endpoints:
     - `GET /v1/wallet/payment-methods`
     - `POST /v1/wallet/payment-methods`
     - `DELETE /v1/wallet/payment-methods/{id}`
     - `POST /v1/wallet/payment-methods/{id}/set-default`
     - `POST /v1/payment-methods/verify`
   - Store: `payment_methods` table with tokenized card data (use Stripe/VNPay tokens)

2. **Withdrawal** (Payment service)
   - Same file or new `WithdrawalsController.cs`
   - Add:
     - `POST /v1/wallet/withdraw`
     - `GET /v1/wallet/withdrawals/{id}`
   - Store: `withdrawals` table
   - Integrate with bank transfer or e-wallet payout

3. **Mobile Integration**
   - Connect WalletScreen (payment methods list)
   - Connect AddPaymentMethodScreen
   - Connect SavedPaymentsScreen
   - Connect WithdrawScreen

---

### Sprint 2.3: Home & Dashboard (2 days)

1. **Dashboard API** (Identity or new Home service)
   - File: new `apps/home/src/VietRide.Home.Api/Controllers/HomeController.cs` OR in Identity
   - Add: `GET /v1/home/dashboard`
   - Aggregate:
     - Recent bookings (last 5)
     - Recent parcels (last 5)
     - Unread notifications count
     - Wallet balance
   - Return DTO with these sections

2. **News/Promotions** (Home service)
   - Same controller
   - Add: `GET /v1/news`
   - Data: Static CMS table or admin API
   - Return: `[{ id, title, imageUrl, link }]`

3. **Mobile Integration**
   - Connect HomeScreen to dashboard API
   - Show real recent bookings instead of mock
   - Show promotions

---

## Phase 3: Parcel Service (Week 4)

### Goal
Complete entire parcel delivery booking system.

### Sprint 3.1: Parcel CRUD (2-3 days)

1. **Create Parcel Service** (new microservice)
   - File: `apps/parcel/src/VietRide.Parcel.Api/Controllers/ParcelBookingsController.cs`
   - Endpoints:
     - `GET /v1/parcel/stations` - list stations
     - `GET /v1/parcel/categories` - list package categories
     - `GET /v1/parcel/cities/{city}/districts` - list districts
     - `POST /v1/parcel/estimate` - price estimate
     - `POST /v1/parcel/upload-photo` - photo upload
     - `POST /v1/parcel/bookings` - create booking
     - `GET /v1/parcel/{parcelId}` - get details
     - `GET /v1/parcel/{parcelId}/ticket` - get QR ticket

2. **Database Models** (Parcel service)
   - `parcel_bookings` table
   - `parcel_categories` table
   - `parcel_photos` table

3. **Mobile Integration**
   - Connect all parcel screens to new APIs

---

### Sprint 3.2: Parcel Tracking (1 day)

1. **Parcel Tracking Endpoints**
   - File: same controller or new `ParcelTrackingController.cs`
   - Add:
     - `GET /v1/parcel/{parcelId}/tracking`
   - Return milestones + location trail

2. **Integrate with Tracking Service** (optional)
   - Or simple status updates from booking updates

3. **Mobile Integration**
   - Connect ParcelTrackingScreen

---

## Phase 4: Polish & Real-time (Week 5)

### Goal
Add missing flows and real-time updates.

### Sprint 4.1: Missing Flows (2-3 days)

1. **Forgot Password Reset** (Identity service)
   - Add `POST /v1/auth/forgot-password`
   - Add `POST /v1/auth/reset-password`
   - Email template for reset link

2. **Payment Status Polling** (Payment service)
   - Add `GET /v1/payments/{paymentId}/status`

3. **Notifications Read-All** (Notification service)
   - Add `POST /v1/notifications/read-all`

4. **Promo/Voucher Application** (Booking service)
   - Add endpoint to apply voucher to booking
   - Or extend payment create to accept voucher

---

### Sprint 4.2: WebSocket Real-time (2-3 days)

1. **Set up Socket Server** (Gateway or separate service)
   - Use Socket.io or SignalR
   - Auth via user JWT

2. **Tracking WebSocket**
   - Endpoint: `/ws/tracking/{tripId}`
   - Emit: `{ type: 'location', data: { lat, lng, timestamp } }`

3. **Parcel Tracking WebSocket** (if needed)

4. **Mobile Integration**
   - Add socket connection in TrackingScreen
   - Auto-reconnect on disconnect

---

### Sprint 4.3: Operator Dashboard (Bonus)

If time permits:
- Operator booking statistics
- Operator wallet settlements
- Operator vehicle management improvements

---

## Files to Modify Reference

### Trip Service
```
apps/trip/src/VietRide.Trip.Api/Controllers/
├── TripsController.cs           (+ GetCities, GetPopularRoutes, GetPickupPoints, GetDropoffPoints)
└── CitiesController.cs         (new, optional)
```

### Booking Service
```
apps/booking/src/VietRide.Booking.Api/Controllers/
├── BookingsController.cs       (+ GetBookingByRef, GetTicket, implement GetBookings)
└── UserBookingsController.cs   (new, optional separation)
```

### Identity Service
```
apps/identity/src/VietRide.Identity.Api/Controllers/
├── UsersController.cs          (+ UpdateProfile, UploadAvatar)
├── UserSettingsController.cs  (new)
└── AuthController.cs          (+ ForgotPassword, ResetPassword)
```

### Payment Service
```
apps/payment/src/VietRide.Payment.Api/Controllers/
├── WalletController.cs         (+ maybe payment methods if stored here)
├── PaymentMethodsController.cs (new)
├── WithdrawalsController.cs   (new)
└── VnPayIpnController.cs      (+ payment status endpoint)
```

### Notification Service
```
apps/notification/src/notifications/notifications.controller.ts
└── add readAll() method
```

### Gateway (Route Updates)
```
apps/gateway/src/config/routes.ts
└── Add new route mappings for all new endpoints
```

### Parcel Service (NEW)
```
apps/parcel/src/VietRide.Parcel.Api/
├── Controllers/
│   ├── ParcelBookingsController.cs
│   ├── ParcelCategoriesController.cs
│   └── ParcelTrackingController.cs
├── Models/
│   ├── ParcelBooking.cs
│   ├── ParcelCategory.cs
│   └── ParcelPhoto.cs
└── Program.cs (register routes)
```

---

## Database Schema Additions

### Identity (if adding settings)
```sql
ALTER TABLE users ADD COLUMN settings JSONB;
-- or
CREATE TABLE user_settings (
  user_id UUID PRIMARY KEY REFERENCES users(id),
  language VARCHAR(10) DEFAULT 'vi',
  notifications JSONB,
  theme VARCHAR(20) DEFAULT 'light',
  updated_at TIMESTAMPTZ
);
```

### Payment (payment methods, withdrawals)
```sql
CREATE TABLE payment_methods (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  type VARCHAR(20), -- 'card', 'momo', 'vnpay'
  last_four VARCHAR(4),
  token VARCHAR(255), -- tokenized by payment provider
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ
);

CREATE TABLE withdrawals (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  amount DECIMAL(10,2),
  destination_method_id UUID REFERENCES payment_methods(id),
  status VARCHAR(20) DEFAULT 'PROCESSING',
  transaction_id VARCHAR(255),
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ
);
```

### Parcel (new service)
```sql
CREATE TABLE parcel_categories (
  id UUID PRIMARY KEY,
  name VARCHAR(100),
  size_options JSONB,
  weight_limits JSONB,
  base_price DECIMAL(10,2)
);

CREATE TABLE parcel_bookings (
  id UUID PRIMARY KEY,
  parcel_id VARCHAR(50), -- human-readable reference
  user_id UUID REFERENCES users(id),
  from_city VARCHAR(100),
  to_city VARCHAR(100),
  to_district VARCHAR(100),
  category_id UUID REFERENCES parcel_categories(id),
  weight DECIMAL(10,2),
  size VARCHAR(50),
  price DECIMAL(10,2),
  station_id UUID,
  status VARCHAR(20) DEFAULT 'PENDING',
  qr_code_url VARCHAR(500),
  created_at TIMESTAMPTZ
);

CREATE TABLE parcel_photos (
  id UUID PRIMARY KEY,
  parcel_booking_id UUID REFERENCES parcel_bookings(id),
  url VARCHAR(500),
  thumbnail_url VARCHAR(500),
  type VARCHAR(20) -- 'package', 'damage', etc.
);
```

---

## Testing Checklist

### For Each Endpoint

- [ ] Returns 200 with correct data shape
- [ ] Returns 401 when no auth token
- [ ] Returns 403 when wrong role
- [ ] Returns 404 when resource not found
- [ ] Validates input (422 on validation error)
- [ ] Returns error envelope on failure
- [ ] Database record created/updated correctly
- [ ] Idempotency (where applicable - seat locks, payments)

### End-to-End Flows

- [ ] Booking flow complete: search → seats → pickup/dropoff → payment → ticket
- [ ] Ticket displays with QR code
- [ ] Tracking shows location/ETA
- [ ] Profile edit saves changes
- [ ] Avatar upload works
- [ ] Wallet top-up creates payment intent
- [ ] Notifications list loads
- [ ] Parcel booking complete
- [ ] Forgot password reset works

---

## Environment Variables Needed

### Identity
```
JWT_ISSUER=...
JWT_AUDIENCE=...
JWT_PUBLIC_KEY_URL=...
JWT_PRIVATE_KEY_PATH=...
INTERNAL_JWT_SECRET=...
```

### Gateway
```
IDENTITY_BASE_URL=http://localhost:5001
TRIP_BASE_URL=http://localhost:5002
BOOKING_BASE_URL=http://localhost:5003
PAYMENT_BASE_URL=http://localhost:5004
NOTIFICATION_BASE_URL=http://localhost:5005
RAG_BASE_URL=http://localhost:5006
TRACKING_BASE_URL=http://localhost:5007
PARCEL_BASE_URL=http://localhost:5008
```

### S3/Cloudinary
```
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=...
AWS_S3_BUCKET=...
```

---

## Rollout Strategy

1. **Develop on local** with all services running
2. **Staging environment** - deploy all services to staging before production
3. **Feature flags** - use `launchdarkly` or similar to gradually roll out
4. **Mobile app updates** - coordinate with backend rollout
5. **Monitor** - Gateway logs, error tracking (Sentry), performance (Datadog)

---

**Next:** [06-File-References.md](./06-File-References.md) - Source code file locations
