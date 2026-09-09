# Logos Workspace

The aggregation point for the Logos platform repos. This context covers how the platform is assembled, built and delivered across desktop and mobile targets; the individual repos own their own domain language.

## Language

### Basecamp

**Basecamp**:
The Logos desktop application: a shell that hosts UI apps and manages installed modules.
_Avoid_: Logos App, the app

**Shell**:
Basecamp's own user interface (sidebar, App Manager, Settings). Built as one plugin that knows nothing about the Logos runtime.
_Avoid_: main UI, main_ui, the frontend

**Shell host**:
The side of Basecamp that owns the window and the runtime and hands the Shell its data. There is one per delivery target; the Shell does not change between them.
_Avoid_: host app, container

**UI app**:
A separately delivered application (e.g. Package Manager) that Basecamp loads into its workspace. Distinct from the Shell.
_Avoid_: UI plugin, plugin app

### Mock tiers

**Fixture**:
A static data set that stands in for a live Logos backend so the Shell can render without one.
_Avoid_: mock data, stub data

**Shell preview**:
The Shell running against a Fixture with no Logos code present at all. No UI apps load. The designated first thing to bring up on a new platform.
_Avoid_: UI-only preview, mock UI

**Mock backend**:
Basecamp running with the full Logos plugin machinery but with module calls answered from a Fixture. UI apps load for real. Not the mobile starting point.
_Avoid_: mocked basecamp (ambiguous between the two tiers)

### Mobile

**Mobile bring-up milestone**:
Shell preview running on an Android device and an iOS device from one workspace command. Milestone 1 of the mobile track; precedes porting the Logos runtime to mobile and precedes Status integration.

### Mobile module hosting

**Bundled module**:
A module compiled into the mobile app at build time and shipped with it through the store. The set is fixed per app release. First-party modules on mobile are Bundled.
_Avoid_: built-in module, native module (says how it is built, not how it is delivered)

**Downloaded module**:
A module the user installs at runtime from the catalog, after the app was shipped. On iOS it may only run inside a Web container.
_Avoid_: third-party module (ownership is not the distinction; delivery is)

**Native container**:
The in-process container that runs Bundled modules on supervised threads in the app's address space.
_Avoid_: in-proc loader

**Web container**:
The container that runs Downloaded modules inside a platform webview (WKWebView on iOS). The only store-legal home for runtime-downloaded code on iOS.
_Avoid_: wasm container (wasm is one way to fill it, not the container itself)

**Remote core**:
A Logos runtime running on the user's own desktop that a mobile app attaches to as a client, so modules, keys and state stay on the desktop. A dogfood posture for the mobile track, not a product promise; never a hosted (cloud) core.
_Avoid_: cloud core, hosted core, server
