# Gap Analysis - Missing Endpoints & Issues

---

## Priority 1: CRITICAL BLOCKERS (Must implement before MVP)

### 1. Parcel Service - Entirely Missing

**Status:** ❌ NOT IMPLEMENTED (only Ping controller exists)

**Required Endpoints:**

| Endpoint | Purpose | File to Implement |
|----------|---------|-------------------|
| `GET /v1/parcel/stations` | List all stations for dropoff | ParcelController.cs (new) |
| `GET /v1/parcel/categories` | Get package categories/sizes | ParcelController.cs |
| `POST /v1/parcel/estimate` | Calculate price & delivery time | ParcelController.cs |
| `POST /v1/parcel/upload-photo` | Upload package photos | ParcelController.cs |
| `POST /v1/parcel/bookings` | Create parcel booking | ParcelController.cs |
| `GET /v1/parcel/{parcelId}` | Get parcel details | ParcelController.cs |
| `GET /v1/parcel/{parcelId}/ticket` | Get ticket/QR | ParcelController.cs |
| `GET /v1/parcel/{parcelId}/tracking` | Get tracking timeline | ParcelController.cs |
| `GET /v1/parcel/cities/{city}/districts` | Get districts in city | ParcelController.cs |

**Effort:** 2-3 days (full CRUD + database models)

---

### 2. Cities List - Master Data Missing

**Status:** ❌ No `/v1/cities` endpoint

**Needed By:** Booking (BusSearchScreen, CityPickerScreen), Parcel (CityPickerScreen)

**Required Endpoint:**

```http
GET /v1/cities
Query: ?q={search}&region={region}
Response: [{ id, name, region }]
```

**Implementation:**
- Could add to Trip service `CitiesController.GetCities`
- Simple read-only list from static data or database `cities` table
- Cache with Redis (5 min TTL)

**Effort:** 2-4 hours

---

### 3. Popular Routes - Home/Booking

**Status:** ❌ No `/v1/routes/popular` endpoint

**Needed By:** BusSearchScreen, PopularRoutesScreen

**Required Endpoint:**

```http
GET /v1/routes/popular
Query: ?limit=20&from={city}&to={city}
Response: [{ id, from, to, price, gradientColors }]
```

**Implementation:**
- Trip service: Add `GetPopularRoutes` to TripsController or new `PopularRoutesController`
- Could use query: top booked routes in last 30 days
- Or static admin-defined popular routes

**Effort:** 2-4 hours

---

### 4. Pickup/Dropoff Points

**Status:** ❌ No endpoints to list pickup/dropoff stops for a trip

**Needed By:** PickUpScreen, DropOffScreen

**Required Endpoints:**

```http
GET /v1/trips/{tripId}/pickup-points
Response: [{ id, stopId, stopName, address, time, status, order }]

GET /v1/trips/{tripId}/dropoff-points
Response: [{ id, stopId, stopName, address, time, status, order, refundAmount? }]
```

**Implementation:**
- Trip service: Add methods to `TripsController` or new `TripStopsController`
- Query: trip's route stops filtered by stopType (PICKUP/DROPOFF)
- Include time calculations based on stop order

**Effort:** 4-6 hours

---

### 5. Booking Retrieval & Ticket

**Status:** ❌ Can create booking but cannot view it afterwards

**Needed By:** DigitalTicketScreen, TrackingScreen

**Required Endpoints:**

```http
GET /v1/bookings/{bookingRef}
Response: Full BookingDto with trip, seats, pickup/dropoff, contact

GET /v1/bookings/{bookingRef}/ticket
Response: { qrCodeUrl: string, ticketImageUrl?: string }
```

**Implementation:**
- Booking service: Add `GetBookingByRef` and `GetTicket` to BookingsController
- `GetBookingByRef`: lookup by reference, verify user ownership or operator role
- `GetTicket`: generate QR code (using QRCoder or similar) and return signed URL

**Effort:** 4-6 hours

---

### 6. Profile Update & Avatar Upload

**Status:** ❌ Can only complete phone once, cannot edit

**Needed By:** EditProfileScreen

**Required Endpoints:**

```http
PUT /v1/users/me
Body: { fullName?: string, email?: string }
Response: { user: UserSummaryDto }

POST /v1/users/me/avatar
Body: FormData { avatar: File }
Response: { avatarUrl: string }
```

**Implementation:**
- Identity service: Add `UpdateProfile` and `UploadAvatar` to UsersController
- Store avatar in S3/Cloudinary/R2, return public URL
- Update user record with avatar URL

**Effort:** 4-6 hours (including file upload infrastructure)

---

### 7. Dashboard & News

**Status:** ❌ No home/dashboard endpoint

**Needed By:** HomeScreen

**Required Endpoints:**

```http
GET /v1/home/dashboard
Response: {
  recentBookings: [],
  recentShipments: [],
  promotions: [],
  walletBalance?: number
}

GET /v1/news
Response: Array<{ id, title, imageUrl, link }>
```

**Implementation:**
- Could be new `HomeController` in Identity or separate service
- Dashboard: aggregate data from multiple services (bookings, parcels, wallet)
- News: static/admin-defined content (CMS table)

**Effort:** 4-8 hours (dashboard aggregation may be complex)

---

### 8. Booking History - Not Paginated

**Status:** ⚠️ Stub returns empty PagedResult

**Needed By:** BookingHistoryScreen (Tickets tab)

**Implementation:**
- Identity/PassengerController: Implement `GetBookings` properly
- Query: `?page=1&limit=20&status=all|upcoming|past`
- Join with bookings table, filter by user

**Effort:** 4-6 hours

---

## Priority 2: HIGH (Important but has workarounds)

### 9. Forgot Password Reset Flow

**Status:** ❌ Only `SetInitialPassword` for admin-created users

**Problem:** Mobile app has ForgotPasswordScreen but no matching endpoint.

**Required Endpoints:**

```http
POST /v1/auth/forgot-password
Body: { emailOrPhone: string }
Response: { success: boolean }

POST /v1/auth/reset-password
Body: { token: string, newPassword: string }
Response: { success: boolean }
```

**Implementation:**
- Identity: New `ForgotPassword` and `ResetPassword` commands
- Generate time-limited reset token (1 hour), store hashed
- Send reset email with link/token
- Validate token, allow password reset

**Effort:** 6-8 hours (includes email template)

---

### 10. Payment Methods Management

**Status:** ❌ No CRUD for payment methods

**Needed By:** WalletScreen (list), AddPaymentMethodScreen, SavedPaymentsScreen, PaymentScreen

**Required Endpoints:**

```http
GET /v1/wallet/payment-methods
Response: PaymentMethod[]

POST /v1/wallet/payment-methods
Body: { type: 'card'|'momo'|'vnpay', ...details }
Response: { paymentMethod }

DELETE /v1/wallet/payment-methods/{id}
Response: { success }

POST /v1/wallet/payment-methods/{id}/set-default
Response: { success }

POST /v1/payment-methods/verify
Body: { methodId }
Response: { success }  // Test charge
```

**Implementation:**
- Payment service: New `PaymentMethodsController`
- Store in database with user foreign key, tokenize sensitive data (Stripe/VNPay)
- Verification: small test charge (0.1 VND)

**Effort:** 8-10 hours

---

### 11. Withdrawal API

**Status:** ❌ No withdrawal functionality

**Needed By:** WithdrawScreen

**Required Endpoints:**

```http
POST /v1/wallet/withdraw
Body: { amount: number, destinationMethodId: string }
Response: { withdrawalId, status: 'PROCESSING' }

GET /v1/wallet/withdrawals/{id}
Response: { status, processedAt, transactionId? }
```

**Implementation:**
- Payment service: New `WithdrawalsController`
- Bank transfer integration (Vietcombank, MB, etc.) or e-wallet payout
- Admin approval workflow (optional)

**Effort:** 1-2 days (payout integration)

---

### 12. User Settings/Preferences

**Status:** ❌ No settings endpoints

**Needed By:** SettingsScreen

**Required Endpoint:**

```http
GET /v1/users/me/settings
Response: { language: 'vi'|'en', notifications: {...}, theme: 'light'|'dark'|'auto' }

PUT /v1/users/me/settings
Body: Partial<Settings>
Response: { success }
```

**Implementation:**
- Identity: Add `Settings` property to User entity, new `SettingsController`
- Or separate `UserPreferencesController`
- Store as JSON in user record or separate table

**Effort:** 2-3 hours

---

### 13. Notifications Read-All

**Status:** ❌ No bulk mark-as-read

**Needed By:** NotificationScreen

**Required Endpoint:**

```http
POST /v1/notifications/read-all
Response: { success, count }
```

**Implementation:**
- Notification service: Add `readAll` to `NotificationsController`
- Bulk update `read = true` for user's unread notifications

**Effort:** 1 hour

---

### 14. Payment Status Polling

**Status:** ❌ No check payment status

**Needed By:** PaymentScreen

**Required Endpoint:**

```http
GET /v1/payments/{paymentId}/status
Response: { status: 'pending'|'completed'|'failed' }
```

**Implementation:**
- Payment service: Add `GetPaymentStatus` to `PaymentsController` or `WalletController`
- Query payment transaction by ID

**Effort:** 2 hours

---

### 15. WebSocket Real-Time Updates

**Status:** ❌ No WebSocket server

**Needed By:**
- TrackingScreen (bus location updates)
- ParcelTrackingScreen (parcel status)
- ChatbotScreen (streaming chat)
- Notifications (push replacements)

**Implementation Options:**
1. **Socket.io** on gateway or separate WebSocket service
2. **Server-Sent Events (SSE)** for simpler one-way streams
3. **Existing RAG** already uses SSE for chat (could be exposed)

**Effort:** 2-3 days (infrastructure + connection mgmt + reconnection logic)

---

### 16. Booking History Pagination

**Status:** ⚠️ Stub exists but not implemented

**Needed By:** BookingHistoryScreen

**Implementation:** See Priority 1 #8

**Effort:** Already counted above

---

### 17. Contact Info Endpoints

**Status:** ❌ No dedicated save/load for checkout contact

**Needed By:** CheckoutScreen

**Implementation:**
- Could reuse `GET /v1/users/me` and `PUT /v1/users/me`
- Or add dedicated `contact-info` endpoints if want separate from profile

**Effort:** 0-2 hours (if reuse existing)

---

## Priority 3: MEDIUM (Nice to have)

### 18. Recent Searches

**Status:** ❌ No endpoint for user's recent route searches

**Needed By:** BusSearchScreen

**Implementation:**
- Store locally on mobile (AsyncStorage) as temporary
- Backend: `GET /v1/routes/recent` returning last 10 searches
- Use for personalized suggestions

**Effort:** 2 hours (backend), 1 hour (mobile)

---

### 19. Promo/Voucher Integration

**Status:** ❌ PaymentScreen applies promo but no integration with booking

**Needed By:** PaymentScreen

**Implementation:**
- Connect booking voucher consent flow with payment discount
- Use existing voucher endpoints but make them available to passengers
- Or add new user-facing voucher application endpoint

**Effort:** 4-6 hours

---

### 20. Vehicle Types Public Read

**Status:** ⚠️ Exists but requires OPERATOR_STAFF role

**Needed By:** Trip details to show bus type

**Implementation:**
- Change `VehicleTypesController.GetAsync` to allow public read
- Or duplicate to new endpoint without role check

**Effort:** 1 hour

---

## Other Observations

### 1. Trip Search Needs Stop Details

**Issue:** `GET /v1/trips/search` returns routeId, but mobile needs pickup/dropoff stop details.

**Solution:** Either:
- Expand trip search response to include pickup/dropoff stops
- Or follow-up call to get stops from route

---

### 2. Seat Map Schema

**Question:** What's the expected `SeatRow` structure?

**From mobile code:**
```typescript
export interface SeatRow {
  row: number;
  seatLayout: string[]; // ['available', 'selected', 'sold', 'male', 'female']
  maxSeatsInRow: number;
}
```

**Backend should match this schema exactly.**

---

### 3. Internal JWT for Seat Locking

**Issue:** Seat lock/release uses Internal JWT, but mobile only has User JWT.

**Solution Options:**
1. Gateway translates user JWT to internal JWT automatically for these endpoints
2. Mobile fetches internal JWT from auth service on login (add to TokenBundle)
3. Change seat locking to use user JWT directly (simpler)

**Recommendation:** Option 3 - make seat operations use user JWT, no internal JWT needed.

---

### 4. Booking Status Updates

**Question:** How does mobile know booking is confirmed after payment?

**Current:** CreateBooking → immediate CONFIRMED status?
**Need:** Payment callback → update booking status → notification

**Check:** Does Booking service listen to Payment webhooks?

---

### 5. Phone Number Format

**Mobile uses:** Vietnamese format `09xxxxxxxx` or `+849xxxxxxxx`
**Backend expects:** E.164 format `+849xxxxxxxx`

**Ensure:** Normalization layer in AuthController.Register/Login

---

## Implementation Priority Table

| Priority | Endpoint Group | Count | Est. Effort | Dependencies |
|----------|----------------|-------|-------------|--------------|
| P0 | Parcel service | 9 | 2-3 days | None |
| P0 | Cities list | 1 | 4h | cities table |
| P0 | Pickup/Dropoff points | 2 | 4-6h | stops table |
| P0 | Booking retrieval | 2 | 4-6h | bookings table |
| P0 | Profile update | 2 | 4-6h | user avatar storage |
| P0 | Dashboard | 2 | 4-8h | aggregate queries |
| P1 | Forgot password | 2 | 6-8h | email templates |
| P1 | Payment methods | 5 | 8-10h | payment provider |
| P1 | Withdrawal | 2 | 1-2 days | payout integration |
| P1 | Settings | 2 | 2-3h | user settings column |
| P1 | WebSocket | - | 2-3 days | socket infra |
| P2 | Notifications read-all | 1 | 1h | Notification service |
| P2 | Payment status polling | 1 | 2h | Payment service |
| P2 | Popular routes | 1 | 4h | booking analytics |
| P2 | Booking history pagination | 1 | 4-6h | bookings table |
| P2 | Promo/voucher integration | - | 4-6h | voucher flow |

**Total P0:** ~15 endpoints + dashboard (1-2 weeks)
**Total P1:** ~13 endpoints + WebSocket (1-2 weeks)
**Total P2:** ~7 endpoints (3-4 days)

---

**Next:** [05-Implementation-Plan.md](./05-Implementation-Plan.md) - Recommended implementation order and files
