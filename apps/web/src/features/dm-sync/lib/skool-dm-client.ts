/**
 * Skool DM Client
 *
 * Server-side client for reading and sending Skool DMs.
 * Uses SKOOL_COOKIES for authentication.
 *
 * @module dm-sync/lib/skool-dm-client
 */

import type {
  SkoolConversation,
  SkoolMessage,
  SkoolUser,
  SkoolComment,
  SendResult,
} from '../types'

// =============================================================================
// CONFIGURATION
// =============================================================================

/** Skool API base URL for DM operations */
const SKOOL_API_BASE = 'https://api2.skool.com'

/** Human-like delay range for sending messages (ms) */
const HUMAN_DELAY_MIN_MS = 2000
const HUMAN_DELAY_MAX_MS = 5000

/** Rate limit delay between API requests (ms) */
const REQUEST_DELAY_MS = 200

// =============================================================================
// ERROR TYPES
// =============================================================================

/**
 * Error codes for Skool DM operations
 */
export type SkoolDmErrorCode =
  | 'COOKIES_EXPIRED'
  | 'RATE_LIMITED'
  | 'NOT_FOUND'
  | 'FORBIDDEN'
  | 'NETWORK_ERROR'
  | 'UNKNOWN_ERROR'

/**
 * Custom error for Skool DM operations
 */
export class SkoolDmError extends Error {
  constructor(
    message: string,
    public code: SkoolDmErrorCode,
    public statusCode?: number
  ) {
    super(message)
    this.name = 'SkoolDmError'
  }
}

// =============================================================================
// RAW API RESPONSE TYPES
// =============================================================================

/**
 * Raw chat channel from Skool API
 */
interface SkoolApiChatChannel {
  id: string
  type: 'user'
  user: {
    id: string
    name: string
    displayName: string
    image: string | null
  }
  lastMessageAt: string | null
  lastMessagePreview: string | null
  unreadCount: number
}

/**
 * Raw message from Skool API
 */
interface SkoolApiMessage {
  id: string
  channelId: string
  senderId: string
  content: string
  createdAt: string
}

/**
 * Raw comment from Skool API
 */
interface SkoolApiComment {
  id: string
  userId: string
  user?: {
    id: string
    name: string
    displayName: string
    image?: string | null
  }
  content: string
  createdAt: string
}

// =============================================================================
// CLIENT CONFIGURATION
// =============================================================================

/**
 * Skool DM client configuration
 */
export interface SkoolDmClientConfig {
  cookies: string
  communitySlug?: string
}

// =============================================================================
// CLIENT CLASS
// =============================================================================

/**
 * Client for interacting with Skool DM API
 *
 * @example
 * ```ts
 * const client = new SkoolDmClient({
 *   cookies: process.env.SKOOL_COOKIES!,
 * })
 *
 * const conversations = await client.getInbox()
 * const messages = await client.getMessages(conversations[0].channelId)
 * ```
 */
export class SkoolDmClient {
  private cookies: string
  private communitySlug?: string
  private currentUserId: string | null = null

  constructor(config: SkoolDmClientConfig) {
    if (!config.cookies) {
      throw new SkoolDmError(
        'SKOOL_COOKIES is required',
        'COOKIES_EXPIRED'
      )
    }
    this.cookies = config.cookies
    this.communitySlug = config.communitySlug
  }

  // ===========================================================================
  // PRIVATE HELPERS
  // ===========================================================================

  /**
   * Make authenticated request to Skool API
   */
  private async fetch<T>(
    url: string,
    options: RequestInit = {}
  ): Promise<T> {
    const fullUrl = url.startsWith('http') ? url : `${SKOOL_API_BASE}${url}`

    console.log(`[SkoolDmClient] ${options.method || 'GET'} ${fullUrl}`)
    console.log(`[SkoolDmClient] Cookie length: ${this.cookies?.length || 0}, has auth_token: ${this.cookies?.includes('auth_token=') || false}`)

    try {
      const response = await fetch(fullUrl, {
        ...options,
        headers: {
          accept: 'application/json',
          'accept-language': 'en-US,en;q=0.9',
          'content-type': 'application/json',
          cookie: this.cookies,
          origin: 'https://www.skool.com',
          referer: 'https://www.skool.com/',
          'user-agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          ...options.headers,
        },
      })

      // Handle error responses
      if (!response.ok) {
        const errorCode = this.mapStatusToErrorCode(response.status)
        const errorMessage = await this.getErrorMessage(response)

        console.error(
          `[SkoolDmClient] API error: ${response.status} - ${errorMessage}`
        )

        throw new SkoolDmError(errorMessage, errorCode, response.status)
      }

      return response.json()
    } catch (error) {
      // Re-throw SkoolDmError as-is
      if (error instanceof SkoolDmError) {
        throw error
      }

      // Wrap network errors
      console.error(`[SkoolDmClient] Network error:`, error)
      throw new SkoolDmError(
        error instanceof Error ? error.message : 'Network error',
        'NETWORK_ERROR'
      )
    }
  }

  /**
   * Map HTTP status code to error code
   */
  private mapStatusToErrorCode(status: number): SkoolDmErrorCode {
    switch (status) {
      case 401:
        return 'COOKIES_EXPIRED'
      case 403:
        return 'FORBIDDEN'
      case 404:
        return 'NOT_FOUND'
      case 429:
        return 'RATE_LIMITED'
      default:
        return 'UNKNOWN_ERROR'
    }
  }

  /**
   * Extract error message from response
   */
  private async getErrorMessage(response: Response): Promise<string> {
    try {
      const data = await response.json()
      return (
        data.message ||
        data.error ||
        `HTTP ${response.status}: ${response.statusText}`
      )
    } catch {
      return `HTTP ${response.status}: ${response.statusText}`
    }
  }

  /**
   * Human-like delay before sending messages
   * Randomized between 2-5 seconds
   */
  private async humanDelay(): Promise<void> {
    const delay =
      HUMAN_DELAY_MIN_MS +
      Math.random() * (HUMAN_DELAY_MAX_MS - HUMAN_DELAY_MIN_MS)
    console.log(
      `[SkoolDmClient] Human-like delay: ${Math.round(delay)}ms`
    )
    await new Promise((resolve) => setTimeout(resolve, delay))
  }

  /**
   * Rate limit delay between requests
   */
  private async requestDelay(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, REQUEST_DELAY_MS))
  }

  /**
   * Transform API chat channel to SkoolConversation
   */
  private transformChannel(channel: SkoolApiChatChannel): SkoolConversation {
    return {
      id: channel.id,
      channelId: channel.id,
      participant: {
        id: channel.user.id,
        username: channel.user.name,
        displayName: channel.user.displayName,
        profileImage: channel.user.image,
      },
      lastMessageAt: channel.lastMessageAt
        ? new Date(channel.lastMessageAt)
        : null,
      lastMessagePreview: channel.lastMessagePreview,
      unreadCount: channel.unreadCount,
    }
  }

  /**
   * Transform API message to SkoolMessage
   */
  private transformMessage(
    message: SkoolApiMessage,
    currentUserId: string
  ): SkoolMessage {
    return {
      id: message.id,
      conversationId: message.channelId,
      senderId: message.senderId,
      content: message.content,
      sentAt: new Date(message.createdAt),
      isOutbound: message.senderId === currentUserId,
    }
  }

  // ===========================================================================
  // PUBLIC API
  // ===========================================================================

  /**
   * Get DM inbox (list of conversations)
   *
   * @param offset - Pagination offset (default: 0)
   * @param limit - Number of conversations to fetch (default: 50)
   * @returns Array of conversations
   */
  async getInbox(offset = 0, limit = 50): Promise<SkoolConversation[]> {
    console.log(
      `[SkoolDmClient] Fetching inbox: offset=${offset}, limit=${limit}`
    )

    const url = new URL(`${SKOOL_API_BASE}/self/chat-channels`)
    url.searchParams.set('offset', String(offset))
    url.searchParams.set('limit', String(limit))
    url.searchParams.set('last', 'true')
    url.searchParams.set('unread-only', 'false')

    const response = await this.fetch<{ channels: SkoolApiChatChannel[] }>(
      url.toString()
    )

    console.log(
      `[SkoolDmClient] Fetched ${response.channels?.length || 0} conversations`
    )

    return (response.channels || []).map((channel) =>
      this.transformChannel(channel)
    )
  }

  /**
   * Get all conversations with pagination
   *
   * @returns Array of all conversations
   */
  async getAllInbox(): Promise<SkoolConversation[]> {
    const allConversations: SkoolConversation[] = []
    let offset = 0
    const limit = 50
    const maxIterations = 100 // Safety limit

    for (let i = 0; i < maxIterations; i++) {
      const conversations = await this.getInbox(offset, limit)
      allConversations.push(...conversations)

      if (conversations.length < limit) {
        break
      }

      offset += limit
      await this.requestDelay()
    }

    console.log(
      `[SkoolDmClient] Fetched ${allConversations.length} total conversations`
    )

    return allConversations
  }

  /**
   * Get messages in a conversation
   *
   * @param channelId - The conversation channel ID
   * @param afterMessageId - Get messages after this message ID (for pagination)
   * @returns Array of messages
   */
  async getMessages(
    channelId: string,
    afterMessageId = '1'
  ): Promise<SkoolMessage[]> {
    console.log(
      `[SkoolDmClient] Fetching messages for channel: ${channelId}`
    )

    const url = new URL(`${SKOOL_API_BASE}/channels/${channelId}/messages`)
    url.searchParams.set('after', afterMessageId)

    const response = await this.fetch<{ messages: SkoolApiMessage[] }>(
      url.toString()
    )

    console.log(
      `[SkoolDmClient] Fetched ${response.messages?.length || 0} messages`
    )

    // Get current user ID for determining outbound messages
    const currentUserId = await this.getCurrentUserId()

    return (response.messages || []).map((message) =>
      this.transformMessage(message, currentUserId)
    )
  }

  /**
   * Send a DM to a conversation
   *
   * Includes a human-like delay (2-5 seconds) before sending
   * to avoid detection as automated behavior.
   *
   * @param channelId - The conversation channel ID
   * @param content - The message content
   * @returns Send result with success status and message ID
   */
  async sendMessage(channelId: string, content: string): Promise<SendResult> {
    console.log(
      `[SkoolDmClient] Sending message to channel: ${channelId}`
    )

    // Human-like delay
    await this.humanDelay()

    try {
      const response = await this.fetch<{ message: SkoolApiMessage }>(
        `/channels/${channelId}/messages`,
        {
          method: 'POST',
          body: JSON.stringify({ content }),
        }
      )

      console.log(
        `[SkoolDmClient] Message sent successfully: ${response.message?.id}`
      )

      return {
        success: true,
        skoolMessageId: response.message?.id,
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error'
      console.error(`[SkoolDmClient] Failed to send message:`, errorMessage)

      return {
        success: false,
        error: errorMessage,
      }
    }
  }

  /**
   * Get or create a conversation with a user
   *
   * First checks existing conversations for the user.
   * If not found, creates a new conversation.
   *
   * @param userId - The Skool user ID to start/get conversation with
   * @returns The conversation with the user
   */
  async getOrCreateConversation(userId: string): Promise<SkoolConversation> {
    console.log(
      `[SkoolDmClient] Getting or creating conversation for user: ${userId}`
    )

    // First, try to find existing conversation
    const existingConversation = await this.findConversationByUserId(userId)
    if (existingConversation) {
      console.log(
        `[SkoolDmClient] Found existing conversation: ${existingConversation.channelId}`
      )
      return existingConversation
    }

    // Create new conversation by sending an empty message
    // Skool auto-creates the channel when you message a user
    console.log(`[SkoolDmClient] Creating new conversation with user: ${userId}`)

    const response = await this.fetch<{
      channel: SkoolApiChatChannel
    }>('/channels', {
      method: 'POST',
      body: JSON.stringify({
        type: 'user',
        userId: userId,
      }),
    })

    console.log(
      `[SkoolDmClient] Created conversation: ${response.channel?.id}`
    )

    return this.transformChannel(response.channel)
  }

  /**
   * Find a conversation by user ID
   *
   * @param userId - The Skool user ID
   * @returns The conversation if found, null otherwise
   */
  async findConversationByUserId(
    userId: string
  ): Promise<SkoolConversation | null> {
    // Fetch conversations and look for matching user
    const conversations = await this.getAllInbox()
    const found = conversations.find((conv) => conv.participant.id === userId)
    return found || null
  }

  /**
   * Get the current authenticated user's ID
   *
   * Extracts from the first conversation's context or makes a profile call.
   */
  async getCurrentUserId(): Promise<string> {
    if (this.currentUserId) {
      return this.currentUserId
    }

    // Get user ID from self endpoint
    try {
      const response = await this.fetch<{ user: { id: string } }>(
        '/self/user'
      )
      this.currentUserId = response.user?.id || ''
      console.log(`[SkoolDmClient] Current user ID: ${this.currentUserId}`)
      return this.currentUserId
    } catch {
      // Fallback to a known constant if self endpoint fails
      // This will need to be updated for different users
      console.warn(
        '[SkoolDmClient] Could not fetch current user ID, using fallback'
      )
      this.currentUserId = ''
      return this.currentUserId
    }
  }

  /**
   * Fetch user profile by ID
   *
   * @param userId - The Skool user ID
   * @returns User profile if found
   */
  async getUser(userId: string): Promise<SkoolUser | null> {
    console.log(`[SkoolDmClient] Fetching user profile: ${userId}`)

    try {
      const response = await this.fetch<{
        user: {
          id: string
          name: string
          displayName: string
          image: string | null
          email?: string
        }
      }>(`/users/${userId}`)

      if (!response.user) {
        return null
      }

      return {
        id: response.user.id,
        username: response.user.name,
        displayName: response.user.displayName,
        profileImage: response.user.image,
        email: response.user.email,
      }
    } catch (error) {
      if (
        error instanceof SkoolDmError &&
        error.code === 'NOT_FOUND'
      ) {
        return null
      }
      throw error
    }
  }

  /**
   * Mark a conversation as read
   *
   * @param conversationId - The conversation ID to mark as read
   */
  async markAsRead(conversationId: string): Promise<void> {
    console.log(`[SkoolDmClient] Marking conversation as read: ${conversationId}`)

    await this.fetch(`/channels/${conversationId}/read`, {
      method: 'POST',
    })
  }

  // ===========================================================================
  // POST COMMENTS API (Hand-Raiser Feature)
  // ===========================================================================

  /**
   * Get comments on a Skool post
   *
   * @param postId - The post ID (extracted from URL)
   * @param communitySlug - The community slug (optional, uses instance default)
   * @returns Array of comments
   */
  async getPostComments(
    postId: string,
    communitySlug?: string
  ): Promise<SkoolComment[]> {
    const slug = communitySlug || this.communitySlug
    if (!slug) {
      throw new SkoolDmError(
        'Community slug is required for fetching post comments',
        'UNKNOWN_ERROR'
      )
    }

    console.log(`[SkoolDmClient] Fetching comments for post: ${postId}`)

    // Skool API endpoint for post comments
    // The endpoint structure is: /groups/{groupSlug}/posts/{postId}/comments
    const url = `${SKOOL_API_BASE}/groups/${slug}/posts/${postId}/comments`

    try {
      const response = await this.fetch<{ comments: SkoolApiComment[] }>(url)

      console.log(
        `[SkoolDmClient] Fetched ${response.comments?.length || 0} comments`
      )

      return (response.comments || []).map((comment) =>
        this.transformComment(comment)
      )
    } catch (error) {
      if (error instanceof SkoolDmError && error.code === 'NOT_FOUND') {
        // Post might not exist or no comments yet
        console.log(`[SkoolDmClient] No comments found for post: ${postId}`)
        return []
      }
      throw error
    }
  }

  /**
   * Parse post ID from a Skool post URL
   *
   * Supports formats:
   * - https://www.skool.com/community/post-slug-abc123
   * - https://www.skool.com/community/post/abc123
   *
   * @param url - The full Skool post URL
   * @returns Object with postId and communitySlug
   */
  parsePostIdFromUrl(url: string): { postId: string; communitySlug: string } {
    // Remove trailing slash
    const cleanUrl = url.replace(/\/$/, '')

    // Parse the URL
    let urlObj: URL
    try {
      urlObj = new URL(cleanUrl)
    } catch {
      throw new SkoolDmError(
        `Invalid URL format: ${url}`,
        'UNKNOWN_ERROR'
      )
    }

    // Expected path: /community-slug/post-slug-postid or /community-slug/post/postid
    const pathParts = urlObj.pathname.split('/').filter(Boolean)

    if (pathParts.length < 2) {
      throw new SkoolDmError(
        `Invalid Skool post URL format: ${url}`,
        'UNKNOWN_ERROR'
      )
    }

    const communitySlug = pathParts[0]

    // Check if it's /community/post/postid format
    if (pathParts[1] === 'post' && pathParts[2]) {
      return {
        postId: pathParts[2],
        communitySlug,
      }
    }

    // Otherwise, extract postId from the slug (last segment after final hyphen)
    // Format: post-title-slug-abc123 -> abc123
    const postSlug = pathParts[pathParts.length - 1]

    // Try to extract the postId from the end of the slug
    // Skool post IDs are typically alphanumeric, 8-12 characters
    const lastHyphenIndex = postSlug.lastIndexOf('-')
    if (lastHyphenIndex !== -1) {
      const potentialId = postSlug.substring(lastHyphenIndex + 1)
      // Validate it looks like an ID (alphanumeric, reasonable length)
      if (/^[a-zA-Z0-9]{4,20}$/.test(potentialId)) {
        return {
          postId: potentialId,
          communitySlug,
        }
      }
    }

    // If we can't extract from slug, use the whole slug as the postId
    // (some URLs may be in a different format)
    return {
      postId: postSlug,
      communitySlug,
    }
  }

  /**
   * Transform API comment to SkoolComment
   */
  private transformComment(comment: SkoolApiComment): SkoolComment {
    return {
      id: comment.id,
      userId: comment.userId || comment.user?.id || '',
      username: comment.user?.name || '',
      displayName: comment.user?.displayName || '',
      content: comment.content,
      createdAt: comment.createdAt,
    }
  }

  /**
   * Test the connection and authentication
   *
   * @returns Connection status
   */
  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      await this.getInbox(0, 1)
      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }
}

// =============================================================================
// FACTORY FUNCTIONS
// =============================================================================

/**
 * Singleton instance
 */
let clientInstance: SkoolDmClient | null = null

/**
 * Get the shared Skool DM client instance
 *
 * Uses SKOOL_COOKIES from environment.
 */
export function getSkoolDmClient(): SkoolDmClient {
  if (!clientInstance) {
    clientInstance = createSkoolDmClient()
  }
  return clientInstance
}

/**
 * Create a Skool DM client with environment configuration
 *
 * @param communitySlug - Optional community slug
 * @param cookies - Optional cookies (defaults to SKOOL_COOKIES env)
 */
export function createSkoolDmClient(
  communitySlug?: string,
  cookies?: string
): SkoolDmClient {
  const cookieValue = cookies || process.env.SKOOL_COOKIES

  if (!cookieValue) {
    throw new SkoolDmError(
      'SKOOL_COOKIES environment variable is required',
      'COOKIES_EXPIRED'
    )
  }

  return new SkoolDmClient({
    cookies: cookieValue,
    communitySlug,
  })
}
