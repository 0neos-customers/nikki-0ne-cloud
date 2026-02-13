# GHL Media Manager - Build State

**Last Updated:** 2026-02-10
**Status:** Complete

---

## Summary

GHL Media Manager feature that provides:
1. Sidebar navigation to browse/manage GHL media library
2. Bulk file uploads with folder organization
3. Media picker integration with Skool post scheduler

---

## Phase 1: Foundation - Navigation & Permissions

**Status:** Complete

### Files Modified
- [x] `packages/auth/src/permissions.ts` - Added `'ghlMedia'` to AppId type and DEFAULT_PERMISSIONS
- [x] `apps/web/src/lib/apps.ts` - Added ghlMedia config to APPS array and getAppNavigation()
- [x] `apps/web/src/components/shell/Sidebar.tsx` - Added ghlMedia to allAppsNavigation

### Files Created
- [x] `apps/web/src/app/media/layout.tsx` - AppShell wrapper
- [x] `apps/web/src/app/media/page.tsx` - Library page
- [x] `apps/web/src/app/media/upload/page.tsx` - Upload page

### Acceptance
- [x] GHL Media appears in sidebar when permission enabled
- [x] Sub-nav shows Library and Upload items
- [x] Pages render without error

---

## Phase 2: GHL Media API Routes

**Status:** Complete

### Files Created
- [x] `apps/web/src/features/media/lib/ghl-media-client.ts` - Server-side GHL Media API client
- [x] `apps/web/src/app/api/media/route.ts` - GET - List files/folders
- [x] `apps/web/src/app/api/media/upload/route.ts` - POST - Upload file (multipart)
- [x] `apps/web/src/app/api/media/folders/route.ts` - POST - Create folder
- [x] `apps/web/src/app/api/media/[id]/route.ts` - GET/PUT/DELETE - Single file ops

### Acceptance
- [x] GET /api/media returns GHL files/folders
- [x] GET /api/media?parentId=xxx returns folder children
- [x] POST /api/media/upload uploads to GHL, returns file info
- [x] POST /api/media/folders creates folder in GHL
- [x] DELETE /api/media/[id] removes from GHL

---

## Phase 3: Media Feature Module

**Status:** Complete

### Files Created
- [x] `apps/web/src/features/media/types/index.ts` - GHLMediaFile, UploadProgress types
- [x] `apps/web/src/features/media/hooks/use-media-library.ts` - SWR hook for listing files
- [x] `apps/web/src/features/media/hooks/use-media-upload.ts` - Upload with progress tracking
- [x] `apps/web/src/features/media/hooks/use-folder-navigation.ts` - Breadcrumbs and folder state
- [x] `apps/web/src/features/media/hooks/index.ts` - Exports
- [x] `apps/web/src/features/media/index.ts` - Feature barrel export

### Acceptance
- [x] useMediaLibrary fetches files for parent folder
- [x] useMediaUpload tracks progress for multiple uploads
- [x] useFolderNavigation manages breadcrumbs

---

## Phase 4: Media Library UI

**Status:** Complete

### Files Created
- [x] `apps/web/src/features/media/components/MediaGrid.tsx` - Grid/list view of files
- [x] `apps/web/src/features/media/components/FolderBreadcrumbs.tsx` - Path navigation
- [x] `apps/web/src/features/media/components/MediaToolbar.tsx` - View toggle, create folder, delete
- [x] `apps/web/src/features/media/components/CreateFolderDialog.tsx` - New folder dialog
- [x] `apps/web/src/features/media/components/DeleteConfirmDialog.tsx` - Delete confirmation
- [x] `apps/web/src/features/media/components/index.ts` - Component exports

### Files Updated
- [x] `apps/web/src/app/media/page.tsx` - Full library page implementation

### Acceptance
- [x] Files/folders display in grid view
- [x] Click folder to navigate into it
- [x] Breadcrumbs allow navigation back
- [x] Create folder works
- [x] Delete single/multiple items works

---

## Phase 5: Bulk Upload Page

**Status:** Complete

### Files Created
- [x] `apps/web/src/features/media/components/UploadDropzone.tsx` - Drag-drop zone
- [x] `apps/web/src/features/media/components/UploadProgressList.tsx` - Upload status list
- [x] `apps/web/src/features/media/components/FolderSelector.tsx` - Target folder picker

### Files Updated
- [x] `apps/web/src/app/media/upload/page.tsx` - Full upload page implementation

### Acceptance
- [x] Can select target folder
- [x] Drag and drop multiple files
- [x] Progress shown per file
- [x] Errors with retry option

---

## Phase 6: Skool Integration - Media Picker

**Status:** Complete

### Files Created
- [x] `apps/web/src/features/media/components/MediaPickerDialog.tsx` - Reusable picker modal

### Files Modified
- [x] `apps/web/src/features/skool/components/PostDialog.tsx` - Added picker button to image_url field
- [x] `apps/web/src/features/skool/components/OneOffPostDialog.tsx` - Same pattern

### Acceptance
- [x] Picker opens from PostDialog
- [x] Can browse and select GHL media
- [x] Selection populates image_url field
- [x] Preview shows selected image
- [x] Manual URL input still works as fallback
- [x] Same integration in OneOffPostDialog

---

## File Structure (Final)

```
apps/web/src/
├── app/
│   ├── media/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── upload/page.tsx
│   └── api/media/
│       ├── route.ts
│       ├── upload/route.ts
│       ├── folders/route.ts
│       └── [id]/route.ts
├── features/media/
│   ├── index.ts
│   ├── types/index.ts
│   ├── lib/ghl-media-client.ts
│   ├── hooks/
│   │   ├── index.ts
│   │   ├── use-media-library.ts
│   │   ├── use-media-upload.ts
│   │   └── use-folder-navigation.ts
│   └── components/
│       ├── index.ts
│       ├── MediaGrid.tsx
│       ├── FolderBreadcrumbs.tsx
│       ├── MediaToolbar.tsx
│       ├── CreateFolderDialog.tsx
│       ├── DeleteConfirmDialog.tsx
│       ├── UploadDropzone.tsx
│       ├── UploadProgressList.tsx
│       ├── FolderSelector.tsx
│       └── MediaPickerDialog.tsx
```

---

## Environment Variables Required

```
GHL_PRIVATE_INTEGRATION_TOKEN=your_token
GHL_LOCATION_ID=your_location_id
```

---

## Verification Checklist

After deployment, verify:

1. **Navigation:** Enable ghlMedia permission in user settings, verify sidebar shows GHL Media
2. **Library:** Browse folders, create folder, delete file
3. **Upload:** Bulk upload 3+ files to a folder
4. **Skool Integration:** Create Skool post using media picker, verify image_url saved correctly

---

## Notes

- **No local DB tables needed** - GHL is source of truth
- **Existing Skool flow unchanged** - `uploadFileFromUrl()` in post-client.ts already handles downloading from URL and uploading to Skool at publish time
- **GHL credentials stay server-side** - All API calls proxied through Next.js routes
