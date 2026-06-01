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

Set `minSdkVersion` to `33` or higher in `android/app/build.gradle`, then build:

```bash
./gradlew clean
./gradlew assembleDebug
```

## Initialize The SDK

Initialize once near app startup. Both `customerId` and `apiKey` are required. Do not `await` — `initialize()` is fire-and-forget; poll `isInitialized()` to gate UI:

```typescript
import VouchSDK from "@getvouch/react-native-sdk";

VouchSDK.initialize({
  customerId: "CUSTOMER_ID",
  apiKey: "API_KEY",
  languageCodeOverride: "en-US", // optional, BCP 47 tag
});
```

Poll readiness in a `useEffect` before enabling verification UI:

```typescript
useEffect(() => {
  if (VouchSDK.isInitialized()) return;
  VouchSDK.initialize({ customerId: CUSTOMER_ID, apiKey: API_KEY });

  const id = setInterval(() => {
    if (VouchSDK.isInitialized()) {
      setIsReady(true);
      clearInterval(id);
    }
  }, 50);

  return () => clearInterval(id);
}, []);
```

## Start A Verification

`webhookUrl` is required. `inputs` and `metadata` are optional.

```typescript
import VouchSDK from "@getvouch/react-native-sdk";

async function requestVerification() {
  try {
    const result = await VouchSDK.start({
      dataSourceId: "DATA_SOURCE_ID",
      webhookUrl: "https://your-server.com/webhook",
      inputs: { ig_handle: "creator_handle" },
      metadata: "userId:123",              // optional, max 256 chars
    });

    console.log("Verification successful:", result.proofId);
  } catch (error: any) {
    console.error("Verification failed:", error.description);
    console.error("Verification ID:", error.proofId);
    console.error("Error code:", error.reason);
  }
}
```

### Error Codes

| Code | Meaning |
|------|---------|
| -1 | SDK not initialized |
| 6 | Verification failed |
| 10 | Network loss during verification |
| 12 | Invalid API key |
| 13 | Server error |
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
