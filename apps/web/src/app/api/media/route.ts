import { NextRequest, NextResponse } from 'next/server'
import { safeErrorResponse } from '@/lib/security'
import { listFiles, deleteFile, type GHLMediaFile as GHLApiFile } from '@/features/media/lib/ghl-media-client'

export const dynamic = 'force-dynamic'

/**
 * Transform GHL API response to our internal format
 */
function transformFile(file: GHLApiFile) {
  // Handle empty parentId string as null
  const parentId = file.parentId && file.parentId !== '' ? file.parentId : null
  // GHL uses isFolder boolean, we use type string
  const type: 'file' | 'folder' = file.isFolder ? 'folder' : 'file'

  return {
    id: file.id,
    name: file.name,
    url: file.url || '',
    type,
    parentId,
    mimeType: file.mimeType,
    size: file.size,
    altId: file.altId,
    createdAt: file.createdAt || file.updatedAt,
  }
}

/**
 * GET /api/media
 * List files and folders from GHL Media Library
 *
 * Query params:
 * - parentId: Optional parent folder ID
 * - search: Optional search term
 * - limit: Number of items (default 50)
 * - offset: Pagination offset
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const parentId = searchParams.get('parentId') || undefined
    const search = searchParams.get('search') || undefined
    const limit = searchParams.get('limit')
      ? parseInt(searchParams.get('limit')!, 10)
      : undefined
    const offset = searchParams.get('offset')
      ? parseInt(searchParams.get('offset')!, 10)
      : undefined

    // Fetch both files and folders in parallel
    const [filesResponse, foldersResponse] = await Promise.all([
      listFiles({ parentId, searchKey: search, limit, offset, type: 'file' }),
      listFiles({ parentId, searchKey: search, limit, offset, type: 'folder' }),
    ])

    // Transform and merge results (folders first, then files)
    const transformedFolders = (foldersResponse.files || []).map(transformFile)
    const transformedFiles = (filesResponse.files || []).map(transformFile)
    const allFiles = [...transformedFolders, ...transformedFiles]

    return NextResponse.json({
      files: allFiles,
      total: allFiles.length,
    })
  } catch (error) {
    console.error('[Media API] GET error:', error)

    // Check for missing config
    if (error instanceof Error && error.message.includes('not configured')) {
      return NextResponse.json(
        { error: 'GHL Media is not configured. Check environment variables.' },
        { status: 503 }
      )
    }

    return safeErrorResponse('Failed to fetch media files', error)
  }
}

/**
 * DELETE /api/media?id=<fileId>
 * Delete a file or folder from GHL Media Library
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'Missing id parameter' },
        { status: 400 }
      )
    }

    await deleteFile(id)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Media API] DELETE error:', error)
    return safeErrorResponse('Failed to delete file', error)
  }
}
