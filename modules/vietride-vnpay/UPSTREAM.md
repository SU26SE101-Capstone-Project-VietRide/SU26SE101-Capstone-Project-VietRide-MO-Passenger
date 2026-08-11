# Official VNPay Merchant SDK provenance

- Portal: https://sandbox.vnpayment.vn/apis/downloads/
- Download URL: https://sandbox.vnpayment.vn/apis/files/Sample_ReactNative_Mobile_SDK_Up04052022.zip
- Downloaded: 2026-08-11
- Archive: Sample_ReactNative_Mobile_SDK_Up04052022.zip
- Archive SHA-256: 8464d5233419817f9c1ae072b91ad5a3fea0bd842687660f3e3ca64c749cf076
- Official React Native package: react-native-vnpay-merchant@1.0.0
- Android Maven coordinate: com.vnpay:merchant:1.0.25
- AAR SHA-256: 2298fbf52db6a60f5ea7f10fc0651cb84f605263dfa5fd15390c2b1e805203ee

The upstream package metadata declares MIT, but the downloaded official archive
does not include the referenced LICENSE file. That absence is recorded here
instead of inventing license text. Before redistributing the SDK outside this
application repository, confirm the applicable VNPay distribution terms with
VNPay.

The upstream AAR still references the legacy Android Support Library. This app
enables AndroidX Jetifier so the pinned binary can run in Expo 54 / React Native
0.81 builds. This integration is Android-only; iOS requires a separately pinned
official artifact and implementation.
