# Mac Venue Toolchain

Snapshot of the mobile toolchain available on the Mac fleet venue, captured
2026-09-10 by running each command below on the venue machine. Listing only —
no simulator or device was booted, installed on, or modified.

## Xcode

```
$ xcodebuild -version
```

```
Xcode 26.6
Build version 17F113
```

## Installed simulator runtimes

```
$ xcrun simctl list runtimes
```

```
== Runtimes ==
iOS 18.2 (18.2 - 22C150) - com.apple.CoreSimulator.SimRuntime.iOS-18-2
iOS 18.4 (18.4 - 22E238) - com.apple.CoreSimulator.SimRuntime.iOS-18-4
iOS 18.5 (18.5 - 22F77) - com.apple.CoreSimulator.SimRuntime.iOS-18-5
iOS 26.0 (26.0 - 23A343) - com.apple.CoreSimulator.SimRuntime.iOS-26-0
iOS 26.5 (26.5 - 23F77) - com.apple.CoreSimulator.SimRuntime.iOS-26-5
visionOS 2.3 (2.3 - 22N895) - com.apple.CoreSimulator.SimRuntime.xrOS-2-3
visionOS 2.4 (2.4 - 22O237) - com.apple.CoreSimulator.SimRuntime.xrOS-2-4
```

## Available simulators

```
$ xcrun simctl list devices available
```

```
== Devices ==
-- iOS 18.2 --
    iPhone 16 Pro (40696C9C-F8EE-483F-83FF-AFA89CCC5FE7) (Booted) 
    iPhone 16 Pro Max (F3FB5552-86C0-4506-8F41-CAF12C979EFB) (Shutdown) 
    iPhone 16 (98EF0A0B-0E0F-4C8E-8A00-77BC1401A9A7) (Shutdown) 
    iPhone 16 Plus (911655E8-30C6-44F5-AAF6-6BCE9AACB351) (Shutdown) 
    iPhone 15 Pro (4100423C-BF37-47DF-ABF6-B329D70A8231) (Shutdown) 
    iPhone 15 Pro Max (8C3BA0C6-05BF-4EF5-A3C3-33ED8ACFA374) (Shutdown) 
    iPhone 15 (F74CC094-6049-41FC-A5B9-48D34F06CA1D) (Shutdown) 
    iPhone 15 Plus (4A23DB15-E0C9-4F94-9278-A4E6A7DE9030) (Shutdown) 
    iPhone SE (3rd generation) (4AA03403-871E-485A-A9C7-51DBC3027986) (Shutdown) 
    iPad Air 11-inch (M2) (B8C06040-12CE-4E8D-B43A-53AE3A7B403C) (Shutdown) 
    iPad Air 13-inch (M2) (A42682BF-67BA-48CC-875F-B47E31F191FF) (Shutdown) 
    iPad mini (A17 Pro) (583F0BBA-8622-4630-87DF-BD7647A433FB) (Shutdown) 
    iPad (10th generation) (0C78FB61-F99F-4C40-9DB9-722D910C8462) (Shutdown) 
    test (803E1CB4-5AC0-41C2-B0A4-C053B75A38EF) (Shutdown) 
    iPad mini (6th generation) (9AF6E542-4BE7-4463-B469-FBB31423BF3F) (Shutdown) 
-- iOS 18.4 --
    iPhone 16 Pro (4D2F2641-B0A3-4B55-BF5C-3166299F579A) (Shutdown) 
    iPhone 16 Pro Max (B636BE0C-5BC2-4CDD-8A54-99547BAABC46) (Shutdown) 
    iPhone 16e (DCA5A615-8D89-4617-98FB-CD9F5D99FD40) (Shutdown) 
    iPhone 16 (3E383170-0AED-4059-971D-E0A0114E3F96) (Shutdown) 
    iPhone 16 Plus (06A4D1B1-16D6-4F5D-9CB8-BCC84D19583C) (Shutdown) 
    iPad Pro (32499765-0B35-4F02-B1FC-E4127BBB0817) (Shutdown) 
    iPad mini (A17 Pro) (29A36FF6-7E28-43FC-B5C9-A521EA2CD519) (Shutdown) 
    iPad (A16) (9D10B097-7D32-4AA0-A126-49EF90FB657C) (Shutdown) 
    iPad Air 13-inch (M3) (60F8C0FE-6BC3-4C1A-831E-9678B8B21F8E) (Shutdown) 
    iPad Air 11-inch (M3) (B72C81D5-28B1-4EC3-8760-E6648D261B73) (Shutdown) 
-- iOS 18.5 --
    iPhone 16 Pro (B2529ABD-40CE-4AC5-ADB9-3FB46B79A2FC) (Shutdown) 
    iPhone 16 Pro Max (0363612B-6D6F-4748-8EE5-DB559F603F28) (Shutdown) 
    iPhone 16e (6E8C8F1B-E2E4-4AB8-B90B-7D6094EFE47B) (Shutdown) 
    iPhone 16 (FADB5349-A9C5-44A1-97D6-CD945346E21E) (Shutdown) 
    iPhone 16 Plus (227161B4-D627-490B-B163-97A123C3FDB2) (Shutdown) 
    iPhone 16e   (D00E1E6D-1D8A-4B74-9BC3-44FBBFBAB68B) (Shutdown) 
    iPad Pro 11-inch (M4) (8551D3C5-B602-4E7A-83FB-D8C7F0BB28CD) (Shutdown) 
    iPad Pro 13-inch (M4) (72ABEBF8-9C8E-427F-BCCF-753BDBBE2656) (Shutdown) 
    iPad mini (A17 Pro) (3D095F42-1145-4F20-93C7-42C3369032A2) (Shutdown) 
    iPad (A16) (B2F7A58E-ACDF-4EC6-B738-53B0C6C38469) (Shutdown) 
    iPad Air 13-inch (M3) (3C267CA4-6034-49A5-AC3E-A22F9EBF22CB) (Shutdown) 
    iPad Air 11-inch (M3) (BBDE4192-E30C-47D6-915F-E414DAEA5C28) (Shutdown) 
-- iOS 26.0 --
    iPhone 17 Pro (3E2E628D-126B-41CA-BD52-657D0836D528) (Shutdown) 
    iPhone 17 Pro Max (F2068DEC-B9DC-4230-8F16-B046487B81E3) (Shutdown) 
    iPhone Air (CF90E816-1FD5-4618-BD6E-9F47D26F86A9) (Shutdown) 
    iPhone 17 (1A7C0BFD-02C7-4A6A-B256-E3C939FE3556) (Shutdown) 
    iPhone 16e (0CE3981A-6387-4321-A16A-4CA5A7600C63) (Shutdown) 
    iPad Pro 13-inch (M5) (1904E17A-AF66-45A4-A700-B976A64F14C2) (Shutdown) 
    iPad Pro 11-inch (M5) (4B99F345-D17D-4BF0-9D0E-C98FC07AEF81) (Shutdown) 
    iPad Pro 11-inch (M4) (522B9755-CB77-4770-8AEE-8B1762F1F66F) (Shutdown) 
    iPad Pro 13-inch (M4) (2C0C5E49-7D83-42CC-B2E5-5E47C35C7E3C) (Shutdown) 
    iPad mini (A17 Pro) (5B6C9F64-0DC0-4D96-9CE0-A16458CF815C) (Shutdown) 
    iPad (A16) (47BF5966-ACD3-4CEE-BC63-7BC660033CC2) (Shutdown) 
    iPad Air 13-inch (M3) (CE65DCA1-5373-4B89-B2F7-2E9CB5559CF9) (Shutdown) 
    iPad Air 11-inch (M3) (D169C4AD-AD4D-4042-A821-C17F79A371D4) (Shutdown) 
-- iOS 26.5 --
    iPhone 17 Pro (96344137-073F-4AC1-9206-A6AB0D48CD13) (Shutdown) 
    iPhone 17 Pro Max (12046152-C029-4F95-9FCE-E5ACFF81BD37) (Shutdown) 
    iPhone 17e (5B271F33-479F-48FA-97EA-83F040C834EC) (Shutdown) 
    iPhone Air (03155DB6-3BB2-4489-BB11-E84E1DD5CA9F) (Shutdown) 
    iPhone 17 (505E468C-52C1-483D-A4BA-F4A6EC36771B) (Shutdown) 
    iPad Pro 13-inch (M5) (85C339E4-38FD-4D79-9E27-68DE71A64386) (Shutdown) 
    iPad Pro 11-inch (M5) (BFB10A54-7B16-4F14-A6B4-6B4DD441F81A) (Shutdown) 
    iPad mini (A17 Pro) (4FA23E4D-C0F6-4ABD-839E-3FF39550B0FB) (Shutdown) 
    iPad Air 13-inch (M4) (91254642-DBCA-44F2-9C78-10F89F2D2578) (Shutdown) 
    iPad Air 11-inch (M4) (8598803B-05F7-4006-8016-B6FBE80DE6D5) (Shutdown) 
    iPad (A16) (B1865985-F65C-47F8-8542-0196D511D4EC) (Shutdown) 
-- visionOS 2.3 --
    Apple Vision Pro (F037D574-E03E-4BAF-91CF-1BD52175C4FA) (Shutdown) 
-- visionOS 2.4 --
    Apple Vision Pro (B5D7B455-24A3-4B3F-98FA-8E0F3AF18D40) (Shutdown) 
-- Unavailable: com.apple.CoreSimulator.SimRuntime.iOS-17-0 --
-- Unavailable: com.apple.CoreSimulator.SimRuntime.iOS-17-5 --
-- Unavailable: com.apple.CoreSimulator.SimRuntime.iOS-26-1 --
-- Unavailable: com.apple.CoreSimulator.SimRuntime.iOS-26-2 --
-- Unavailable: com.apple.CoreSimulator.SimRuntime.iOS-26-4 --
```

Note: the booted iPhone 16 Pro was already booted before this snapshot was
taken; nothing was booted or shut down while generating this page.

## Android — adb

```
$ adb version
```

```
Android Debug Bridge version 1.0.41
Version 37.0.0-14910828
Installed as /Users/alexjbanca/Library/Android/sdk/platform-tools/adb
Running on Darwin 25.6.0 (arm64)
```

```
$ adb devices -l
```

```
List of devices attached
RFCRC0FY4ZJ            device usb:0-1 product:r9qxeea model:SM_G990B device:r9q transport_id:4
```

## Device allowlists (`.sandcastle/devices.env`)

Values as found on this venue — both allowlists are currently empty, so fleet
agents may not target any physical device or simulator here (build/list only).

```
$ source .sandcastle/devices.env
FLEET_ANDROID_SERIALS=""
FLEET_IOS_UDIDS=""
ANDROID_SERIAL=""
```
