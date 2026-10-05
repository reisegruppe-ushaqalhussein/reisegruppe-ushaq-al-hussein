<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Keep the public campaign experience Arabic/German only, with Arabic immediately above German, because bilingual parity is a core requirement.
- Keep visual styling token-driven in `src/styles.css` with mobile-first layouts, because the campaign is primarily viewed on phones.
- Keep the campaign as a single route with in-page view state for its app-like tab navigation, because the requested experience uses dedicated instant screens behind one persistent bottom bar.
- Editable campaign content, including payment visibility and bank fields, lives in one `site_content` row (id `main`, jsonb) read publicly and written only via a password-checked server function (ADMIN_PASSWORD secret), because the admin panel is a shared-password gate without user accounts.
- Keep Ziyarat inside the `duas` in-page view with shrine/list/reader subviews and admin-provided audio.
- Language choice (both/ar/de/en) lives in `src/lib/i18n.tsx` context; `Pair` renders per choice and English maps from German strings, because the default must stay Arabic-above-German.
- Generate all home-screen icons from a tight crop of the gold arch, dome, and main calligraphy on a full ivory canvas, excluding small informational lines while retaining a narrow mask-safe edge.
- Offline: content is network-first with IndexedDB fallback (`src/lib/offline.ts`), admin saves queue locally when offline and flush on reconnect; the service worker comes from vite-plugin-pwa (output dist/client) and registers only via `src/lib/register-sw.ts`, because it must never run in preview.
- Urgent-alert push uses the Firebase Messaging connector: device tokens in `push_tokens` (service-role only), sent from `sendAlertPush` when the admin saves a changed active alert, because web push must reach closed apps.
- Cache admin-provided reciter MP3 streams for playback after the first listen.
- Open the root route through a device-persisted welcome and language choice before the dashboard.
- Staff access uses one neutral code field; the server maps the code to role `admin` (`password` / ADMIN_PASSWORD) or `haj` (`haj_password`) in `admin_settings`, and sessions persist in localStorage via `src/lib/admin-session.ts`, because the gateway must not reveal roles and the leader must stay signed in.
- Only admin-in-admin-mode sees hidden items and hide/restore buttons (`useShowHidden`); every list must filter with it, because the leader view must stay uncluttered.
- Removed items from any content array are auto-captured into `site_content.trash` by `withTrash` inside `saveOrQueue`, so new sections get the recycle bin by adding their key to `trashSections`.
- Device list and failed attempts are JSON values in `admin_settings` (`devices`, `failures`), because no extra tables are needed.
- English mode uses the built-in dictionary, then automatic AI translation (`translateToEnglish`) cached per device, because admin-written content must also switch fully to English.
- Section navigation pushes browser history and handles `popstate` (closing open dialogs first), because the phone back button must stay inside the app.
- App structure (tile order, hidden tiles, folder nesting via `parents`, admin-created sections, palette/columns, haj permission) lives in `site_content.cms` and renders through `TileGrid`/`CustomSectionView` in `src/components/cms.tsx`, because new sections must look identical to built-in ones and stay editable without code.
- All bilingual text goes through `display()`/`LangText` in `src/lib/i18n.tsx` (missing German is auto-translated from Arabic), because every language mode must show one consistent language with start alignment.
- `useAdminSession` returns null while staff hide tools (`setToolsHidden`); the staff bar uses `useStaffSession`, because the admin needs a clean view without signing out.
