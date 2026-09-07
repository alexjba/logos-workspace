# The Shell is a dynamic plugin on Android and statically linked on iOS

Qt refuses shared-library builds for iOS (`qt_auto_detect_apple` fails hard on
`BUILD_SHARED_LIBS=ON`, no override), so Qt on iOS is static frameworks and
`QPluginLoader` cannot load a dynamic plugin without duplicating Qt. On iOS the
Shell is therefore linked into the Shell host via `Q_IMPORT_PLUGIN` /
`staticInstances()`; on Android, where Qt is shared, it stays the same `.so`
plugin the desktop host loads. The `IShellView` contract is identical on both;
only the loading line differs.

## Consequences

- Status ADR 0007's iOS plan (modules dlopened from embedded `.framework`s) has
  the same constraint, because modules are Qt plugins. Its documented fallback
  (static link + registration table) is the supported iOS path unless a
  time-boxed spike on patching Qt's iOS shared-lib gate succeeds.
- Qt for iOS is built from source in nix like every other target, but the
  derivation reads Xcode from `/Applications` (`__noChroot`), so it is
  Xcode-version-impure and must gate the Xcode version explicitly.
