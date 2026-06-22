# Mobile App Screens & Required APIs

## App Structure

**Project:** `com.vietride.passenger`
**Framework:** React Native + Expo
**Architecture:** Feature-based with Zustand state management
**Navigation:** React Navigation (Stack + Bottom Tabs)
**HTTP Client:** Axios with React Query
**State:** Zustand stores + React Query cache

---

## Feature Modules

```
src/
├── features/
│   ├── auth/          - Authentication (4 screens)
│   ├── booking/       - Bus booking (14 screens)
│   ├── parcel/        - Package delivery (5 screens)
│   ├── profile/       - User profile (10 screens)
│   ├── home/          - Dashboard (2 screens)
│   └── chatbot/       - AI assistant (1 screen)
├── shared/
│   ├── api/           - axiosInstance, queryClient
│   ├── utils/         - storage (Keychain)
│   ├── components/    - Reusable UI
│   └── constants/     - Colors, sizes, etc.
└── app/
    ├── navigation/    - RootNavigator, MainTabs, AuthNavigator
    └── App.tsx        - Root component
```

---

## 1. AUTHENTICATION MODULE

**Location:** `src/features/auth/`
**Store:** `useAuthStore`
**Types:** `src/features/auth/types/`

### 1.1 LoginScreen

**File:** `src/features/auth/screens/LoginScreen.tsx`

**Description:** Primary login screen for existing users. Phone/password authentication.

**Current Implementation:**
- Mock: Calls `authStore.setUser(mockUser)` directly
- No API calls
- Navigates to Home on success

**Required APIs:**

| Method | Endpoint | Request | Response | Purpose |
|--------|----------|---------|----------|---------|
| POST | `/v1/auth/login` | `{ phone: string, password: string }` | `{ user: User, token: string, refreshToken: string }` | Authenticate user |

**Data Dependencies:**
- None (standalone)

**Flow:**
1. User enters phone + password
2. Call login API
3. Store tokens in Keychain
4. Store user in auth store
5. Navigate to MainTabs

---

### 1.2 RegisterScreen

**File:** `src/features/auth/screens/RegisterScreen.tsx`

**Description:** New user registration with phone verification.

**Current Implementation:**
- Form validation (Zod)
- Navigates to OTPVerificationScreen on submit (passes phone via params)

**Required APIs:**

| Method | Endpoint | Request | Response | Purpose |
|--------|----------|---------|----------|---------|
| POST | `/v1/auth/register` | `{ fullName: string, phone: string, password: string }` | `{ userId: string, status: string, otpTtlMinutes: number }` | Create account |

**Data Dependencies:**
- None

**Flow:**
1. Fill full name, phone, password
2. Submit → call register API
3. Navigate to OTPVerification with phone
4. Verify OTP to complete

---

### 1.3 OTPVerificationScreen

**File:** `src/features/auth/screens/OTPVerificationScreen.tsx`

**Description:** Verify 4-digit OTP code.

**Current Implementation:**
- 4-digit OTP input with auto-advance
- 59-second countdown for resend
- Mock: accepts any code after 1s

**Required APIs:**

| Method | Endpoint | Request | Response | Purpose |
|--------|----------|---------|----------|---------|
| POST | `/v1/auth/verify-email` | `{ phone: string, code: string }` | `{ userId: string, status: string, user?: UserSummaryDto }` | Verify OTP |

**Note:** Uses generic `VerifyEmail` endpoint with purpose = "REGISTER"

**Flow:**
1. Get phone from navigation params
2. User enters 4-digit code
3. Call verify API
4. On success: store tokens, navigate to Home
5. On failure: show error

---

### 1.4 ForgotPasswordScreen

**File:** `src/features/auth/screens/ForgotPasswordScreen.tsx`

**Description:** Request password reset via email/phone.

**Current Implementation:**
- Input field for email/phone
- Mock: shows success after submit
- Navigates to Login

**Required APIs:**

| Method | Endpoint | Request | Response | Purpose |
|--------|----------|---------|----------|---------|
| POST | `/v1/auth/forgot-password` | `{ emailOrPhone: string }` | `{ success: boolean, message: string }` | Request password reset |

**⚠️ ISSUE:** Backend does NOT have this endpoint. Only has `SetInitialPassword` for admin-created users.

**Workaround needed:**
- Either implement standard forgot password flow on backend
- Or use OTP verification + then allow setting new password

---

## 2. BOOKING MODULE

**Location:** `src/features/booking/`
**Store:** `useBookingStore` (Zustand)
**Types:** `src/features/booking/types/booking.ts`
**Mock Data:** `src/features/booking/data/mockData.ts`

### 2.1 BusSearchScreen (SearchRoutes)

**File:** `src/features/booking/screens/BusSearchScreen.tsx`

**Description:** Main landing page for booking. Search form + popular routes + recent searches.

**Current Implementation:**
- Search form (from, to, date, passengers)
- Uses `MOCK_POPULAR_ROUTES` and `MOCK_RECENT_SEARCHES`
- Navigates to TripResultsScreen on search

**Required APIs:**

| Method | Endpoint | Request | Response | Purpose |
|--------|----------|---------|----------|---------|
| GET | `/v1/routes/popular` | Query: `?limit=20&from=X&to=Y` | `Array<{ id, from, to, price, gradientColors }>` | Fetch popular routes |
| GET | `/v1/routes/recent` | Query: `?limit=10` | `Array<{ id, route, date }>` | Fetch user's recent searches |
| GET | `/v1/cities` | Query: `?q=search&region=` | `Array<{ name, region, id }>` | Cities list for pickers |

**⚠️ Missing APIs:**
- `/v1/routes/popular` - not implemented
- `/v1/routes/recent` - not implemented
- `/v1/cities` - not implemented (stations exist but not simple cities)

**Data Dependencies:**
- Cities list for autocomplete
- Popular routes for quick booking
- Recent searches from local storage could be temporary workaround

---

### 2.2 CityPickerScreen

**File:** `src/features/booking/screens/CityPickerScreen.tsx`

**Description:** Search and select departure/destination city.

**Current Implementation:**
- Hardcoded `CITIES` constant: Ho Chi Minh, Hanoi, Da Nang, Nha Trang, etc.
- Search filter on local array

**Required APIs:**

| Method | Endpoint | Request | Response | Purpose |
|--------|----------|---------|----------|---------|
| GET | `/v1/cities` | Query: `?q={search}&region={region}` | `Array<{ id, name, region }>` | Search cities |

**⚠️ Missing:** `/v1/cities` endpoint

---

### 2.3 DatePickerScreen

**File:** `src/features/booking/screens/DatePickerScreen.tsx`

**Description:** Select departure and return date (30-day window).

**Current Implementation:**
- Client-side date generation (today to today+29 days)
- No API calls

**Required APIs:** None for date selection itself.

**Optional:**
- `GET /v1/routes/available-dates?from={city}&to={city}` - To check which dates have trips
- Could be merged into trip search

---

### 2.4 PassengersPickerScreen

**File:** `src/features/booking/screens/PassengersPickerScreen.tsx`

**Description:** Select number of passengers (1-10).

**Current Implementation:**
- Pure UI (stepper)
- No API calls

**Required APIs:** None

---

### 2.5 TripResultsScreen

**File:** `src/features/booking/screens/TripResultsScreen.tsx`

**Description:** Display search results as trip cards. Shows loading, error, empty states.

**Current Implementation:**
- Calls `bookingStore.searchTrips()` which uses `MOCK_TRIPS`
- 2-second mock delay
- Renders trip cards with price, time, amenities

**Required APIs:**

| Method | Endpoint | Request | Response | Purpose |
|--------|----------|---------|----------|---------|
| GET | `/v1/trips/search` | Query: `from, to, date, passengers, returnDate?` | `Array<BusTrip>` | Search available trips |

**✅ EXISTS:** `TripsController.SearchAsync` in Trip service

**Data Dependencies:**
- Trip data with: id, operatorId, routeId, departureTime, arrivalTime, price, availableSeats, vehicleType, amenities

---

### 2.6 SeatSelectionScreen

**File:** `src/features/booking/screens/SeatSelectionScreen.tsx`

**Description:** Interactive seat map layout for selecting seats.

**Current Implementation:**
- Renders grid layout from `SeatRow[]`
- Uses `MOCK_SEAT_MAP` from store
- Selected seats state management

**Required APIs:**

| Method | Endpoint | Request | Response | Purpose |
|--------|----------|---------|----------|---------|
| GET | `/v1/trips/{tripId}/seat-map` | - | `SeatRow[]` | Get seat layout |
| POST | `/internal/v1/trips/{tripId}/lock-seats` | `{ seatIds: string[], holdMinutes: number }` | `{ success: boolean, holdId: string }` | Lock seats (when selected) |
| POST | `/internal/v1/trips/{tripId}/release-seats` | `{ seatIds: string[] }` | `{ success: boolean }` | Release seat locks |

**✅ EXISTS:** All endpoints in Trip service (InternalTripsController)

**Flow:**
1. Load seat map
2. User selects seats → call lock-seats (with 10-15 min hold)
3. If timeout or cancel → call release-seats
4. On proceed → proceed to pickup with held seats

---

### 2.7 PickUpScreen

**File:** `src/features/booking/screens/PickUpScreen.tsx`

**Description:** Select pickup point from available stops.

**Current Implementation:**
- Renders list from `MOCK_PICK_UP_POINTS`
- Time-distance display
- Radio selection

**Required APIs:**

| Method | Endpoint | Request | Response | Purpose |
|--------|----------|---------|----------|---------|
| GET | `/v1/trips/{tripId}/pickup-points` | - | `Array<PickUpPoint>` | Fetch pickup locations |
| POST | `/v1/trips/{tripId}/pickup-points/confirm` | `{ pointId: string }` | `{ success: boolean }` | Confirm pickup |

**⚠️ MISSING:** No pickup-points endpoints in backend

**Note:** Should derive from route stops with `stopType = PICKUP`

---

### 2.8 DropOffScreen

**File:** `src/features/booking/screens/DropOffScreen.tsx`

**Description:** Select drop-off point from available stops.

**Current Implementation:**
- Renders list from `MOCK_DROP_OFF_POINTS`
- Shows refund amount for early drop-off
- Radio selection

**Required APIs:**

| Method | Endpoint | Request | Response | Purpose |
|--------|----------|---------|----------|---------|
| GET | `/v1/trips/{tripId}/dropoff-points` | - | `Array<DropOffPoint>` | Fetch dropoff locations |
| POST | `/v1/trips/{tripId}/dropoff-points/confirm` | `{ pointId: string }` | `{ success: boolean }` | Confirm dropoff |

**⚠️ MISSING:** No dropoff-points endpoints in backend

---

### 2.9 PaymentScreen

**File:** `src/features/booking/screens/PaymentScreen.tsx`

**Description:** Payment method selection, promo code application, price breakdown.

**Current Implementation:**
- Mock payment methods: 'vnpay', 'card'
- Mock promo code: "VIETRIDE10" → 10% discount
- Total calculation (subtotal - discount)

**Required APIs:**

| Method | Endpoint | Request | Response | Purpose |
|--------|----------|---------|----------|---------|
| POST | `/v1/payments/apply-promo` | `{ code: string, tripId: string, totalAmount: number }` | `{ valid: boolean, discount: number, message: string }` | Validate promo |
| POST | `/v1/payments/create` | `{ bookingData: {...}, paymentMethod: 'vnpay'\|'card' }` | `{ paymentIntentId, redirectUrl?, qrCode? }` | Create payment intent |
| GET | `/v1/payments/{paymentId}/status` | - | `{ status: 'pending'\|'completed'\|'failed' }` | Check payment status |

**⚠️ MISSING:**
- `/v1/payments/apply-promo` - no promo/voucher application endpoint
- `/v1/payments/create` - no general payment creation
- `/v1/payments/{id}/status` - no status polling

**Note:** Payment service has wallet top-up but not booking payments.

---

### 2.10 CheckoutScreen

**File:** `src/features/booking/screens/CheckoutScreen.tsx`

**Description:** Final review - contact info, pickup/drop-off confirmation.

**Current Implementation:**
- Displays all booking summary from store
- Save contact info toggle

**Required APIs:**

| Method | Endpoint | Request | Response | Purpose |
|--------|----------|---------|----------|---------|
| GET | `/v1/users/me/contact-info` | - | `{ fullName, phone, email }` | Fetch saved contact |
| POST | `/v1/users/contact-info` | `{ fullName, phoneCountryCode, phone, email }` | `{ success: boolean }` | Save contact |

**⚠️ MISSING:**
- `/v1/users/me/contact-info` - no dedicated endpoint (use /v1/users/me but not separate)
- `/v1/users/contact-info` - no update endpoint

---

### 2.11 CreateTicketBookingScreen

**File:** `src/features/booking/screens/CreateTicketBookingScreen.tsx`

**Description:** Final booking confirmation and submission.

**Current Implementation:**
- Calls `bookingStore.createTicketBooking()` → mock bookingRef
- Navigates to DigitalTicket

**Required APIs:**

| Method | Endpoint | Request | Response | Purpose |
|--------|----------|---------|----------|---------|
| POST | `/v1/bookings` | `{ tripId, seatIds, contactInfo, pickupPointId, dropoffPointId, paymentMethod, isRoundTrip?, returnTripData? }` | `{ bookingRef, status, passengerName, ... }` | Create booking |

**✅ EXISTS:** `BookingsController.CreateBooking` in Booking service

---

### 2.12 DigitalTicketScreen

**File:** `src/features/booking/screens/DigitalTicketScreen.tsx`

**Description:** Display confirmed ticket with QR code.

**Current Implementation:**
- Mock QR code (placeholder)
- Shows booking details from store

**Required APIs:**

| Method | Endpoint | Request | Response | Purpose |
|--------|----------|---------|----------|---------|
| GET | `/v1/bookings/{bookingRef}` | - | `BookingResult` | Get booking details |
| GET | `/v1/bookings/{bookingRef}/ticket` | - | `{ qrCodeUrl: string, ticketImageUrl? }` | Get ticket/QR |

**⚠️ MISSING:**
- `/v1/bookings/{bookingRef}` - no GET booking by reference
- `/v1/bookings/{bookingRef}/ticket` - no ticket generation

---

### 2.13 TrackingScreen

**File:** `src/features/booking/screens/TrackingScreen.tsx`

**Description:** Live GPS tracking of bus on route with timeline.

**Current Implementation:**
- Uses `MOCK_TICKET_STOPS` with static coordinates
- Animated pin movement (mocked)
- ETA display

**Required APIs:**

| Method | Endpoint | Request | Response | Purpose |
|--------|----------|---------|----------|---------|
| GET | `/v1/tracking/trips/{tripId}/latest` | - | `{ currentLocation: {lat, lng}, stops[] }` | Get latest location |
| GET | `/v1/tracking/trips/{tripId}/eta` | - | `{ eta: number, nextStop: Stop }` | Get ETA |
| GET | `/v1/tracking/trips/{tripId}/trail` | - | `Array<{lat, lng, timestamp}>` | Get location trail |
| WebSocket | `wss://ws.vietride.dev/tracking/{tripId}` | - | Real-time updates | Real-time location |

**✅ EXISTS:** REST endpoints in Tracking service
**⚠️ MISSING:** WebSocket server

---

### 2.14 PopularRoutesScreen

**File:** `src/features/booking/screens/PopularRoutesScreen.tsx`

**Description:** Display all popular routes with search/filter.

**Current Implementation:**
- Uses `MOCK_POPULAR_ROUTES`
- Search bar + filter chips

**Required APIs:**

| Method | Endpoint | Request | Response | Purpose |
|--------|----------|---------|----------|---------|
| GET | `/v1/routes/popular` | `?page=1&limit=20&from=X&to=Y` | `Array<RouteCard>` | List popular routes |

**⚠️ MISSING:** Same as BusSearchScreen

---

## 3. PARCEL MODULE

**Location:** `src/features/parcel/`
**Store:** `useParcelStore` (Zustand)
**Types:** `src/features/parcel/types.ts`

**⚠️ STATUS: Backend parcel service NOT implemented at all**

---

### 3.1 CreateParcelScreen

**File:** `src/features/parcel/screens/CreateParcelScreen.tsx`

**Description:** Multi-step wizard for creating new parcel shipment.

**Current Implementation:**
- Multi-step form: station → city → category → details → photos → review
- Uses `MOCK_STATIONS`, `MOCK_CATEGORIES`, `MOCK_GALLERY_PHOTOS`

**Required APIs:**

| Method | Endpoint | Request | Response | Purpose |
|--------|----------|---------|----------|---------|
| GET | `/v1/parcel/stations` | - | `Station[]` | List all stations |
| GET | `/v1/parcel/categories` | - | `Category[]` | Get package categories |
| POST | `/v1/parcel/estimate` | `{ fromCity, toCity, weight, size, categoryId }` | `{ estimatedPrice, deliveryTime }` | Calculate price |
| POST | `/v1/parcel/upload-photo` | FormData: `{ photo, type }` | `{ url, thumbnailUrl }` | Upload package photo |

**❌ MISSING:** All endpoints

---

### 3.2 CityPickerScreen (Parcel)

**File:** `src/features/parcel/screens/CityPickerScreen.tsx`

**Description:** Select origin/destination cities for parcel.

**Required APIs:**

| Method | Endpoint | Request | Response | Purpose |
|--------|----------|---------|----------|---------|
| GET | `/v1/cities` | `?q=` | `Array<{ id, name, region }>` | Cities list |

**❌ MISSING**

---

### 3.3 DistrictPickerScreen

**File:** `src/features/parcel/screens/DistrictPickerScreen.tsx`

**Description:** Select destination district within city.

**Required APIs:**

| Method | Endpoint | Request | Response | Purpose |
|--------|----------|---------|----------|---------|
| GET | `/v1/parcel/cities/{city}/districts` | - | `Array<{ id, name, wardCount }>` | Districts list |

**❌ MISSING**

---

### 3.4 ParcelDetailScreen

**File:** `src/features/parcel/screens/ParcelDetailScreen.tsx`

**Description:** Show booking confirmation ticket for parcel.

**Current Implementation:**
- Mock QR code
- Shows parcel details from store

**Required APIs:**

| Method | Endpoint | Request | Response | Purpose |
|--------|----------|---------|----------|---------|
| GET | `/v1/parcel/{parcelId}` | - | `{ parcelId, status, fromCity, toCity, ... }` | Get parcel details |
| GET | `/v1/parcel/{parcelId}/ticket` | - | `{ qrCodeUrl }` | Get ticket QR |

**❌ MISSING**

---

### 3.5 ParcelTrackingScreen

**File:** `src/features/parcel/screens/ParcelTrackingScreen.tsx`

**Description:** Track parcel delivery status and timeline.

**Current Implementation:**
- Uses `MILESTONES` and `PARCEL_TRACKING_POINTS` mock data
- Static timeline

**Required APIs:**

| Method | Endpoint | Request | Response | Purpose |
|--------|----------|---------|----------|---------|
| GET | `/v1/parcel/{parcelId}/tracking` | - | `{ milestones[], currentLocation }` | Get tracking data |
| WebSocket | `wss://ws.vietride.dev/parcel/{parcelId}` | - | Real-time updates | Real-time tracking |

**❌ MISSING:** Entire endpoints

---

## 4. PROFILE MODULE

**Location:** `src/features/profile/`
**Navigator:** `ProfileNavigator.tsx`
**Store:** `useAuthStore` for user data

---

### 4.1 ProfileOverviewScreen

**File:** `src/features/profile/screens/ProfileOverviewScreen.tsx`

**Description:** Main profile page with user info card and menu.

**Current Implementation:**
- Displays user from `useAuthStore`
- Wallet balance display (hardcoded `1,500,000`)
- Menu items to other screens

**Required APIs:**

| Method | Endpoint | Request | Response | Purpose |
|--------|----------|---------|----------|---------|
| GET | `/v1/users/me` | - | `UserSummaryDto` | Load profile on app start |

**✅ EXISTS:** `UsersController.GetMe`

---

### 4.2 EditProfileScreen

**File:** `src/features/profile/screens/EditProfileScreen.tsx`

**Description:** Edit user profile details (name, email, avatar).

**Current Implementation:**
- Fields: Full name (required), Email (optional)
- 6 preset avatar URLs to choose from
- Save button updates local store only

**Required APIs:**

| Method | Endpoint | Request | Response | Purpose |
|--------|----------|---------|----------|---------|
| PUT | `/v1/users/me` | `{ fullName?, email? }` | `{ user: UserSummaryDto }` | Update profile |
| POST | `/v1/users/me/avatar` | FormData: `{ avatar: File }` | `{ avatarUrl: string }` | Upload avatar |

**❌ MISSING:** Both endpoints

---

### 4.3 BookingHistoryScreen

**File:** `src/features/profile/screens/BookingHistoryScreen.tsx`

**Description:** View all past bookings (tickets and parcels) with tabs.

**Current Implementation:**
- Two tabs: Tickets, Parcels
- Uses `mockTickets` and `MOCK_SHIPMENTS`

**Required APIs:**

| Method | Endpoint | Request | Response | Purpose |
|--------|----------|---------|----------|---------|
| GET | `/v1/users/me/bookings` | `?page=1&limit=20&status=all` | `PagedResult<Booking>` | Get ticket booking history |
| GET | `/v1/users/me/parcels` | `?page=1&limit=20` | `Array<Parcel>` | Get parcel history |

**⚠️ `/v1/users/me/bookings`:** Exists but stub (returns empty)
**❌ `/v1/users/me/parcels`:** Not implemented

---

### 4.4 WalletScreen

**File:** `src/features/profile/screens/WalletScreen.tsx`

**Description:** Wallet balance, transaction history, payment methods management.

**Current Implementation:**
- Balance display (hardcoded)
- Transaction list from `INITIAL_TRANSACTIONS` mock

**Required APIs:**

| Method | Endpoint | Request | Response | Purpose |
|--------|----------|---------|----------|---------|
| GET | `/v1/wallet` | - | `{ balance: number }` | Get wallet balance |
| GET | `/v1/wallet/transactions` | `?page=1&limit=20&type=all` | `Transaction[]` | Get transaction history |
| GET | `/v1/wallet/payment-methods` | - | `PaymentMethod[]` | Get saved payment methods |

**✅ `/v1/wallet`:** Exists
**✅ `/v1/wallet/transactions`:** Exists
**❌ `/v1/wallet/payment-methods`:** Not implemented

---

### 4.5 TopUpScreen

**File:** `src/features/profile/screens/TopUpScreen.tsx`

**Description:** Add funds to wallet via payment methods.

**Current Implementation:**
- Amount input (presets: 100k, 200k, 500k, 1M)
- Mock VNPay redirect

**Required APIs:**

| Method | Endpoint | Request | Response | Purpose |
|--------|----------|---------|----------|---------|
| POST | `/v1/wallet/top-up` | `{ amount: number, paymentMethod: string }` | `{ paymentIntentId, redirectUrl? }` | Create top-up |

**✅ EXISTS:** `WalletController.CreateTopUp`

---

### 4.6 WithdrawScreen

**File:** `src/features/profile/screens/WithdrawScreen.tsx`

**Description:** Withdraw wallet funds to bank card or e-wallet.

**Current Implementation:**
- Amount input
- Payment method selection
- Mock timeout

**Required APIs:**

| Method | Endpoint | Request | Response | Purpose |
|--------|----------|---------|----------|---------|
| POST | `/v1/wallet/withdraw` | `{ amount, destinationMethodId }` | `{ withdrawalId, status }` | Request withdrawal |
| GET | `/v1/wallet/withdrawals/{id}` | - | `{ status, processedAt }` | Check withdrawal status |

**❌ MISSING:** Both endpoints

---

### 4.7 AddPaymentMethodScreen

**File:** `src/features/profile/screens/AddPaymentMethodScreen.tsx`

**Description:** Add new payment method (card, Momo, VNPay).

**Current Implementation:**
- Card form (number, holder, expiry, cvv)
- Momo phone number
- Mock save

**Required APIs:**

| Method | Endpoint | Request | Response | Purpose |
|--------|----------|---------|----------|---------|
| POST | `/v1/wallet/payment-methods` | `{ type: 'card', cardNumber, cardHolder, expiry, cvv }` or `{ type: 'momo', phoneNumber }` | `{ paymentMethod }` | Add payment method |
| POST | `/v1/payment-methods/verify` | `{ methodId }` | `{ success }` | Verify with test charge |

**❌ MISSING:** Both endpoints

---

### 4.8 SavedPaymentsScreen

**File:** `src/features/profile/screens/SavedPaymentsScreen.tsx`

**Description:** View and manage saved payment methods.

**Required APIs:**

| Method | Endpoint | Request | Response | Purpose |
|--------|----------|---------|----------|---------|
| GET | `/v1/wallet/payment-methods` | - | `PaymentMethod[]` | List all |
| DELETE | `/v1/wallet/payment-methods/{id}` | - | `{ success }` | Remove method |
| POST | `/v1/wallet/payment-methods/{id}/set-default` | - | `{ success }` | Set default |

**❌ MISSING:** All endpoints

---

### 4.9 SettingsScreen

**File:** `src/features/profile/screens/SettingsScreen.tsx`

**Description:** App settings (language, notifications, theme, privacy).

**Current Implementation:**
- Local state for toggles
- No API persistence

**Required APIs:**

| Method | Endpoint | Request | Response | Purpose |
|--------|----------|---------|----------|---------|
| GET | `/v1/users/me/settings` | - | `{ language, notifications, theme, ... }` | Get settings |
| PUT | `/v1/users/me/settings` | Partial settings | `{ success }` | Update settings |

**❌ MISSING:** Both endpoints

---

### 4.10 ThemeScreen

**File:** `src/features/profile/screens/ThemeScreen.tsx`

**Description:** Theme selection (light/dark/system).

**Current Implementation:**
- Local state using ThemeContext
- No API persistence

**Required APIs:**
- Could use `/v1/users/me/settings` above

---

## 5. HOME MODULE

**Location:** `src/features/home/`

---

### 5.1 HomeScreen

**File:** `src/features/home/screens/HomeScreen.tsx`

**Description:** Main dashboard with booking shortcuts, recent shipments, news/promos.

**Current Implementation:**
- Uses booking/parcel stores
- Mock sections: recent bookings, promotions

**Required APIs:**

| Method | Endpoint | Request | Response | Purpose |
|--------|----------|---------|----------|---------|
| GET | `/v1/home/dashboard` | - | `{ recentBookings[], recentShipments[], promotions[], walletBalance? }` | Dashboard data |
| GET | `/v1/news` | - | `Array<{ id, title, imageUrl, link }>` | News/promotions |

**❌ MISSING:** Both endpoints

---

### 5.2 NotificationScreen

**File:** `src/features/home/screens/NotificationScreen.tsx`

**Description:** List all user notifications.

**Current Implementation:**
- Not fully shown but likely uses local state

**Required APIs:**

| Method | Endpoint | Request | Response | Purpose |
|--------|----------|---------|----------|---------|
| GET | `/v1/notifications` | `?page=1&limit=20&read=false` | `Notification[]` | Get notifications |
| PATCH | `/v1/notifications/{id}` | - | `{ success }` | Mark as read |
| POST | `/v1/notifications/read-all` | - | `{ success }` | Mark all as read |

**✅ GET/PATCH:** Exists in Notification service
**❌ POST read-all:** Missing

---

## 6. CHATBOT MODULE

**Location:** `src/features/chatbot/`

---

### 6.1 ChatbotScreen

**File:** `src/features/chatbot/screens/ChatbotScreen.tsx`

**Description:** AI assistant chat interface for customer support.

**Current Implementation:**
- Mock responses with predefined answers
- No API integration

**Required APIs:**

| Method | Endpoint | Request | Response | Purpose |
|--------|----------|---------|----------|---------|
| POST | `/v1/chatbot/message` | `{ message, language?, context? }` | `{ reply, suggestions?, quickActions? }` | Send message |
| WebSocket | `wss://ws.vietride.dev/chatbot` | - | Real-time chat | Streaming responses |

**⚠️ ISSUE:** Backend has `/api/v1/rag/chat` but requires Internal JWT (for service-to-service), not public.

**Need:** Gateway to expose public endpoint or add auth layer.

---

## 7. TRACKING MODULE

**Location:** Used by Booking module

**Coverage:** See 2.13 TrackingScreen above

---

## 8. NAVIGATION STRUCTURE

**File:** `src/app/navigation/RootNavigator.tsx`

### Auth Flow (Stack)

```
LoginScreen
├─→ RegisterScreen
├─→ OTPVerificationScreen
└─→ ForgotPasswordScreen
```

### Main Flow (Bottom Tabs)

```
MainTabs
├─ HomeScreen (booking & recent shipments)
├─ NotificationScreen
├─ ChatbotTab (placeholder)
└─ ProfileScreen (Stack)
    ├─ ProfileOverviewScreen
    ├─ BookingHistoryScreen
    ├─ WalletScreen
    ├─ TopUpScreen
    ├─ WithdrawScreen
    ├─ EditProfileScreen
    ├─ SavedPaymentsScreen
    ├─ AddPaymentMethodScreen
    ├─ SettingsScreen
    └─ ThemeScreen
```

### Modal Flows

```
(Modals stacked on MainTabs)
├─ BookingStack
│  ├─ BusSearchScreen
│  ├─ CityPickerScreen
│  ├─ DatePickerScreen
│  ├─ PassengersPickerScreen
│  ├─ TripResultsScreen
│  ├─ SeatSelectionScreen
│  ├─ PickUpScreen
│  ├─ DropOffScreen
│  ├─ PaymentScreen
│  ├─ CheckoutScreen
│  ├─ CreateTicketBookingScreen
│  ├─ DigitalTicketScreen
│  └─ TrackingScreen
└─ ParcelStack
   ├─ CreateParcelScreen (multi-step)
   ├─ CityPickerScreen
   ├─ DistrictPickerScreen
   ├─ ParcelDetailScreen
   └─ ParcelTrackingScreen
```

---

## API Requirements Summary by Screen

| Screen | Required APIs | Status |
|--------|--------------|--------|
| LoginScreen | 1 | ✅ |
| RegisterScreen | 1 | ✅ |
| OTPVerificationScreen | 1 | ✅ |
| ForgotPasswordScreen | 1 | ❌ |
| BusSearchScreen | 3 | ❌ |
| CityPickerScreen | 1 | ❌ |
| DatePickerScreen | 0 | ✅ |
| PassengersPickerScreen | 0 | ✅ |
| TripResultsScreen | 1 | ✅ |
| SeatSelectionScreen | 3 | ✅ |
| PickUpScreen | 2 | ❌ |
| DropOffScreen | 2 | ❌ |
| PaymentScreen | 3 | ❌ |
| CheckoutScreen | 2 | ❌ |
| CreateTicketBookingScreen | 1 | ✅ |
| DigitalTicketScreen | 2 | ❌ |
| TrackingScreen | 3 (2 REST + WS) | ⚠️ (REST ✅, WS ❌) |
| PopularRoutesScreen | 1 | ❌ |
| CreateParcelScreen | 4 | ❌ |
| CityPickerScreen (Parcel) | 1 | ❌ |
| DistrictPickerScreen | 1 | ❌ |
| ParcelDetailScreen | 2 | ❌ |
| ParcelTrackingScreen | 2 (1 REST + WS) | ❌ |
| ProfileOverviewScreen | 1 | ✅ |
| EditProfileScreen | 2 | ❌ |
| BookingHistoryScreen | 2 | ❌ |
| WalletScreen | 3 (2 ✅, 1 ❌) | ⚠️ |
| TopUpScreen | 1 | ✅ |
| WithdrawScreen | 2 | ❌ |
| AddPaymentMethodScreen | 2 | ❌ |
| SavedPaymentsScreen | 3 | ❌ |
| SettingsScreen | 2 | ❌ |
| ThemeScreen | 0 | ✅ |
| NotificationScreen | 3 (2 ✅, 1 ❌) | ⚠️ |
| ChatbotScreen | 1 (or WS) | ❌ |
| HomeScreen | 2 | ❌ |

---

## Total Counts

- **Screens:** 41
- **APIs Required:** ~60+ (some screens need multiple)
- **APIs Available:** ~26
- **APIs Missing:** ~34+

---

**Next:** [04-Gap-Analysis.md](./04-Gap-Analysis.md) - Chi tiết thiếu hụt theo từng module
