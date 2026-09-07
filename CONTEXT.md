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
