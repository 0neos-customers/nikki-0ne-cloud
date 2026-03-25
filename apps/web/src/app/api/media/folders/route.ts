import { NextRequest, NextResponse } from 'next/server'
import { safeErrorResponse } from '@/lib/security'
import { createFolder } from '@/features/media/lib/ghl-media-client'

export const dynamic = 'force-dynamic'

/**
 * POST /api/media/folders
 * Create a new folder in GHL Media Library
 *
 * Body (JSON):
 * - name: Folder name (required)
 * - parentId: Optional parent folder ID
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, parentId } = body

    // Validate required fields
    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json(
        { error: 'Folder name is required' },
        { status: 400 }
      )
    }

    const response = await createFolder(name.trim(), parentId || undefined)

    return NextResponse.json(
      {
        success: true,
        folderId: response.folderId,
        name: response.name,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('[Media API] Create folder error:', error)

    // Check for missing config
    if (error instanceof Error && error.message.includes('not configured')) {
      return NextResponse.json(
        { error: 'GHL Media is not configured. Check environment variables.' },
        { status: 503 }
      )
    }

    return safeErrorResponse('Failed to create folder', error)
  }
}
