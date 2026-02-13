/**
 * GHL Conversation Provider Client
 *
 * Handles GHL Conversation Provider API interactions for DM sync.
 * Uses OAuth 2.0 with marketplace credentials to push inbound messages
 * and receive outbound webhooks from the GHL inbox.
 *
 * Provider alias: "Skool"
 *
 * @module dm-sync/lib/ghl-conversation
 */

import crypto from 'crypto'
import type {
  GhlConversation,
  GhlMessage,
  GhlContact,
  SendResult,
} from '../types'

// =============================================================================
// CONFIGURATION
// =============================================================================

const GHL_API_BASE = 'https://services.leadconnectorhq.com'
const GHL_OAUTH_URL = 'https://services.leadconnectorhq.com/oauth/token'

/**
 * GHL conversation client configuration
 */
export interface GhlConversationClientConfig {
  apiKey: string
  locationId: string
}

/**
 * GHL Marketplace OAuth configuration
 */
export interface GhlMarketplaceConfig {
  clientId: string
  clientSecret: string
  locationId: string
  conversationProviderId?: string
}

/**
 * OAuth token response
 */
interface OAuthTokenResponse {
  access_token: string
  token_type: string
  expires_in: number
  refresh_token?: string
  scope?: string
  locationId?: string
  userId?: string
}

/**
 * GHL API error response
 */
interface GhlApiError {
  message?: string
  error?: string
  statusCode?: number
}

// =============================================================================
// TOKEN CACHE
// =============================================================================

interface TokenCacheEntry {
  accessToken: string
  expiresAt: number
  refreshToken?: string
}

const tokenCache = new Map<string, TokenCacheEntry>()

// =============================================================================
// MARKETPLACE CLIENT CLASS
// =============================================================================

/**
 * Client for GHL Conversation Provider API (Marketplace App)
 *
 * This client uses OAuth 2.0 with marketplace credentials to:
 * - Push inbound messages from Skool to GHL inbox
 * - Create custom channel conversations
 * - Handle webhook verification
 *
 * @example
 * ```ts
 * const client = new GhlConversationProviderClient({
 *   clientId: process.env.GHL_MARKETPLACE_CLIENT_ID!,
 *   clientSecret: process.env.GHL_MARKETPLACE_CLIENT_SECRET!,
 *   locationId: 'loc_123',
 *   conversationProviderId: 'provider_456'
 * })
 *
 * const messageId = await client.pushInboundMessage(
 *   'loc_123',
 *   'contact_789',
 *   'skool_user_abc',
 *   'Hello from Skool!',
 *   'skool_msg_xyz'
 * )
 * ```
 */
export class GhlConversationProviderClient {
  private clientId: string
  private clientSecret: string
  private locationId: string
  private conversationProviderId: string

  constructor(config: GhlMarketplaceConfig) {
    this.clientId = config.clientId
    this.clientSecret = config.clientSecret
    this.locationId = config.locationId
    this.conversationProviderId = config.conversationProviderId || ''
  }

  /**
   * Get OAuth access token, refreshing if necessary
   */
  private async getAccessToken(): Promise<string> {
    const cacheKey = `${this.clientId}:${this.locationId}`
    const cached = tokenCache.get(cacheKey)

    // Return cached token if still valid (with 5 minute buffer)
    if (cached && cached.expiresAt > Date.now() + 5 * 60 * 1000) {
      return cached.accessToken
    }

    // Refresh token if we have one
    if (cached?.refreshToken) {
      try {
        const newToken = await this.refreshToken(cached.refreshToken)
        tokenCache.set(cacheKey, newToken)
        return newToken.accessToken
      } catch (error) {
        console.error('[GHL Provider] Token refresh failed, will use client credentials:', error)
      }
    }

    // Get new token using client credentials
    const newToken = await this.getClientCredentialsToken()
    tokenCache.set(cacheKey, newToken)
    return newToken.accessToken
  }

  /**
   * Get token using client credentials grant
   */
  private async getClientCredentialsToken(): Promise<TokenCacheEntry> {
    const response = await fetch(GHL_OAUTH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: this.clientId,
        client_secret: this.clientSecret,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`OAuth token request failed: ${response.status} - ${errorText}`)
    }

    const data = (await response.json()) as OAuthTokenResponse

    return {
      accessToken: data.access_token,
      expiresAt: Date.now() + data.expires_in * 1000,
      refreshToken: data.refresh_token,
    }
  }

  /**
   * Refresh an existing token
   */
  private async refreshToken(refreshToken: string): Promise<TokenCacheEntry> {
    const response = await fetch(GHL_OAUTH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: this.clientId,
        client_secret: this.clientSecret,
        refresh_token: refreshToken,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`OAuth refresh failed: ${response.status} - ${errorText}`)
    }

    const data = (await response.json()) as OAuthTokenResponse

    return {
      accessToken: data.access_token,
      expiresAt: Date.now() + data.expires_in * 1000,
      refreshToken: data.refresh_token || refreshToken,
    }
  }

  /**
   * Make authenticated API request with retry on 401
   */
  private async request<T>(
    endpoint: string,
    options?: RequestInit & { retryOnAuth?: boolean }
  ): Promise<T> {
    const { retryOnAuth = true, ...fetchOptions } = options || {}
    const accessToken = await this.getAccessToken()
    const url = `${GHL_API_BASE}${endpoint}`

    const response = await fetch(url, {
      ...fetchOptions,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        Version: '2021-07-28',
        ...fetchOptions?.headers,
      },
    })

    // Handle rate limiting
    if (response.status === 429) {
      const retryAfter = parseInt(response.headers.get('Retry-After') || '5')
      console.warn(`[GHL Provider] Rate limited, waiting ${retryAfter}s`)
      await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000))
      return this.request(endpoint, { ...options, retryOnAuth: false })
    }

    // Handle auth errors with retry
    if (response.status === 401 && retryOnAuth) {
      const cacheKey = `${this.clientId}:${this.locationId}`
      tokenCache.delete(cacheKey)
      return this.request(endpoint, { ...options, retryOnAuth: false })
    }

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({}))) as GhlApiError
      const errorMessage = errorData.message || errorData.error || response.statusText
      console.error(`[GHL Provider] API error: ${response.status}`, {
        endpoint,
        error: errorMessage,
      })
      throw new Error(`GHL API error: ${response.status} - ${errorMessage}`)
    }

    return response.json()
  }

  /**
   * Push inbound message from Skool to GHL inbox
   *
   * This creates a message in the GHL unified inbox that appears to come
   * from the "Skool" channel (conversation provider).
   *
   * @param locationId - GHL location ID
   * @param contactId - GHL contact ID
   * @param skoolUserId - Skool user ID (used as channelContactId for threading)
   * @param messageText - The message content
   * @param skoolMessageId - Skool message ID (used as altId for deduplication)
   * @returns GHL message ID
   */
  async pushInboundMessage(
    locationId: string,
    contactId: string,
    skoolUserId: string,
    messageText: string,
    skoolMessageId: string
  ): Promise<string> {
    const body = {
      type: 'Custom',
      contactId,
      locationId,
      message: messageText,
      conversationProviderId: this.conversationProviderId,
      altId: skoolMessageId, // For deduplication
      direction: 'inbound',
      // Channel contact info for threading
      channelContactId: skoolUserId,
    }

    console.log('[GHL Provider] Pushing inbound message:', {
      contactId,
      skoolUserId,
      messageLength: messageText.length,
      altId: skoolMessageId,
    })

    const response = await this.request<{
      conversationId?: string
      messageId?: string
      message?: { id: string }
      id?: string
    }>('/conversations/messages', {
      method: 'POST',
      body: JSON.stringify(body),
    })

    const messageId = response.messageId || response.message?.id || response.id
    if (!messageId) {
      console.error('[GHL Provider] Unexpected response:', response)
      throw new Error('GHL push message response missing messageId')
    }

    console.log('[GHL Provider] Message pushed successfully:', messageId)
    return messageId
  }

  /**
   * Get or create a conversation for a contact on the Skool channel
   *
   * @param locationId - GHL location ID
   * @param contactId - GHL contact ID
   * @param channelType - Provider alias (default: 'Skool')
   * @returns Conversation ID
   */
  async getOrCreateConversation(
    locationId: string,
    contactId: string,
    channelType: string = 'Skool'
  ): Promise<string> {
    // First, try to find existing conversation
    const existing = await this.findConversationByContact(locationId, contactId, channelType)
    if (existing) {
      return existing
    }

    // Create new conversation
    const body = {
      locationId,
      contactId,
      type: channelType,
      conversationProviderId: this.conversationProviderId,
    }

    const response = await this.request<{
      conversation?: { id: string }
      id?: string
    }>('/conversations', {
      method: 'POST',
      body: JSON.stringify(body),
    })

    const conversationId = response.conversation?.id || response.id
    if (!conversationId) {
      throw new Error('GHL create conversation response missing id')
    }

    return conversationId
  }

  /**
   * Find existing conversation for a contact on the Skool channel
   */
  private async findConversationByContact(
    locationId: string,
    contactId: string,
    _channelType: string
  ): Promise<string | null> {
    try {
      const searchParams = new URLSearchParams({
        locationId,
        contactId,
      })

      const response = await this.request<{
        conversations?: Array<{ id: string; type?: string }>
      }>(`/conversations/search?${searchParams.toString()}`)

      // Find conversation matching our provider type
      const conversation = response.conversations?.find(
        (c) => c.type === 'Custom' || c.type === 'Skool'
      )

      return conversation?.id || null
    } catch (error) {
      // Search endpoint may not exist or return 404 - that's OK
      console.log('[GHL Provider] Conversation search failed, will create new:', error)
      return null
    }
  }

  /**
   * Set the conversation provider ID (required for push messages)
   */
  setConversationProviderId(providerId: string): void {
    this.conversationProviderId = providerId
  }
}

// =============================================================================
// WEBHOOK SIGNATURE VERIFICATION
// =============================================================================

/**
 * Verify GHL webhook signature using HMAC-SHA256
 *
 * GHL signs webhooks using the marketplace webhook secret.
 * The signature is sent in the X-GHL-Signature header.
 *
 * @param payload - Raw request body as string
 * @param signature - Signature from X-GHL-Signature header
 * @param secret - Webhook secret (GHL_MARKETPLACE_WEBHOOK_SECRET)
 * @returns True if signature is valid
 */
export function verifyGhlWebhookSignature(
  payload: string,
  signature: string,
  secret?: string
): boolean {
  const webhookSecret = secret || process.env.GHL_MARKETPLACE_WEBHOOK_SECRET

  if (!webhookSecret) {
    console.error('[GHL Webhook] Missing webhook secret')
    return false
  }

  if (!signature) {
    console.error('[GHL Webhook] Missing signature header')
    return false
  }

  try {
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(payload)
      .digest('hex')

    // Constant-time comparison to prevent timing attacks
    const signatureBuffer = Buffer.from(signature)
    const expectedBuffer = Buffer.from(expectedSignature)

    if (signatureBuffer.length !== expectedBuffer.length) {
      return false
    }

    return crypto.timingSafeEqual(signatureBuffer, expectedBuffer)
  } catch (error) {
    console.error('[GHL Webhook] Signature verification error:', error)
    return false
  }
}

// =============================================================================
// OUTBOUND WEBHOOK TYPES
// =============================================================================

/**
 * Payload for outbound message webhook from GHL
 */
export interface GhlOutboundMessagePayload {
  contactId: string
  body: string
  conversationId: string
  locationId: string
  messageId?: string
  replyToAltId?: string // If replying to a specific message
  type?: string
  direction?: string
  dateAdded?: string
}

// =============================================================================
// LEGACY CLIENT CLASS (for backward compatibility)
// =============================================================================

/**
 * Client for GHL Conversations API (legacy, non-marketplace)
 *
 * @deprecated Use GhlConversationProviderClient for marketplace apps
 */
export class GhlConversationClient {
  private apiKey: string
  private locationId: string

  constructor(config: GhlConversationClientConfig) {
    this.apiKey = config.apiKey
    this.locationId = config.locationId
  }

  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `${GHL_API_BASE}${endpoint}`

    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        Version: '2021-07-28',
        ...options?.headers,
      },
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`GHL API error: ${response.status} - ${error}`)
    }

    return response.json()
  }

  /**
   * Get or create a conversation for a contact
   */
  async getOrCreateConversation(contactId: string): Promise<GhlConversation> {
    // Try to find existing conversation first
    const existing = await this.findConversationByContact(contactId)
    if (existing) {
      return existing
    }

    // Create new conversation
    return this.createConversation(contactId)
  }

  /**
   * Send a message in a conversation
   */
  async sendMessage(
    conversationId: string,
    message: string,
    options?: { type?: string }
  ): Promise<SendResult> {
    try {
      const response = await this.request<{
        messageId?: string
        message?: { id: string }
      }>('/conversations/messages', {
        method: 'POST',
        body: JSON.stringify({
          type: options?.type || 'Custom',
          conversationId,
          message,
        }),
      })

      return {
        success: true,
        ghlMessageId: response.messageId || response.message?.id,
      }
    } catch (error) {
      console.error('[GHL Conversation] Send message failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Get messages for a conversation
   */
  async getMessages(
    conversationId: string,
    options?: { limit?: number; lastMessageId?: string }
  ): Promise<GhlMessage[]> {
    const searchParams = new URLSearchParams({
      limit: String(options?.limit || 50),
    })

    if (options?.lastMessageId) {
      searchParams.set('lastMessageId', options.lastMessageId)
    }

    const response = await this.request<{ messages?: GhlMessage[] }>(
      `/conversations/${conversationId}/messages?${searchParams.toString()}`
    )

    return response.messages || []
  }

  /**
   * Get conversation by ID
   */
  async getConversation(conversationId: string): Promise<GhlConversation | null> {
    try {
      const response = await this.request<{ conversation?: GhlConversation }>(
        `/conversations/${conversationId}`
      )
      return response.conversation || null
    } catch {
      return null
    }
  }

  /**
   * Search conversations by contact
   */
  async findConversationByContact(contactId: string): Promise<GhlConversation | null> {
    try {
      const searchParams = new URLSearchParams({
        locationId: this.locationId,
        contactId,
      })

      const response = await this.request<{ conversations?: GhlConversation[] }>(
        `/conversations/search?${searchParams.toString()}`
      )

      return response.conversations?.[0] || null
    } catch {
      return null
    }
  }

  /**
   * Create a new conversation
   */
  async createConversation(
    contactId: string,
    options?: { type?: string }
  ): Promise<GhlConversation> {
    const response = await this.request<{ conversation: GhlConversation }>(
      '/conversations',
      {
        method: 'POST',
        body: JSON.stringify({
          locationId: this.locationId,
          contactId,
          type: options?.type || 'Custom',
        }),
      }
    )

    return response.conversation
  }

  /**
   * Get contact by ID
   */
  async getContact(contactId: string): Promise<GhlContact | null> {
    try {
      const response = await this.request<{ contact?: GhlContact }>(
        `/contacts/${contactId}`
      )
      return response.contact || null
    } catch {
      return null
    }
  }

  /**
   * Search contacts by email
   */
  async searchContactsByEmail(email: string): Promise<GhlContact[]> {
    const searchParams = new URLSearchParams({
      locationId: this.locationId,
      query: email,
    })

    const response = await this.request<{ contacts?: GhlContact[] }>(
      `/contacts/?${searchParams.toString()}`
    )

    // Filter for exact email match
    return (response.contacts || []).filter(
      (c) => c.email?.toLowerCase() === email.toLowerCase()
    )
  }

  /**
   * Search contacts by name
   */
  async searchContactsByName(name: string): Promise<GhlContact[]> {
    const searchParams = new URLSearchParams({
      locationId: this.locationId,
      query: name,
    })

    const response = await this.request<{ contacts?: GhlContact[] }>(
      `/contacts/?${searchParams.toString()}`
    )

    return response.contacts || []
  }

  /**
   * Create a new contact
   */
  async createContact(data: {
    email?: string
    firstName?: string
    lastName?: string
    phone?: string
    tags?: string[]
  }): Promise<GhlContact> {
    const response = await this.request<{ contact: GhlContact }>('/contacts/', {
      method: 'POST',
      body: JSON.stringify({
        locationId: this.locationId,
        ...data,
      }),
    })

    return response.contact
  }

  /**
   * Add tags to a contact
   */
  async addTags(contactId: string, tags: string[]): Promise<void> {
    await this.request(`/contacts/${contactId}`, {
      method: 'PUT',
      body: JSON.stringify({ tags }),
    })
  }
}

// =============================================================================
// FACTORY FUNCTIONS
// =============================================================================

/**
 * Create a GHL conversation client with configuration
 * @deprecated Use createGhlConversationProviderClient for marketplace apps
 */
export function createGhlConversationClient(
  config: GhlConversationClientConfig
): GhlConversationClient {
  return new GhlConversationClient(config)
}

/**
 * Create a GHL conversation client from environment
 * @deprecated Use createGhlConversationProviderClientFromEnv for marketplace apps
 */
export function createGhlConversationClientFromEnv(
  locationId: string
): GhlConversationClient {
  const apiKey = process.env.GHL_API_KEY

  if (!apiKey) {
    throw new Error('GHL_API_KEY environment variable is required')
  }

  return new GhlConversationClient({
    apiKey,
    locationId,
  })
}

/**
 * Create a GHL Conversation Provider client from marketplace credentials
 */
export function createGhlConversationProviderClient(
  config: GhlMarketplaceConfig
): GhlConversationProviderClient {
  return new GhlConversationProviderClient(config)
}

/**
 * Create a GHL Conversation Provider client from environment variables
 */
export function createGhlConversationProviderClientFromEnv(
  locationId: string,
  conversationProviderId?: string
): GhlConversationProviderClient {
  const clientId = process.env.GHL_MARKETPLACE_CLIENT_ID
  const clientSecret = process.env.GHL_MARKETPLACE_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    throw new Error(
      'GHL_MARKETPLACE_CLIENT_ID and GHL_MARKETPLACE_CLIENT_SECRET environment variables are required'
    )
  }

  return new GhlConversationProviderClient({
    clientId,
    clientSecret,
    locationId,
    conversationProviderId,
  })
}

// =============================================================================
// CONVERSATION PROVIDER REGISTRATION
// =============================================================================

/**
 * Response from GHL conversation provider registration
 */
export interface ConversationProviderRegistrationResponse {
  providerId: string
  name: string
  description?: string
  type?: string
}

/**
 * Register a new Conversation Provider with GHL
 *
 * This is a one-time setup operation that registers your app as a custom
 * channel in the GHL unified inbox. Once registered, you receive a providerId
 * that must be stored and used for all subsequent message operations.
 *
 * @param config - Marketplace credentials (clientId, clientSecret)
 * @param locationId - GHL location ID to register the provider for
 * @param appUrl - Your deployed app URL (e.g., https://0ne-app.vercel.app)
 * @returns Provider registration details including the providerId
 *
 * @example
 * ```ts
 * const result = await registerConversationProvider(
 *   {
 *     clientId: process.env.GHL_MARKETPLACE_CLIENT_ID!,
 *     clientSecret: process.env.GHL_MARKETPLACE_CLIENT_SECRET!,
 *   },
 *   'loc_123',
 *   'https://0ne-app.vercel.app'
 * )
 * console.log('Provider ID:', result.providerId)
 * // Add to .env: GHL_CONVERSATION_PROVIDER_ID=result.providerId
 * ```
 */
export async function registerConversationProvider(
  config: { clientId: string; clientSecret: string },
  locationId: string,
  appUrl: string
): Promise<ConversationProviderRegistrationResponse> {
  // First, get an OAuth token using client credentials
  const tokenResponse = await fetch(GHL_OAUTH_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: config.clientId,
      client_secret: config.clientSecret,
    }),
  })

  if (!tokenResponse.ok) {
    const errorText = await tokenResponse.text()
    throw new Error(`OAuth token request failed: ${tokenResponse.status} - ${errorText}`)
  }

  const tokenData = (await tokenResponse.json()) as OAuthTokenResponse
  const accessToken = tokenData.access_token

  // Register the conversation provider
  const registrationBody = {
    locationId,
    name: 'Skool',
    description: 'Skool community DMs synced to GHL inbox',
    type: 'Custom',
    outboundWebhookUrl: `${appUrl}/api/webhooks/ghl/outbound-message`,
  }

  console.log('[GHL Provider] Registering conversation provider:', {
    locationId,
    name: registrationBody.name,
    outboundWebhookUrl: registrationBody.outboundWebhookUrl,
  })

  const response = await fetch(`${GHL_API_BASE}/conversations/providers`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      Version: '2021-07-28',
    },
    body: JSON.stringify(registrationBody),
  })

  if (!response.ok) {
    const errorData = (await response.json().catch(() => ({}))) as GhlApiError
    const errorMessage = errorData.message || errorData.error || response.statusText
    throw new Error(`GHL provider registration failed: ${response.status} - ${errorMessage}`)
  }

  const result = (await response.json()) as ConversationProviderRegistrationResponse

  console.log('[GHL Provider] Registration successful:', {
    providerId: result.providerId,
    name: result.name,
  })

  return result
}
