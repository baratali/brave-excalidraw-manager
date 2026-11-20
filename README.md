# Excalidraw Folder Manager

A Manifest V3 Brave extension adding a local file sidebar to https://excalidraw.com.

## Install

Run `npm install`, `npm run typecheck`, `npm test`, and `npm run build`. In `brave://extensions`, enable Developer mode, click **Load unpacked**, and select `dist/`. Open or reload Excalidraw, click **Connect folder**, then choose the folder in the extension setup tab. If the picker is unavailable, enable `brave://flags/#file-system-access-api` and relaunch Brave. Folder permissions may need reconnecting after restart.

The active drawing is remembered per tab across page refreshes. The manager verifies the restored canvas and folder before reconnecting; pending edits remain unsaved and external edits use the conflict flow.

Drawings are saved after 750 ms of inactivity. Ctrl/Cmd+S saves immediately; Ctrl/Cmd+Shift+P opens recent/search mode. Paths in creation dialogs are relative to the selected folder. Rename / Move accepts a new relative path; create destination folders first. Trash stores copies inside `.excalidraw-manager-trash` and supports restoring to a chosen path.

Keep only one Excalidraw tab open. If sync pauses, close other tabs and click Reconcile. External disk edits are checked every two seconds while visible; conflicts require choosing a version. Browser recovery drafts are retained in extension IndexedDB. Do not uninstall the extension if you need unsaved drafts. Browser APIs cannot provide atomic locking against another application editing the same file.

## Compatibility and verification

The editor bridge relies on Excalidraw React internals, rather than an official extension API. It requires an App instance exposing `api`; incompatible website releases show an unavailable editor state. The extension does not modify Excalidraw source or send files to a server. Excalidraw itself retains its normal site behavior.

Automated checks cover scene/image round trips, path safety, file operations, conflicts, trash restoration, multiple-tab write blocking, and permission/write failures. Real Brave folder-picker behavior, production editor compatibility, conflict handling, moves, recovery, and worker lifecycle require manual verification before using important drawings. This initial implementation is not yet a fully verified release of the complete design.

Manual smoke test: use a disposable folder with two drawings and an embedded image. Edit and switch; inspect disk JSON and reopen. Edit on disk; verify clean reload and dirty conflict choices. Test duplicate, move, trash, restore, revoked permission, a second tab, and browser restart. Confirm no original is removed when a copy fails. Test native Open and drag/drop controls do not overwrite a managed file.
