---
name: comprehensive-code-quality-upgrade-plan
parentTask: TASK-005
---

# VietRide MO Passenger - Comprehensive Code Quality Upgrade Plan

## Context
VietRide là React Native/Expo app đặt vé xe và gửi parcel. Codebase đã có:
- **Good**: Theme system (liquid glass), Zustand stores, typed navigation, component modularization, responsive design patterns
- **Issues**: Cụm bộ nhớ, API integration thiếu, testing abscent, security gaps, error handling yếu, code smells

## Architecture Assessment

### Current Stack
- **Framework**: React Native 0.85.3 + Expo 56
- **Language**: TypeScript 6.0.3 (strict mode enabled)
- **Navigation**: React Navigation 7 (native-stack + bottom-tabs)
- **State**: Zustand 5.0.14
- **UI**: Custom components with Phosphor icons
- **Theme**: Custom liquid glass theme system (3 variants)
- **API**: Axios with interceptor pattern (unused)
- **Storage**: react-native-keychain for tokens
- **Forms**: react-hook-form + zod
- **Networking**: @tanstack/react-query (installed but unused)

## Critical Gaps Found

### 1. Navigation & Flow Issues
- **Incomplete booking flow**: CreateTicketBookingScreen → PaymentScreen nhưng KHÔNG có confirmation hay booking creation API call
- **Missing screens in navigator**: `CheckoutScreen` đã được định nghĩa nhưng KHÔNG được mount trong BookingNavigator
- **No deep linking**: Không có linking config cho push notifications hoặc external links
- **Navigation param safety**: Một số screen dùng optional params mà không có default values

### 2. API Integration - 100% Mock
- `useBookingStore.searchTrips()`: `setTimeout` mock 2s, trả về `MOCK_TRIPS`
- `useParcelStore`: Hoàn toàn mock data, không có API calls
- `axiosInstance` tồn tại nhưng KHÔNG được sử dụng ở đâu
- **Impact**: App không kết nối backend, không persistence, không real data

### 3. State Management Issues
- **Store coupling**: `useBookingStore` quản lý cả booking flow, pricing, contact info - vi phạm SRP
- **No async action patterns**: Store actions không support async/await, error states
- **No persistence**: State mất hoàn toàn khi app reload (trừ auth token)
- **Computed values in store**: `totalPrice()` là function trong store - nên là getter

### 4. Component Quality Problems

**Button.tsx Issues:**
- ✅ Variants, sizes, loading states - GOOD
- ❌ Không có `testID` cho testing
- ❌ Press feedback chỉ là opacity/scale - thiếu ripple (Android)
- ❌ No accessibility hints

**Common Issues:**
- No error boundaries
- No loading skeletons in many places
- Empty state components tồn tại nhưng chưa được dùng đều
- Hardcoded strings (no i18n usage despite i18next installed)
- No prop validation default values

### 5. Authentication Flow Incomplete
- `useAuthStore` chỉ manage user object, không có:
  - Login API call (LoginScreen.tsx:44-52 chỉ set mock user)
  - Registration validation
  - Password reset implementation
  - Token refresh logic
  - Social auth integration (UI có nhưng logic không)
- `AuthNavigator` không đọc được (cần check)

### 6. Testing - Absent
- `jest.config.js` tồn tại nhưng KHÔNG có test files nào
- No unit tests cho stores, components, hooks
- No integration tests cho flows
- No snapshot tests cho UI

### 7. Missing Critical Features

**Booking Flow:**
- ❌ Seat selection layout có nhưng chưa thấy seat pricing breakdown
- ❌ Passenger details form (only contact info, no passenger list management)
- ❌ Review/confirmation screen trước payment
- ❌ Cancellation/refund flow
- ❌ Booking history không có screen (chỉ có ref trong DigitalTicket)
- ❌ Ticket QR generation (placeholder icon only)

**Parcel Flow:**
- ❌ Parcel tracking UI tốt nhưng NO real tracking API
- ❌ No courier assignment
- ❌ No delivery time estimation algorithm
- ❌ No weight/size validation với carrier limits
- ❌ No package type-specific pricing
- ❌ Parcel history

**Common Features:**
- ❌ Push notifications registration & handling
- ❌ Error reporting (Sentry, Crashlytics)
- ❌ Analytics (Mixpanel, GA4)
- ❌ Offline mode với queue
- ❌ Image upload to S3/Cloudinary
- ❌ Real payment gateway integration (VNPAY, Momo)
- ❌ Rate limiting/retry logic
- ❌ Request cancellation (axios CancelToken)

### 8. Code Smells & Technical Debt

**Store Pattern Anti-Pattern:**
```typescript
// useBookingStore - quá lớn, nhiều responsibilities
interface BookingStore {
  searchParams, tripResults, selectedTrip, seatMap, contactInfo,
  pickUpPoints, dropOffPoints, paymentMethod, outboundState, returnState...
  // 15+ properties, 20+ methods
}
