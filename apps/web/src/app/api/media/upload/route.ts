import { NextRequest, NextResponse } from 'next/server'
import { safeErrorResponse } from '@/lib/security'
import {
  uploadFile,
  isFileSizeValid,
  isVideoFile,
} from '@/features/media/lib/ghl-media-client'

export const dynamic = 'force-dynamic'

// Next.js config for handling large file uploads
export const config = {
  api: {
    bodyParser: false,
  },
}

/**
 * POST /api/media/upload
 * Upload a file to GHL Media Library
 *
 * Body (FormData):
 * - file: The file to upload (required)
 * - parentId: Optional parent folder ID
 *
 * Size limits:
 * - Standard files: 25MB
 * - Video files: 500MB
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const parentId = formData.get('parentId') as string | null

    // Validate file presence
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    // Validate file size
    const isVideo = isVideoFile(file.name)
    if (!isFileSizeValid(file.size, isVideo)) {
      const maxSize = isVideo ? '500MB' : '25MB'
      return NextResponse.json(
        { error: `File size exceeds ${maxSize} limit` },
        { status: 400 }
      )
    }

    // Get ArrayBuffer from File
    const arrayBuffer = await file.arrayBuffer()

    // Upload to GHL
    const response = await uploadFile(arrayBuffer, file.name, {
      parentId: parentId || undefined,
    })

    return NextResponse.json(
      {
        success: true,
        fileId: response.fileId,
        fileName: response.fileName,
        url: response.url,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('[Media API] Upload error:', error)

    // Check for missing config
    if (error instanceof Error && error.message.includes('not configured')) {
      return NextResponse.json(
        { error: 'GHL Media is not configured. Check environment variables.' },
        { status: 503 }
      )
    }

    return safeErrorResponse('Failed to upload file', error)
  }
}
