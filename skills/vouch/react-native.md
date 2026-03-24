# Vouch React Native Guide

Use this guide when verification should happen inside a React Native app instead of redirecting the user to a hosted browser flow.

The official Vouch React Native SDK docs are:

- https://docs.getvouch.io/react-native/installation
- https://docs.getvouch.io/react-native/usage

## Status

The React Native SDK is currently documented as preview software. Expect the API and setup details to evolve.

## Requirements

- React Native 0.71 or later
- iOS deployment target 14.0 or later
- iOS 16.4 or later to perform a verification
- Android SDK 33 or later
- CocoaPods 1.10 or later
- Xcode 16.4 or later

## Install

```bash
npm install @getvouch/react-native-sdk
```

Or:

```bash
yarn add @getvouch/react-native-sdk
```

### iOS Setup

Enable frameworks in `ios/Podfile`:

```ruby
platform :ios, '14.0'

target 'YourApp' do
  use_frameworks!
end
```

Then install pods:

```bash
cd ios
pod install
```

### Android Setup

Set `minSdkVersion` to `33` or higher in `android/app/build.gradle`.

## Initialize The SDK

Initialize once near app startup:

```typescript
import VouchSDK from "@getvouch/react-native-sdk";

await VouchSDK.initialize({
  customerId: "CUSTOMER_ID",
});
```

If you need a readiness check:

```typescript
if (!VouchSDK.isInitialized()) {
  VouchSDK.initialize({ customerId: "CUSTOMER_ID" });
}
```

## Start A Verification

```typescript
import VouchSDK from "@getvouch/react-native-sdk";

async function requestVerification() {
  try {
    const result = await VouchSDK.start({
      dataSourceId: "DATA_SOURCE_ID",
      webhookUrl: "https://your-server.com/webhook",
      inputs: {
        username: "creator_handle",
      },
    });

    console.log("Verification successful:", result.proofId);
  } catch (error: any) {
    console.error("Verification failed:", error.description);
    console.error("Verification ID:", error.proofId);
    console.error("Error code:", error.reason);
  }
}
```

## iOS Version Check

The official docs note that SDK functionality is disabled on iOS 14 through 16.3. Guard the flow before starting verification:

```typescript
if (VouchSDK.isSupported()) {
  await requestVerification();
} else {
  console.error("This device does not support Vouch verification.");
}
```

## Integration Notes

- initialize the SDK once during the app lifecycle
- log or store `proofId` on both success and failure paths for support and debugging
- keep your server-side webhook handling separate from the mobile client
- use the hosted web flow in this skill when you do not need an embedded in-app verification experience
