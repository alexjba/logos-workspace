---
status: proposed — accepted once the WKWebView device spike passes
---
# The Web container renders module UI as QML on one bundled Qt-for-WebAssembly runtime; HTML/JS is allowed but not the primary path

A Downloaded module's UI must run inside the Web container, and the platform's
UI language, design system and every existing UI app are QML. We therefore
bundle a single Qt-for-WebAssembly QML runtime in the app (signed with it, ~25
MB wasm, single-threaded) and have each Downloaded module contribute its QML at
runtime, Canonic-style, instead of shipping a web edition of the design system
and a second UI language. A module's C++ backend is not linked into that
runtime (Qt-wasm dynamic linking is a technology preview); it runs in its own
Wasm host and is remoted to the QML runtime over Qt Remote Objects on a
MessagePort transport, mirroring the desktop `ui-host` split. HTML/JS module UIs
remain allowed because the container is a webview anyway. See
`docs/research/qt-wasm-in-webview.md`.

## Consequences

- A device spike gates this: bundled runtime loaded through a custom URL
  scheme in WKWebView, WebGL2 rendering, memory per live module, keyboard,
  cold start. If it fails, HTML/JS becomes primary and the design system
  needs a web edition.
- Two new transports: QtRO over MessagePort (QML runtime <-> Wasm host) and
  logos-protocol over the webview bridge (Wasm host <-> core).
- Everything in the Web container is single-threaded; concurrency is
  "more workers", never pthreads.
