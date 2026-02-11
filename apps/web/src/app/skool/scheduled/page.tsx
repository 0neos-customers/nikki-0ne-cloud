'use client'

import { Suspense, useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  Button,
  Card,
  CardContent,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@0ne/ui'
import {
  CalendarClock,
  CheckCircle,
  CheckCircle2,
  Clock,
  Edit,
  ExternalLink,
  Mail,
  Plus,
  Trash2,
  XCircle,
} from 'lucide-react'
import {
  useOneOffPosts,
  createOneOffPost,
  updateOneOffPost,
  deleteOneOffPost,
} from '@/features/skool/hooks/use-oneoff-posts'
import { useCampaigns } from '@/features/skool/hooks/use-campaigns'
import { OneOffPostDialog, ConfirmDialog, type OneOffPostFormData } from '@/features/skool/components'
import type { OneOffPostStatus } from '@0ne/db'

function ScheduledPostsContent() {
  const searchParams = useSearchParams()
  const campaignIdFilter = searchParams.get('campaign_id') || undefined
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const { posts, isLoading, refresh } = useOneOffPosts({
    campaignId: campaignIdFilter,
    status: statusFilter !== 'all' ? statusFilter : undefined,
  })
  const { campaigns } = useCampaigns({ activeOnly: true })
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedPost, setSelectedPost] = useState<OneOffPostFormData | null>(null)
  const [postToDelete, setPostToDelete] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Check for ?new=true query param
  useEffect(() => {
    if (searchParams.get('new') === 'true') {
      setSelectedPost(null)
      setDialogOpen(true)
    }
  }, [searchParams])

  const handleCreate = () => {
    setSelectedPost(null)
    setDialogOpen(true)
  }

  const handleEdit = (post: OneOffPostFormData) => {
    setSelectedPost(post)
    setDialogOpen(true)
  }

  const handleDelete = (id: string) => {
    setPostToDelete(id)
    setDeleteDialogOpen(true)
  }

  const handleSave = async (data: OneOffPostFormData) => {
    setIsSaving(true)
    try {
      // Combine date and time into scheduled_at
      const scheduledAt = `${data.scheduled_date}T${data.scheduled_time}:00`

      if (data.id) {
        await updateOneOffPost(data.id, {
          group_slug: data.group_slug,
          category: data.category,
          category_id: data.category_id,
          scheduled_at: scheduledAt,
          timezone: data.timezone,
          title: data.title,
          body: data.body,
          image_url: data.image_url || null,
          video_url: data.video_url || null,
          campaign_id: data.campaign_id,
          send_email_blast: data.send_email_blast,
          status: data.status,
        })
      } else {
        await createOneOffPost({
          group_slug: data.group_slug,
          category: data.category,
          category_id: data.category_id,
          scheduled_at: scheduledAt,
          timezone: data.timezone,
          title: data.title,
          body: data.body,
          image_url: data.image_url || null,
          video_url: data.video_url || null,
          campaign_id: data.campaign_id,
          send_email_blast: data.send_email_blast,
          status: data.status,
        })
      }
      refresh()
      setDialogOpen(false)
    } finally {
      setIsSaving(false)
    }
  }

  const handleConfirmDelete = async () => {
    if (!postToDelete) return
    setIsDeleting(true)
    try {
      await deleteOneOffPost(postToDelete)
      refresh()
      setDeleteDialogOpen(false)
      setPostToDelete(null)
    } finally {
      setIsDeleting(false)
    }
  }

  const getStatusIcon = (status: OneOffPostStatus) => {
    switch (status) {
      case 'draft':
        return <CalendarClock className="h-4 w-4 text-blue-500" />
      case 'approved':
        return <CheckCircle2 className="h-4 w-4 text-purple-500" />
      case 'pending':
        return <Clock className="h-4 w-4 text-amber-500" />
      case 'published':
      case 'posted_manually':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'cancelled':
        return <XCircle className="h-4 w-4 text-gray-500" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  const getStatusLabel = (status: OneOffPostStatus) => {
    const labels: Record<OneOffPostStatus, string> = {
      draft: 'Draft',
      approved: 'Approved',
      pending: 'Scheduled',
      published: 'Published',
      posted_manually: 'Posted Manually',
      failed: 'Failed',
      cancelled: 'Cancelled',
    }
    return labels[status] || status
  }

  const parseScheduledAt = (scheduledAt: string): { date: string; time: string } => {
    const dt = new Date(scheduledAt)
    const date = dt.toISOString().split('T')[0]
    const hours = dt.getHours().toString().padStart(2, '0')
    const minutes = dt.getMinutes().toString().padStart(2, '0')
    return { date, time: `${hours}:${minutes}` }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Scheduled Posts</h1>
          <p className="text-sm text-muted-foreground">
            One-off posts scheduled for specific dates and times
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Schedule Post
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="draft">Draft (Manual)</SelectItem>
            <SelectItem value="published">Published</SelectItem>
            <SelectItem value="posted_manually">Posted Manually</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Loading...</div>
      ) : posts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">No scheduled posts</p>
            <Button onClick={handleCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Schedule your first post
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {posts.map((post) => {
            const scheduledDate = new Date(post.scheduled_at)
            const { date, time } = parseScheduledAt(post.scheduled_at)
            const isPast = scheduledDate < new Date()

            return (
              <Card key={post.id} className={post.status === 'cancelled' ? 'opacity-50' : ''}>
                <CardContent className="flex items-center justify-between py-4">
                  <div className="flex items-center gap-4">
                    <div className="flex flex-col items-center justify-center w-16 text-center">
                      <span className="text-sm font-medium">
                        {scheduledDate.toLocaleDateString('en-US', { month: 'short' })}
                      </span>
                      <span className="text-2xl font-bold">
                        {scheduledDate.getDate()}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {scheduledDate.toLocaleTimeString('en-US', {
                          hour: 'numeric',
                          minute: '2-digit',
                          hour12: true,
                        })}
                      </span>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(post.status)}
                        <h3 className="font-medium">{post.title}</h3>
                        {post.send_email_blast && (
                          <span title="Email blast enabled">
                            <Mail className="h-4 w-4 text-blue-500" />
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {post.category}
                        {post.campaign && ` • ${post.campaign.name}`}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Status: {getStatusLabel(post.status)}
                        {post.error_message && (
                          <span className="text-red-500"> - {post.error_message}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {post.skool_post_url && (
                      <a
                        href={post.skool_post_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 hover:bg-muted rounded-md"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        handleEdit({
                          id: post.id,
                          group_slug: post.group_slug,
                          category: post.category,
                          category_id: post.category_id,
                          scheduled_date: date,
                          scheduled_time: time,
                          timezone: post.timezone,
                          title: post.title,
                          body: post.body,
                          image_url: post.image_url || '',
                          video_url: post.video_url || '',
                          campaign_id: post.campaign_id,
                          send_email_blast: post.send_email_blast,
                          status: post.status,
                        })
                      }
                      disabled={post.status === 'published' || post.status === 'posted_manually'}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(post.id)}
                      disabled={post.status === 'published' || post.status === 'posted_manually'}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <OneOffPostDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        post={selectedPost}
        onSave={handleSave}
        isSaving={isSaving}
      />

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Scheduled Post"
        description="Are you sure you want to delete this scheduled post? This action cannot be undone."
        confirmText="Delete"
        onConfirm={handleConfirmDelete}
        isLoading={isDeleting}
        variant="destructive"
      />
    </div>
  )
}

export default function ScheduledPostsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[400px]">Loading...</div>}>
      <ScheduledPostsContent />
    </Suspense>
  )
}
