import { NextRequest, NextResponse } from 'next/server'
import { safeErrorResponse } from '@/lib/security'
import {
  getFile,
  updateFile,
  deleteFile,
} from '@/features/media/lib/ghl-media-client'

export const dynamic = 'force-dynamic'

/**
 * GET /api/media/[id]
 * Get a single file or folder by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    if (!id) {
      return NextResponse.json(
        { error: 'File ID is required' },
        { status: 400 }
      )
    }

    const response = await getFile(id)

    return NextResponse.json({ file: response.file })
  } catch (error) {
    console.error('[Media API] GET by ID error:', error)

    // Check for missing config
    if (error instanceof Error && error.message.includes('not configured')) {
      return NextResponse.json(
        { error: 'GHL Media is not configured. Check environment variables.' },
        { status: 503 }
      )
    }

    // Check for 404
    if (error instanceof Error && error.message.includes('404')) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      )
    }

    return safeErrorResponse('Failed to fetch file', error)
  }
}

/**
 * PUT /api/media/[id]
 * Update a file or folder name
 *
 * Body (JSON):
 * - name: New name (required)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { name } = body

    if (!id) {
      return NextResponse.json(
        { error: 'File ID is required' },
        { status: 400 }
      )
    }

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      )
    }

    const response = await updateFile(id, name.trim())

    return NextResponse.json({
      success: response.success,
      file: response.file,
    })
  } catch (error) {
    console.error('[Media API] PUT error:', error)

    // Check for missing config
    if (error instanceof Error && error.message.includes('not configured')) {
      return NextResponse.json(
        { error: 'GHL Media is not configured. Check environment variables.' },
        { status: 503 }
      )
    }

    // Check for 404
    if (error instanceof Error && error.message.includes('404')) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      )
    }

    return safeErrorResponse('Failed to update file', error)
  }
}

/**
 * DELETE /api/media/[id]
 * Delete a file or folder
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    if (!id) {
      return NextResponse.json(
        { error: 'File ID is required' },
        { status: 400 }
      )
    }

    await deleteFile(id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Media API] DELETE error:', error)

    // Check for missing config
    if (error instanceof Error && error.message.includes('not configured')) {
      return NextResponse.json(
        { error: 'GHL Media is not configured. Check environment variables.' },
        { status: 503 }
      )
    }

    // Check for 404
    if (error instanceof Error && error.message.includes('404')) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      )
    }

    return safeErrorResponse('Failed to delete file', error)
  }
}
