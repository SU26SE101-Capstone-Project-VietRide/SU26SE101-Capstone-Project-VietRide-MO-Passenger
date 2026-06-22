# File References - Source Code Locations

## Mobile App (React Native)

### Navigation
| File | Purpose |
|------|---------|
| `src/app/navigation/RootNavigator.tsx` | Root navigator (Auth vs Main) |
| `src/app/navigation/MainTabNavigator.tsx` | Bottom tabs (Home, Profile, etc.) |
| `src/app/navigation/AuthNavigator.tsx` | Auth stack (Login, Register, OTP) |
| `src/app/navigation/types.ts` | Navigation param types |

### Features

#### Auth
| File | Description |
|------|-------------|
| `src/features/auth/screens/LoginScreen.tsx` | Login form |
| `src/features/auth/screens/RegisterScreen.tsx` | Registration form |
| `src/features/auth/screens/OTPVerificationScreen.tsx` | OTP verification |
| `src/features/auth/screens/ForgotPasswordScreen.tsx` | Password reset request |
| `src/features/auth/store/useAuthStore.ts` | Auth state (Zustand) |
| `src/features/auth/types/index.ts` | Auth types (User, LoginCredentials, etc.) |
| `src/features/auth/components/` | Reusable auth components |

#### Booking
| File | Description |
|------|-------------|
| `src/features/booking/screens/BusSearchScreen.tsx` | Search form (SearchRoutes) |
| `src/features/booking/screens/CityPickerScreen.tsx` | City selector |
| `src/features/booking/screens/DatePickerScreen.tsx` | Date selector |
| `src/features/booking/screens/PassengersPickerScreen.tsx` | Passenger count |
| `src/features/booking/screens/TripResultsScreen.tsx` | Trip list results |
| `src/features/booking/screens/SeatSelectionScreen.tsx` | Seat map |
| `src/features/booking/screens/PickUpScreen.tsx` | Pickup point |
| `src/features/booking/screens/DropOffScreen.tsx` | Dropoff point |
| `src/features/booking/screens/PaymentScreen.tsx` | Payment method |
| `src/features/booking/screens/CheckoutScreen.tsx` | Contact info review |
| `src/features/booking/screens/CreateTicketBookingScreen.tsx` | Booking submission |
| `src/features/booking/screens/DigitalTicketScreen.tsx` | Ticket/QR display |
| `src/features/booking/screens/TrackingScreen.tsx` | Bus tracking |
| `src/features/booking/screens/PopularRoutesScreen.tsx` | Popular routes list |
| `src/features/booking/store/useBookingStore.ts` | Booking state (Zustand) |
| `src/features/booking/types/booking.ts` | Booking types (BusTrip, SeatRow, etc.) |
| `src/features/booking/data/mockData.ts` | Mock data (MOCK_TRIPS, MOCK_SEAT_MAP, etc.) |

#### Parcel
| File | Description |
|------|-------------|
| `src/features/parcel/screens/CreateParcelScreen.tsx` | Multi-step creation |
| `src/features/parcel/screens/CityPickerScreen.tsx` | City selector |
| `src/features/parcel/screens/DistrictPickerScreen.tsx` | District selector |
| `src/features/parcel/screens/ParcelDetailScreen.tsx` | Parcel ticket |
| `src/features/parcel/screens/ParcelTrackingScreen.tsx` | Parcel tracking |
| `src/features/parcel/store/useParcelStore.ts` | Parcel state (Zustand) |
| `src/features/parcel/types.ts` | Parcel types |
| `src/features/parcel/data/mockData.ts` | Mock stations, categories |

#### Profile
| File | Description |
|------|-------------|
| `src/features/profile/screens/ProfileOverviewScreen.tsx` | Main profile page |
| `src/features/profile/screens/EditProfileScreen.tsx` | Edit name/email/avatar |
| `src/features/profile/screens/BookingHistoryScreen.tsx` | History tabs |
| `src/features/profile/screens/WalletScreen.tsx` | Wallet balance + transactions |
| `src/features/profile/screens/TopUpScreen.tsx` | Add funds |
| `src/features/profile/screens/WithdrawScreen.tsx` | Withdraw funds |
| `src/features/profile/screens/AddPaymentMethodScreen.tsx` | Add card/momo |
| `src/features/profile/screens/SavedPaymentsScreen.tsx` | Manage payment methods |
| `src/features/profile/screens/SettingsScreen.tsx` | App settings |
| `src/features/profile/screens/ThemeScreen.tsx` | Theme selector |
| `src/features/profile/ProfileNavigator.tsx` | Profile stack |
| `src/features/profile/types/index.ts` | Profile types |

#### Home
| File | Description |
|------|-------------|
| `src/features/home/screens/HomeScreen.tsx` | Dashboard |
| `src/features/home/screens/NotificationScreen.tsx` | Notifications list |

#### Chatbot
| File | Description |
|------|-------------|
| `src/features/chatbot/screens/ChatbotScreen.tsx` | Chat UI |

### Shared

| File | Description |
|------|-------------|
| `src/shared/api/axiosInstance.ts` | Axios client with interceptors |
| `src/shared/api/queryClient.ts` | React Query config |
| `src/shared/utils/storage.ts` | Keychain token storage |
| `src/shared/theme/ThemeContext.tsx` | Theme provider |
| `src/shared/components/` | Reusable UI components |
| `src/shared/constants/` | Colors, sizes, API config |
| `src/shared/hooks/` | Custom hooks |
| `src/shared/utils/` | Helpers (format, validation, etc.) |

### App
| File | Description |
|------|-------------|
| `src/app/App.tsx` | Root component with providers |
| `src/app/providers/` | Context providers (Theme, Query, etc.) |

---

## Backend (.NET + NestJS)

### Gateway (NestJS)

| File | Purpose |
|------|---------|
| `apps/gateway/src/main.ts` | Entry point |
| `apps/gateway/src/app.module.ts` | Module definition |
| `apps/gateway/src/config/routes.ts` | **Route mapping** (lines 40-315) |
| `apps/gateway/src/proxy/proxy.middleware.ts` | Proxy logic (lines 141-292) |
| `apps/gateway/src/auth/user-jwt.middleware.ts` | User JWT validation |
| `apps/gateway/src/auth/user-jwt.verifier.ts` | JWKS verification |
| `apps/gateway/src/health/health.controller.ts` | Health endpoint |
| `apps/gateway/src/app/ready.controller.ts` | Ready endpoint |

### Identity Service (.NET 8)

**Controllers:**
| File | Endpoints |
|------|-----------|
| `apps/identity/src/VietRide.Identity.Api/Controllers/AuthController.cs` | Register, VerifyEmail, SetInitialPassword, Login, Google, Refresh, Logout |
| `apps/identity/src/VietRide.Identity.Api/Controllers/UsersController.cs` | GetMe, CompleteProfile |
| `apps/identity/src/VietRide.Identity.Api/Controllers/PassengerController.cs` | GetMe (alias) |
| `apps/identity/src/VietRide.Identity.Api/Controllers/OperatorsController.cs` | Operator register |
| `apps/identity/src/VietRide.Identity.Api/Controllers/OperatorProfileController.cs` | Get/Patch operator profile |
| `apps/identity/src/VietRide.Identity.Api/Controllers/OperatorUsersController.cs` | List, Create operator users, ResendInitialPassword |
| `apps/identity/src/VietRide.Identity.Api/Controllers/AdminOperatorsController.cs` | List, Create, Approve, Reject, Suspend operators |
| `apps/identity/src/VietRide.Identity.Api/Controllers/AdminUsersController.cs` | CreateAdminUser |
| `apps/identity/src/VietRide.Identity.Api/Controllers/AdminOperatorUsersController.cs` | List operator users |
| `apps/identity/src/VietRide.Identity.Api/Controllers/DevicesController.cs` | RegisterDeviceToken, RemoveDeviceToken |
| `apps/identity/src/VietRide.Identity.Api/Controllers/InternalOperatorsController.cs` | Internal operator endpoints |
| `apps/identity/src/VietRide.Identity.Api/Controllers/InternalUsersController.cs` | Internal user endpoints |
| `apps/identity/src/VietRide.Identity.Api/Controllers/JwksController.cs` | JWKS public keys |
| `apps/identity/src/VietRide.Identity.Api/Controllers/PingController.cs` | Health ping |

**Application/Handlers:**
| File | Purpose |
|------|---------|
| `apps/identity/src/VietRide.Identity.Application/Features/Auth/Register/RegisterCommandHandler.cs` | Registration logic |
| `apps/identity/src/VietRide.Identity.Application/Features/Auth/Login/LoginCommandHandler.cs` | Login + lockout |
| `apps/identity/src/VietRide.Identity.Application/Features/Auth/Refresh/RefreshCommandHandler.cs` | Token rotation + reuse detection |
| `apps/identity/src/VietRide.Identity.Application/Features/Auth/Logout/LogoutCommandHandler.cs` | Revoke token |
| `apps/identity/src/VietRide.Identity.Domain/Entities/RefreshToken.cs` | Refresh token entity |
| `apps/identity/src/VietRide.Identity.Domain/Enums/UserStatus.cs` | PENDING_EMAIL_VERIFICATION, LOCKED, etc. |

**Shared Types:**
| File | Purpose |
|------|---------|
| `libs/dotnet/VietRide.Shared/Models/Api/TokenBundleDto.cs` | Token response |
| `libs/dotnet/VietRide.Shared/Models/Api/UserSummaryDto.cs` | User profile |
| `libs/dotnet/VietRide.Shared/Models/Api/ApiResponse.cs` | Response envelope |
| `libs/dotnet/VietRide.Shared/Exceptions/BadRequestException.cs` | 400 errors |
| `libs/dotnet/VietRide.Shared.Exceptions/NotFoundException.cs` | 404 errors |
| `libs/dotnet/VietRide.Shared.Exceptions/ConflictException.cs` | 409 errors |
| `libs/dotnet/VietRide.Shared.Exceptions/ForbiddenException.cs` | 403 errors |
| `libs/dotnet/VietRide.Shared/Exceptions/UnauthorizedException.cs` | 401 errors |
| `libs/dotnet/VietRide.Shared/Exceptions/TooManyRequestsException.cs` | 429 errors |
| `libs/dotnet/VietRide.Shared/Exceptions/CodedValidationException.cs` | Validation errors |

---

### Trip Service (.NET 8)

**Controllers:**
| File | Endpoints |
|------|-----------|
| `apps/trip/src/VietRide.Trip.Api/Controllers/TripsController.cs` | Search, GetTrip, GetSeatMap |
| `apps/trip/src/VietRide.Trip.Api/Controllers/OperatorRoutesController.cs` | CRUD routes + stops + fares + alternatives |
| `apps/trip/src/VietRide.Trip.Api/Controllers/OperatorAlternativeRoutesController.cs` | Patch, Delete alternatives |
| `apps/trip/src/VietRide.Trip.Api/Controllers/StationsController.cs` | Search stations |
| `apps/trip/src/VietRide.Trip.Api/Controllers/OperatorStationsController.cs` | Create/link/list stations |
| `apps/trip/src/VietRide.Trip.Api/Controllers/OperatorStopsController.cs` | CRUD stops |
| `apps/trip/src/VietRide.Trip.Api/Controllers/VehicleTypesController.cs` | List vehicle types |
| `apps/trip/src/VietRide.Trip.Api/Controllers/OperatorVehiclesController.cs` | CRUD vehicles |
| `apps/trip/src/VietRide.Trip.Api/Controllers/OperatorDriverSchedulesController.cs` | Create/activate schedules |
| `apps/trip/src/VietRide.Trip.Api/Controllers/InternalTripsController.cs` | Lock seats, release seats, book seats, round-trip lock |
| `apps/trip/src/VietRide.Trip.Api/Controllers/InternalStationsController.cs` | Get station (internal) |
| `apps/trip/src/VietRide.Trip.Api/Controllers/InternalStopsController.cs` | Get stop (internal) |
| `apps/trip/src/VietRide.Trip.Api/Controllers/PingController.cs` | Health ping |

---

### Booking Service (.NET 8)

**Controllers:**
| File | Endpoints |
|------|-----------|
| `apps/booking/src/VietRide.Booking.Api/Controllers/BookingsController.cs` | CreateBooking, CreateRoundTripBooking, EditPickup, EditDropoff |
| `apps/booking/src/VietRide.Booking.Api/Controllers/AdminVouchersController.cs` | ListVouchers, CreateVoucher (admin) |
| `apps/booking/src/VietRide.Booking.Api/Controllers/OperatorVouchersController.cs` | CRUD operator vouchers |
| `apps/booking/src/VietRide.Booking.Api/Controllers/AdminVoucherConsentsController.cs` | List consents (admin) |
| `apps/booking/src/VietRide.Booking.Api/Controllers/OperatorVoucherConsentsController.cs` | List, Accept, Reject consents |
| `apps/booking/src/VietRide.Booking.Api/Controllers/PingController.cs` | Health ping |

---

### Payment Service (.NET 8)

**Controllers:**
| File | Endpoints |
|------|-----------|
| `apps/payment/src/VietRide.Payment.Api/Controllers/WalletController.cs` | GetWallet, GetWalletTransactions, CreateTopUp |
| `apps/payment/src/VietRide.Payment.Api/Controllers/VnPayIpnController.cs` | ConfirmTopUp (IPN callback) |
| `apps/payment/src/VietRide.Payment.Api/Controllers/InternalPaymentsController.cs` | BatchCharge (internal) |
| `apps/payment/src/VietRide.Payment.Api/Controllers/PingController.cs` | Health ping |

---

### Parcel Service (.NET 8)

**Status:** ❌ NOT IMPLEMENTED
**Location:** `apps/parcel/src/VietRide.Parcel.Api/Controllers/`
**Only file:** `PingController.cs`

**Needs:** Full implementation of all parcel endpoints

---

### Notification Service (NestJS)

**Controllers:**
| File | Endpoints |
|------|-----------|
| `apps/notification/src/notifications/notifications.controller.ts` | listNotifications, markRead |
| `apps/notification/src/notifications/internal-emails.controller.ts` | enqueueEmail (internal) |
| `apps/notification/src/app/health.controller.ts` | Health |
| `apps/notification/src/app/ready.controller.ts` | Ready |

---

### RAG Service (NestJS)

**Controllers:**
| File | Endpoints |
|------|-----------|
| `apps/rag/src/chat/chat.controller.ts` | create (SSE, internal JWT) |
| `apps/rag/src/chat/feedback.controller.ts` | create, list feedback (internal) |
| `apps/rag/src/documents/documents.controller.ts` | create, approve (internal + admin) |
| `apps/rag/src/admin-config/runtime-config-admin.controller.ts` | Config CRUD (internal + admin) |
| `apps/rag/src/app/health.controller.ts` | Health |
| `apps/rag/src/app/ready.controller.ts` | Ready |

---

### Tracking Service (.NET 8)

**Controllers:**
| File | Endpoints |
|------|-----------|
| `apps/tracking/src/tracking-data/tracking-data.controller.ts` | getLatest, getEta, getTrail |
| `apps/tracking/src/PingController.cs` | Health ping |

---

## Configuration Files

| File | Purpose |
|------|---------|
| `apps/gateway/.env` | Gateway env (service URLs, JWT secrets) |
| `apps/identity/appsettings.json` | Identity DB, JWT, Email settings |
| `apps/trip/appsettings.json` | Trip DB connection |
| `apps/booking/appsettings.json` | Booking DB |
| `apps/payment/appsettings.json` | Payment DB, VNPay config |
| `apps/notification/.env` | Notification (SendGrid, FCM) |
| `apps/rag/.env` | RAG (OpenAI, Pinecone, etc.) |
| `apps/tracking/appsettings.json` | Tracking DB |
| `docker-compose.yml` (root) | Local dev environment |
| `deploy/kubernetes/` | K8s manifests |

---

## Database

**Migrations location (per service):**
- `.NET`: `apps/{service}/src/{Service}.Api/Migrations/`
- `NestJS`: Uses Prisma or TypeORM (check)

**Shared library DB entities:**
- `libs/dotnet/VietRide.Shared.Domain/Entities/` - User, RefreshToken, etc.

---

## Common Patterns

### Authorization

**User JWT:** RS256, validated by gateway, claims:
```
sub: userId
role: PASSENGER | OPERATOR_ADMIN | OPERATOR_STAFF | SYSTEM_ADMIN
email: user@example.com
```

**Internal JWT:** HS256, for service-to-service:
```
iss: service-name
sub: userId
```

### Response Envelope

All endpoints (except 204) return:
```json
{
  "success": true,
  "statusCode": 200,
  "data": { ... },
  "meta": {
    "traceId": "00-...",
    "timestamp": "2025-06-22T..."
  }
}
```

### Error Codes

Common error codes in Identity:
- `AUTH_EMAIL_ALREADY_REGISTERED`
- `AUTH_PHONE_ALREADY_REGISTERED`
- `AUTH_OTP_INVALID`
- `AUTH_OTP_EXPIRED`
- `AUTH_INVALID_CREDENTIALS`
- `AUTH_ACCOUNT_LOCKED`
- `AUTH_EMAIL_NOT_VERIFIED`

---

## Testing the APIs

### Using Postman/Insomnia

1. **Register:** `POST /v1/auth/register`
2. **Verify OTP:** Check email (or mock dev email)
3. **Login:** `POST /v1/auth/login`
4. **Save tokens:** Use in Authorization header for subsequent calls

### Using curl

```bash
# Register
curl -X POST https://api.vietride.dev/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Pass123!","displayName":"Test User"}'

# Login
curl -X POST https://api.vietride.dev/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Pass123!"}'

# Get user
curl https://api.vietride.dev/v1/users/me \
  -H "Authorization: Bearer <token>"
```

---

## Key Implementation Notes

1. **Gateway routes must be updated** for every new endpoint in `apps/gateway/src/config/routes.ts`
2. **JWT validation** happens at gateway - services trust `req.user` from gateway
3. **Database** - Each service has its own DB (microservice pattern)
4. **Caching** - Redis is available but not used extensively yet
5. **Logging** - Structured logging with Serilog (check service configs)
6. **Health checks** - Each service has `/health` and `/ready`
7. **Internal endpoints** - Use `InternalJwtAuthGuard` (NestJS) or validate manually (.NET)

---

**Next:** Combine all markdown files into final report.
