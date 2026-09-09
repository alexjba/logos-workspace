# iOS policy on downloading QML at runtime

Research date: 2026-09-09. Question: does downloading QML (QML + JavaScript executed by Qt's own V4 engine, not WebKit/JavaScriptCore) at runtime violate App Store Review Guideline 2.5.2 and DPLA 3.3.1(B) (formerly 3.3.2)?

Legend: **[P]** primary source read directly. **[S]** secondary source; claim is second-hand. **[I]** my interpretation, not stated fact.

## TL;DR

- The WebKit/JavaScriptCore carve-out **no longer exists** in the DPLA. It was removed in June 2017; the current clause is engine-agnostic. Any "interpreted code", whether run by JavaScriptCore or Qt V4, is allowed under the same three conditions. **[P]** (section 2)
- Guideline 2.5.2 is stricter than the DPLA: no downloading or executing code "which introduces or changes features or functionality of the app". Downloading QML that *adds or changes features* breaks the letter of 2.5.2 regardless of engine. Downloading QML that only re-skins or fixes bugs within the advertised purpose is within the DPLA letter and, in practice, within 2.5.2 as enforced. **[P]** + **[I]**
- Guideline 4.7 (host apps offering plug-ins/mini apps) dropped its "must use WebKit and JavaScript Core" and "not offered in a store or store-like interface" language on January 25, 2024. Current 4.7 names HTML5/JavaScript mini apps and untyped "plug-ins", requires an index of offered software (4.7.4), and forbids exposing native platform APIs to that software without Apple's permission (4.7.2). **[P]** (sections 9, 10)
- Enforcement is sporadic and pattern-triggered (reflection/`dlopen` SDKs in 2017, apps whose purpose is to run/preview *other* apps in 2020 and 2026). Felgo has shipped App Store apps that download and execute arbitrary QML/JS from a desktop since 2016; both are still listed. No documented QML-specific rejection exists. (sections 4, 6, 7)

## 1. App Store Review Guideline 2.5.2 (current)

Source: https://developer.apple.com/app-store/review/guidelines/ fetched 2026-09-09. **[P]**

> **2.5.2** Apps should be self-contained in their bundles, and may not read or write data outside the designated container area, nor may they download, install, or execute code which introduces or changes features or functionality of the app, including other apps. Educational apps designed to teach, develop, or allow students to test executable code may, in limited circumstances, download code provided that such code is not used for other purposes. Such apps must make the source code provided by the app completely viewable and editable by the user.

Related guidelines, same page **[P]**:

- **2.5.6**: "Apps that browse the web must use the appropriate WebKit framework and WebKit JavaScript. You may apply for an entitlement to use an alternative web browser engine in your app." (EU/Japan entitlement.)
- **4.7**: "Apps may offer certain software that is not embedded in the binary, specifically HTML5 and JavaScript mini apps and mini games, streaming games, chatbots, and plug-ins. ... You are responsible for all such software offered in your app ... must also ensure that the software adheres to the additional rules that follow in 4.7.1 through 4.7.5."

Notes:

- 2.5.2 makes no reference to WebKit, JavaScriptCore, or any engine. The operative test is whether the downloaded code "introduces or changes features or functionality". **[P]**
- The June 2016 version read "nor may they download, install, or execute code, including other iOS, watchOS, Mac OS X, or tvOS apps" with no "introduces or changes features" qualifier; the qualifier and the educational sentence arrived with the June 6, 2017 update. Sources: Apple forum thread by Icosahedron, Jul 2016, quoting the June 13, 2016 text https://developer.apple.com/forums/thread/52161 **[P]**; Apple news "Updated Guidelines Now Available", June 6, 2017 https://developer.apple.com/news/?id=06062017a **[P]** (announces the update, does not quote diffs); The Register, June 7, 2017 https://www.theregister.com/2017/06/07/apple_relaxes_developer_rules/ **[S]**.

## 2. DPLA 3.3.1(B) "Executable Code" (current) and its history

Source: Apple Developer Program License Agreement, English PDF, https://developer.apple.com/support/downloads/terms/apple-developer-program/Apple-Developer-Program-License-Agreement-English.pdf, downloaded 2026-09-09. Footer: "LYL255 / August 18, 2026", 130 pages. SHA-256 `088ab2a8c653b5457d206267a9cfe047d0b4d01fcdbff086b6bbf784d5fb7a4d`. **[P]**

Section 3.3.1 "APIs, Functionality, and User Interface", paragraph B "Executable Code", verbatim:

> Except as set forth in the next paragraph, an Application may not download or install executable code. Interpreted code may be downloaded to an Application but only so long as such code: (a) does not change the primary purpose of the Application by providing features or functionality that are inconsistent with the intended and advertised purpose of the Application (b) does not bypass signing, sandbox, or other security features of the OS; and (c) for Applications distributed on the App Store, does not create a store or storefront for other Applications.
>
> An Application that is a programming environment intended for use in learning how to program may download and run executable code so long as the following requirements are met: (i) no more than 80 percent of the Application's viewing area or screen may be taken over with executable code, except as otherwise permitted in the Documentation, (ii) the Application must present a reasonably conspicuous indicator to the user within the Application to indicate that the user is in a programming environment, (iii) the Application must not create a store or storefront for other code or applications, and (iv) the source code provided by the Application must be completely viewable and editable by the user (e.g., no pre-compiled libraries or frameworks may be included with the code downloaded).

Facts about the current text:

- The strings "WebKit" and "JavaScriptCore"/"JavascriptCore" do **not** appear anywhere in the current PDF (grep of extracted text). **[P]**
- The clause does not define "interpreted code" and does not name any engine. **[P]**
- Apple's news item of October 8, 2025 lists "Section 3.3.1(B): Updated requirements related to interpreted code" without describing the change. https://developer.apple.com/news/?id=fnkpd51y **[P]**

History of the clause (the WebKit/JavaScriptCore exception existed, then was removed):

| Version | Wording | Source |
|---|---|---|
| ~2013 (iOS DPLA, 3.3.2) | "Interpreted code may only be used in an Application if all scripts, code and interpreters are packaged in the Application and not downloaded. The only exception to the foregoing is scripts and code downloaded and run by Apple's built-in WebKit framework, provided that such scripts and code do not change the primary purpose of the Application by providing features or functionality that are inconsistent with the intended and advertised purpose of the Application as submitted to the App Store." | SEC exhibit 10.27, https://www.sec.gov/Archives/edgar/data/1366246/000119312513109950/d453444dex1027.htm **[P]** |
| 2015-2016 (3.3.2) | Same, but "Apple's built-in WebKit framework or JavascriptCore". | Quoted by developers KMT (Dec 2015) https://developer.apple.com/forums/thread/23094 and Icosahedron (Jul 2016) https://developer.apple.com/forums/thread/52161 **[P, non-Apple posters quoting the agreement]** |
| June 5, 2017 onward (3.3.2) | "Except as set forth in the next paragraph, an Application may not download or install executable code. Interpreted code may be downloaded to an Application but only so long as such code: (a) does not change the primary purpose ... (b) does not create a store or storefront for other code or applications, and (c) does not bypass signing, sandbox, or other security features of the OS." Plus the learning-environment paragraph. | SEC exhibit 10.36 (2022 filing) https://www.sec.gov/Archives/edgar/data/1581760/000119312522172365/d328928dex1036.htm **[P]**; same text quoted on Expo forum Feb 27, 2019 (see section 6) **[P]**; timing per The Register June 7, 2017 quoting Rollout CEO: "Instead of making an exception only for code downloads via Apple's built-in WebKit framework or JavaScriptCore, Apple now has opened the ability to download code to any Javascript framework." **[S]** |
| Current (3.3.1(B)) | As quoted above. Renumbered; (b)/(c) reordered; storefront condition now scoped to App Store apps. | Current PDF **[P]** |

Conclusion for this section: the "WebKit/JavaScriptCore exception with the primary-purpose proviso" that the question asks about is **historical**. The primary-purpose proviso survives as condition (a), but it now applies to interpreted code run by any interpreter. **[P]**

## 3. Qt official documentation on iOS / App Store compliance

- Qt for iOS platform page https://doc.qt.io/qt-6/ios.html: no mention of App Store review, runtime QML download, interpreted code, or JIT. **[P]**
- QML JavaScript host environment https://doc.qt.io/qt-6/qtqml-javascript-hostenvironment.html: no mention of iOS or App Store. Describes the engine as its own host environment: "QML provides a JavaScript host environment tailored to writing QML applications. This environment is different from the host environment provided by a browser or a server-side JavaScript environment such as Node.js." **[P]**
- QML script compiler https://doc.qt.io/qt-6/qtqml-qml-script-compiler.html: "The QML script compiler compiles functions and expressions in QML and JavaScript files to a byte code that can be interpreted or Just-in-time compiled by the QML engine." No iOS mention. **[P]**
- Qt wiki "V4" https://wiki.qt.io/V4 (community wiki, Qt Project): "Trouble only occurs if the platform itself restricts usage of JIT, be it App Store policies as for iOS ... On this platforms your only hope is to use ahead-of-time compilation (AOT)." Confirms V4 runs as a bytecode interpreter on iOS App Store builds. **[P, wiki]**
- Qt Company statement on downloading QML on iOS: **none found** in docs, wiki, or forum (searches on forum.qt.io and doc.qt.io; Qt JIRA REST search returns no results unauthenticated). The only App Store statement in Qt docs concerns Qt WebView using the system web view (UIKit/WKWebView) so that apps pass review, from forum thread https://forum.qt.io/topic/60798/applestore-and-qtwebview-webkit-qt5-5 (poster SGaist, Qt Champion, not Qt Company staff, Nov 2015). **[P, community]**

## 4. Felgo Live Client / QML Dev App

Mechanism, Felgo docs https://felgo.com/doc/felgo-qml-hot-reload/ and https://felgo.com/doc/qml-hot-reload-felgo-live/ **[P]**:

> "When you hit save, your changed QML, JS and asset files are transferred to the Felgo Hot Reload client, and the QML layer is reloaded."
> "A Hot Reload client contains all of the most used Qt modules and Felgo Plugins." ... "Some projects include custom C++ or native code. Those languages require a compilation step and cannot be reloaded directly with QML Hot Reloading."

That is, the store-distributed client is a fixed Qt/Felgo binary that receives arbitrary QML + JavaScript over the network and executes it with Qt's engine. It cannot load new native code.

App Store listings (fetched 2026-09-09) **[P]**:

| App | ID | Seller | First release | Latest | Listed now |
|---|---|---|---|---|---|
| Felgo 3 QML Dev App (formerly "QML Live Scripting by V-Play") | 1157319191 | FELGO GmbH | listing history shows v5.0.1 Oct 6, 2020; V-Play era listing existed by 2016-2017 (Felgo blog Nov 22, 2017 tells users to "download the Felgo Live App, for Android or iOS") | 5.4.1, Oct 17, 2023 | yes |
| Felgo 4 QML Dev App | 1669213808 | FELGO GmbH | Feb 7, 2023 | 4.4.0 | yes |

Sources: https://apps.apple.com/ch/app/felgo-3-qml-dev-app/id1157319191?l=en, https://apps.apple.com/gb/app/felgo-4-qml-dev-app/id1669213808, https://blog.felgo.com/updates/release-2-14-0-live-code-reloading-for-desktop-ios-android **[P]**.

Rejection history: **none found**. Felgo's blog, docs, and listings do not mention Apple restrictions or rejections; web searches for Felgo/V-Play Live rejections return nothing. Absence of evidence only. **[P for absence in Felgo sources]**

Interpretation **[I]**: Felgo's apps are developer tools whose advertised purpose *is* running QML sent from a desktop, so condition (a) of 3.3.1(B) is satisfied by design; they are the closest thing to a precedent that App Review accepts arbitrary QML/JS executed by Qt's V4 engine. They are not a precedent for a consumer app that changes its own features via downloaded QML.

## 5. Canonic (QML browser)

- README https://github.com/canonic/canonic **[P]**: "Canonic is an experimental QML web browser developed in the Qt framework and licensed under GPL3." "A live WebAssembly version of the browser is available to try at https://app.canonic.com/." "Canonic is currently missing most of the sandboxing features offered by modern web browsers ... This is part of the reason why Canonic is currently only available via WebAssembly as WASM provides a safe sandbox in which QML browser technology can be explored."
- No iOS, App Store, Android, or mobile mention in README; the only "ios" hits in the source are Qt network proxy files. Repo last pushed 2023-12-15. **[P]**
- Qt forum announcement thread https://forum.qt.io/topic/131596/canonic-open-source-qml-web-browser (author haiku, Jan 21, 2022): only mobile remark is that macOS/mobile have "less than stellar WASM support". **[P]**
- No App Store listing found. Conclusion: Canonic **never shipped on iOS**, and the author's stated reason for staying WASM-only was sandboxing, not Apple policy. **[P]**

## 6. 2017 / 2019 / 2020 OTA-JavaScript history

**March 2017 mass email** (JSPatch, Rollout.io, CodePush users). Verbatim as posted by affected developers, https://github.com/microsoft/react-native-code-push/issues/748 (Mar 8, 2017) and https://developer.apple.com/forums/thread/73640 **[P, quoting Apple]**:

> Your app, extension, and/or linked framework appears to contain code designed explicitly with the capability to change your app's behavior or functionality after App Review approval, which is not in compliance with section 3.3.2 of the Apple Developer Program License Agreement and App Store Review Guideline 2.5.2. This code, combined with a remote resource, can facilitate significant changes to your app's behavior compared to when it was initially reviewed for the App Store. While you may not be using this functionality currently, it has the potential to load private frameworks, private methods, and enable future feature changes.
> This includes any code which passes arbitrary parameters to dynamic methods such as dlopen(), dlsym(), respondsToSelector:, performSelector:, method_exchangeImplementations(), and running remote scripts in order to change app behavior or call SPI, based on the contents of the downloaded script. Even if the remote resource is not intentionally malicious, it could easily be hijacked via a Man In The Middle (MiTM) attack, which can pose a serious security vulnerability to users of your app.

- Resolution: June 2017 DPLA rewrite to engine-agnostic conditions (section 2). Rollout CEO's reading via The Register **[S]**; Apple never published a rationale.
- Microsoft's stance, CodePush FAQ https://microsoft.github.io/code-push/faq/index.html **[P]**: "According to section 3.3.2 of Apple's developer agreement, as long as you are using the CodePush service to release bug fixes and improvements/features that maintain the app's original/presented purpose (i.e. don't CodePush a calculator into a first-person shooter), then you will be fine."

**February 2019, Expo.** Expo forum thread (archived) https://forums.expo.io/t/apple-rejected-guideline-2-3-1-guideline-2-5-2/19973, Feb 27, 2019 **[P]**: one non-ejected Expo SDK 32 app with OTA enabled received the same templated rejection text (2.3.1 "hidden features" + 2.5.2 + "section 3.3.2"). Expo staff adamjnav replied: "This seems to be an isolated incident as of now ... We've got ~1000 iOS apps being built per day with our build services and so far this is the only report of said reject." No mass email to Expo developers in 2019 was found. Expo docs today https://docs.expo.dev/eas-update/introduction/ **[P]**: "your updates need to follow the App Store and Play Store guidelines, including the content of the updates and how you use them" and EAS Update can "Fix a bug or crash in JavaScript code", "Update copy, translations, UI styling, or screen layouts" but not native code or permissions.

**July 2020, CodePush.** https://github.com/microsoft/react-native-code-push/issues/1898 (Jul 3, 2020) **[P, quoting App Review]**: "It would be appropriate to remove any and all remote code importing functionality from this app, such as CodePush support, before resubmitting for review." Followed by: "We continue to find that your app contains hidden features or functionality that can change the behavior of the app after review ... a direct violation Section 3.2(f) of the Apple Developer Program License Agreement. Continuing to violate ... will result in the termination of your account". This was one app's rejection, not a policy announcement; CodePush was not withdrawn.

**Apple's current stance on JS OTA via JavaScriptCore**: there is no written engine-specific permission any more (section 2). The 2017 email's targets were reflection/`dlopen`/`performSelector` bridges, i.e. code that can reach private API, not JavaScript per se. JS-only OTA within the advertised purpose is tolerated at scale (Expo, CodePush) with occasional templated rejections. **[P for facts, I for synthesis]**

Apple DTS statement on embedded interpreters, https://developer.apple.com/forums/thread/739489 (Oct 2023, Quinn "The Eskimo!", Apple DTS) **[P]**: "App Review has a complex relationship with apps that download and run code. I'm not even going to attempt to summarise that here. ... if your app only uses the Python code internally, that is, the Python code is embedded in your app and there's no way for you or the user to download or inject additional code, I don't think you'll have a problem."

## 7. Documented Qt/QML cases

- Rejections of a Qt/QML app for downloading QML at runtime: **none found** on forum.qt.io, Qt bug tracker (web search; JIRA API unauthenticated returns nothing), KDAB, ICS, or Qt Company blogs.
- Acceptances: Felgo's two QML Dev Apps (section 4) are the only documented App Store apps whose function is to download and execute QML/JS with Qt's engine.
- Adjacent 2026 enforcement, not Qt but instructive:
  - **Anything** (vibe-coding app) removed March 26, 2026 under 2.5.2; Apple to MacRumors: "There are no specific rules against vibe coding, but the apps have to adhere to longstanding guidelines." The developer's proposed workaround of previewing generated apps in a web view was also blocked; app returned April 3, 2026. https://www.macrumors.com/2026/03/30/apple-pulls-vibe-coding-app/ **[S, quoting Apple]**; https://techcrunch.com/2026/04/14/how-vibe-coding-app-anything-is-rebuilding-after-getting-booted-from-the-app-store-twice/ **[S]**.
  - **Setgreet companion app**, April 2026, Apple forum https://developer.apple.com/forums/thread/821927 **[P]**: app fetched only structured UI data (text, images, buttons, layout) from a REST API, no code; rejected four times with: "The app appears to be designed for clients or users to preview apps prior to being submitted to the App Store for review. This type of design allows you to change the app's behavior or functionality to differ from the intended and advertised primary purpose of the app, which is not in compliance with App Review Guideline 2.5.2 and section 3.3.2". Unresolved at time of writing. Shows App Review applies 2.5.2 to *server-driven UI* by pattern, even with zero downloaded code, and still cites the retired number "3.3.2".

## 8. WebAssembly and the (former) WebKit exception

- WebKit executes WebAssembly itself: "We're pleased to announce that WebKit has a full WebAssembly implementation." https://webkit.org/blog/7691/webassembly/ (Jun 6, 2017) **[P]**; implementation lives under `Source/JavaScriptCore/wasm` in the WebKit tree https://github.com/WebKit/WebKit/tree/main/Source/JavaScriptCore/wasm **[P]**. So wasm in WKWebView is code run by WebKit, in WebKit's separate WebContent process.
- Under the **current** DPLA there is no WebKit exception to fall under; wasm inside WKWebView and wasm inside an embedded interpreter (wasm3, wasmtime interp mode) are both "interpreted code" subject to conditions (a)-(c) of 3.3.1(B), and both are subject to 2.5.2's "introduces or changes features" test. The agreement does not define "interpreted code" or distinguish bytecode from source. **[P for text, I for application]**
- JIT-based wasm runtimes are not an option for third-party iOS apps: iOS has no public JIT entitlement for App Store apps (Qt wiki V4 statement in section 3; Apple's JIT guidance and `com.apple.security.cs.allow-jit` apply to macOS, per DTS in https://developer.apple.com/forums/thread/805941, Nov 2025 **[P]**). An embedded wasm runtime on iOS must be a pure interpreter.
- Practical difference **[I]**: WKWebView content is what reviewers have seen for 15 years (Cordova, hybrid apps, 4.7 mini apps); an embedded non-WebKit runtime is what the 2017 email's "running remote scripts" language and the "hidden features" template target. Legally equivalent today; risk-wise not.

## 9. Guideline 4.7: mini apps, plug-ins, and "software not embedded in the binary"

This rule governs a host app that lets users install modules/plug-ins from a catalog. Its shape changed in January and April 2024.

### 9a. Current text (fetched 2026-09-09)

Source: https://developer.apple.com/app-store/review/guidelines/ **[P]**. Verbatim:

> **4.7 Mini apps, mini games, streaming games, chatbots, plug-ins, and game emulators**
> Apps may offer certain software that is not embedded in the binary, specifically HTML5 and JavaScript mini apps and mini games, streaming games, chatbots, and plug-ins. Additionally, retro game console and PC emulator apps can offer to download games. You are responsible for all such software offered in your app, including ensuring that such software complies with these Guidelines and all applicable laws. Software that does not comply with one or more guidelines will lead to the rejection of your app. You must also ensure that the software adheres to the additional rules that follow in 4.7.1 through 4.7.5. These additional rules are important to preserve the experience that App Store customers expect, and to help ensure user safety.
>
> **4.7.1** Software offered in apps under this rule must:
> - follow all privacy guidelines, including but not limited to the rules set forth in Guideline 5.1 concerning collection, use, and sharing of data, and sensitive data (such as health and personal data from kids);
> - include a method for filtering objectionable material, a mechanism to report content and timely responses to concerns, and the ability to block abusive users; and
> - follow Guideline 3.1 in order to offer digital goods or services to end users.
>
> **4.7.2** Your app may not extend or expose native platform APIs or technologies to the software without prior permission from Apple.
>
> **4.7.3** Your app may not share data or privacy permissions to any individual software offered in your app without explicit user consent in each instance.
>
> **4.7.4** You must provide an index of software and metadata available in your app. It must include universal links that lead to all of the software offered in your app.
>
> **4.7.5** Your app must provide a way for users to identify software that exceeds the app's age rating, and use an age restriction mechanism based on verified or declared age to limit access by underage users.

Facts about the current text **[P]**:

- The words "WebKit", "JavaScriptCore"/"JavaScript Core", "store-like", and "storefront" do **not** appear in 4.7 or 4.7.1-4.7.5.
- Permitted categories are enumerated ("specifically"): HTML5 and JavaScript mini apps/mini games, streaming games, chatbots, plug-ins, emulator games. Apple's April 5, 2024 note says the edit "clarifies that mini apps and mini games must be HTML5" https://developer.apple.com/news/?id=0kjli9o1. "Plug-ins" carries no technology qualifier.
- The store/store-like prohibition is gone from 4.7. 4.7.4 now *requires* an index of the offered software with universal links, i.e. a catalog is expected. The only surviving storefront language is DPLA 3.3.1(B)(c), "does not create a store or storefront for other Applications" (section 2).
- 4.7.2 forbids exposing native platform APIs to the hosted software without Apple's prior permission.

### 9b. Pre-2024 text (in force roughly June 2017 to January 25, 2024)

Verbatim as quoted by developers on Apple's forums in June 2019 https://developer.apple.com/forums/thread/117933 and November 2019 https://developer.apple.com/forums/thread/126071 **[P, non-Apple posters quoting the guideline]**. The June 29, 2018 text reproduced at https://gist.github.com/ethanhuang13/07fdcb6e4a26b46c994b3fc0a55a08f2 **[S]** is identical except it lacks items (4) real-money gaming and (6) digital commerce:

> **4.7 HTML5 Games, Bots, etc.**
> Apps may contain or run code that is not embedded in the binary (e.g. HTML5-based games, bots, etc.), as long as code distribution isn't the main purpose of the app, the code is not offered in a store or store-like interface, and provided that the software (1) is free or purchased using in-app purchase; (2) only uses capabilities available in a standard WebKit view (e.g. it must open and run natively in Safari without modifications or additional software); your app must use WebKit and JavaScript Core to run third-party software and should not attempt to extend or expose native platform APIs to third-party software; (3) is offered by developers that have joined the Apple Developer Program and signed the Apple Developer Program License Agreement; (4) does not provide access to real money gaming, lotteries, or charitable donations; (5) adheres to the terms of these App Review Guidelines (e.g. does not include objectionable content); and (6) does not support digital commerce. Upon request, you must provide an index of software and metadata available in your app. It must include Apple Developer Program Team IDs for the providers of the software along with a URL which App Review can use to confirm that the software complies with the requirements above.

Change record **[P]**: Apple news January 25, 2024, "4.7: Edited to set forth new requirements for mini apps, mini games, streaming games, chatbots, and plug-ins" https://developer.apple.com/news/?id=7j1f99yf; same-day announcement: "mini-apps, mini-games, chatbots, and plug-ins will be able to incorporate Apple's In-App Purchase system" and "Apps will also be able to provide enhanced discovery opportunities for streaming games, mini-apps, mini-games, chatbots, and plug-ins that are found within their apps", and "its host app will need to maintain an age rating of the highest age-rated content included in the app" https://developer.apple.com/news/?id=f1v8pyay; April 5, 2024 added emulator games and the "must be HTML5" clarification https://developer.apple.com/news/?id=0kjli9o1.

### 9c. Precise answer: does current 4.7 still require WebKit/JavaScriptCore, and still forbid a store-like interface?

- **WebKit/JavaScriptCore**: no longer stated. The pre-2024 item (2) "your app must use WebKit and JavaScript Core to run third-party software" was deleted on January 25, 2024. Replacements: the category list, in which mini apps/mini games are "HTML5 and JavaScript" (Apple: "must be HTML5"), and 4.7.2's ban on exposing native APIs without permission. **[P]** Reading **[I]**: for mini apps/mini games the HTML5 requirement implies a web engine, which on iOS means WebKit (2.5.6). For "plug-ins" 4.7 names no technology; nothing in the text says a plug-in must be JavaScript run by JavaScriptCore. A downloaded QML plug-in executed by Qt V4 is not excluded by 4.7's wording, but it is not one of the explicitly named safe categories either, and 4.7.2 applies to it in full.
- **Store or store-like interface**: the 4.7 prohibition ("the code is not offered in a store or store-like interface", "code distribution isn't the main purpose of the app") was **removed** in January 2024. Current 4.7.4 requires an index with universal links. The only surviving storefront rule is DPLA 3.3.1(B)(c), where "Applications" is a DPLA-defined term for developer-submitted apps, not in-app plug-ins. **[P]** Reading **[I]**: an in-app catalog of plug-ins is now contemplated by 4.7.4, provided paid plug-ins use In-App Purchase (4.7.1 / 3.1) and the host does not become a channel for other developers' *apps*.
- **What 4.7 still demands of a module host** **[P]**: responsibility for every module's compliance with all guidelines; privacy rules per 5.1; objectionable-content filtering, reporting, and blocking; IAP for paid modules; no native API exposure without Apple's permission (4.7.2); per-module user consent for data/permission sharing (4.7.3); an index with universal links (4.7.4); age gating (4.7.5); host age rating equal to the highest-rated module.
- Logos mapping **[I]**: 4.7.2 is the clause a Logos module bridge must be designed against. Exposing the app's own module APIs (Logos core services) is not the same as exposing iOS platform APIs, but a bridge that proxies raw filesystem/network/camera would be. 4.7.3 maps onto Logos capability tokens with a per-grant user consent step. 4.7.4 obliges the module catalog to publish an index with a universal link per module.

## 10. Which DPLA text is in force, and whether the engine matters

Confirmed against the current agreement PDF (footer "LYL255, August 18, 2026", downloaded 2026-09-09, SHA-256 in section 2) **[P]**. The clause in force is 3.3.1(B):

> Except as set forth in the next paragraph, an Application may not download or install executable code. Interpreted code may be downloaded to an Application but only so long as such code: (a) does not change the primary purpose of the Application by providing features or functionality that are inconsistent with the intended and advertised purpose of the Application (b) does not bypass signing, sandbox, or other security features of the OS; and (c) for Applications distributed on the App Store, does not create a store or storefront for other Applications.

- The pre-June-2017 wording ("Interpreted code may only be used in an Application if all scripts, code and interpreters are packaged in the Application and not downloaded. The only exception to the foregoing is scripts and code downloaded and run by Apple's built-in WebKit framework or JavascriptCore ...") is **not** in force. Neither "WebKit" nor "JavaScriptCore" appears anywhere in the 130-page current PDF. **[P]**
- The post-2017 conditions, (a) primary purpose, (b) no store/storefront, (c) no bypassing signing/sandbox, are the ones in force, with (b) and (c) swapped in order and the storefront condition narrowed to App Store-distributed apps and to "other Applications". **[P]**
- Under the letter of the DPLA the engine therefore does **not** matter: QML/JS run by Qt V4 and JS run by JavaScriptCore are both "interpreted code" governed by the same three conditions. The only engine-specific rules left are guideline 2.5.6 (apps that browse the web must use WebKit) and the HTML5 qualifier on mini apps/mini games in 4.7. **[P for text, I for the equivalence]**
- Caveat: App Review's rejection template still cites "section 3.3.2" (Setgreet, April 2026, section 7), so reviewers may work from older internal guidance. **[P]**

## Conclusions

### (1) Letter of the rules

- **DPLA 3.3.1(B)**: downloading QML/JS and executing it with Qt's V4 engine is *permitted* as "interpreted code" provided it (a) does not change the app's primary purpose or add functionality inconsistent with the advertised purpose, (b) does not bypass signing/sandbox/OS security, (c) does not create a storefront. There is **no** distinction between V4 and JavaScriptCore/WebKit in the current agreement; that distinction was removed in June 2017. Confidence: high (verbatim current text, no WebKit/JavaScriptCore string in the PDF).
- **Guideline 2.5.2**: forbids downloading or executing code "which introduces or changes features or functionality of the app". QML that **adds or changes features** violates the letter of 2.5.2, whichever engine runs it. QML that re-skins, fixes bugs, or rearranges existing features within the advertised purpose is defensible under both texts, but 2.5.2's wording gives reviewers latitude to call any UI change a "changed feature". Confidence: high on text, medium on how "feature" is read.
- **Guideline 4.7**: a host app offering downloadable plug-ins is permitted as such; the pre-2024 WebKit/JavaScriptCore requirement and store-like-interface ban are gone. Obligations that remain: no native platform API exposure without Apple's permission (4.7.2), per-module consent (4.7.3), an index with universal links (4.7.4), age gating (4.7.5), IAP for paid modules. Confidence: high on text; medium on whether a QML plug-in counts as a permitted "plug-in" since Apple's named examples are HTML5/JavaScript. **[P]** + **[I]**
- Native code (dylibs, C++ plugins) downloaded at runtime is flatly prohibited ("may not download or install executable code") and is also blocked technically by code signing. Not at issue for QML.

### (2) Enforcement in practice

- Sporadic and pattern-driven, not engine-driven. Observed triggers: (i) SDKs containing reflection/`dlopen`/`performSelector` bridges (2017 mass email); (ii) apps whose visible purpose is to run or preview *other* apps or unreviewed content (CodePush app 2020, Anything 2026, Setgreet 2026, even with data-only payloads); (iii) "hidden features" not demonstrable during review. Rejection emails still cite "section 3.3.2" from a template.
- JS OTA for bug fixes and layout tweaks is tolerated at scale (Expo: ~1000 iOS builds/day, one reported rejection in Feb 2019; CodePush still shipping).
- QML specifically: zero documented rejections; Felgo's QML-download apps have been listed continuously since 2016/2017 and 2023. No evidence App Review distinguishes V4 from JavaScriptCore, or even detects the difference. Confidence: medium (absence of evidence; Felgo is a dev tool, not a consumer app).
- Risk model for Logos **[I]**: a general-purpose app shell that fetches arbitrary QML "modules" from a server is structurally what Apple has been removing in 2026 (an app that hosts other apps; 4.7 permits hosted "plug-ins" but only under 4.7.1-4.7.5, and its named safe categories are HTML5/JavaScript mini apps). Bug-fix/theme-level QML updates inside a fixed feature set are low risk.

### (3) Safe alternatives, ranked

1. **Bundled QML + downloaded data only.** All QML/JS compiled into the binary (qmlcachegen/qmlsc), server delivers JSON/config/assets. Fully compliant with both texts. Caveat from the Setgreet case: if the app's *purpose* looks like "preview unreviewed apps", data-only does not save you; keep the feature set fixed and reviewable.
2. **Bundled QML with downloaded QML limited to bug fixes and presentation** (same components, no new screens/capabilities, signed and pinned updates, kill switch). Within 3.3.1(B) conditions (a)-(c); arguable under 2.5.2 as "not introducing or changing features". Same risk class as Expo/CodePush OTA today. Mitigations: never expose reflection or native bridges to downloaded QML; no `dlopen`/`QLibrary` reachable from QML; ship updates only for the current advertised feature set.
3. **WKWebView-hosted HTML/JS (and wasm inside it)** for the dynamic surface. Explicitly contemplated by guideline 4.7 (HTML5/JavaScript mini apps and plug-ins, with 4.7.1-4.7.5 obligations) and by 2.5.6. Same legal status as option 2 under the DPLA, but the longest-standing reviewer-accepted pattern. Costs: two UI stacks, Qt WebView on iOS wraps WKWebView (Qt WebView module). Note the Anything case: a web-view preview did not rescue an app whose purpose was hosting user-generated apps.
4. **Embedded non-WebKit wasm interpreter (wasm3 etc.) executing downloaded modules.** Same DPLA status as options 2-3, must be a pure interpreter (no JIT on iOS), but matches the "running remote scripts based on the contents of the downloaded script" language in Apple's 2017 template and has no acceptance precedent. Rank last.
5. **Not viable**: downloading native plugins/dylibs; any downloaded code that reaches private API or the Objective-C runtime.

Open items: whether Apple's October 8, 2025 change to 3.3.1(B) altered anything beyond wording (Apple's note says only "Updated requirements related to interpreted code"; a diff against the pre-October-2025 PDF was not obtained).
