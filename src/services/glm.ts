/**
 * GLM-4 Flash API 封装
 * 使用智谱 AI 的 OpenAI 兼容接口
 */

const ENDPOINT = import.meta.env.VITE_GLM_ENDPOINT || 'https://open.bigmodel.cn/api/paas/v4/chat/completions'
const MODEL = import.meta.env.VITE_GLM_MODEL || 'glm-4-flash'

function getApiKey(): string {
  return import.meta.env.VITE_GLM_API_KEY || ''
}

export function isApiKeyConfigured(): boolean {
  const key = getApiKey()
  return !!key && key !== 'your_api_key_here'
}

interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface ChatResponse {
  choices: { message: { content: string } }[]
}

/**
 * 同步调用 GLM-4 Flash
 */
export async function chat(
  systemPrompt: string,
  userPrompt: string,
  options: { temperature?: number; maxTokens?: number } = {}
): Promise<string> {
  const apiKey = getApiKey()
  if (!apiKey || apiKey === 'your_api_key_here') {
    throw new Error('GLM API key not configured. Set VITE_GLM_API_KEY in .env.local')
  }

  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ]

  const response = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      stream: false,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 4096,
    }),
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`GLM API error ${response.status}: ${text}`)
  }

  const data: ChatResponse = await response.json()
  return data.choices[0]?.message?.content ?? ''
}

/**
 * 流式调用 GLM-4 Flash (打字机效果)
 */
export async function chatStream(
  systemPrompt: string,
  userPrompt: string,
  onChunk: (text: string) => void,
  options: { temperature?: number; maxTokens?: number } = {}
): Promise<string> {
  const apiKey = getApiKey()
  if (!apiKey || apiKey === 'your_api_key_here') {
    throw new Error('GLM API key not configured')
  }

  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ]

  const response = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      stream: true,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 4096,
    }),
  })

  if (!response.ok) {
    throw new Error(`GLM API error ${response.status}`)
  }

  const reader = response.body?.getReader()
  if (!reader) throw new Error('No response body')

  const decoder = new TextDecoder()
  let fullText = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    const chunk = decoder.decode(value, { stream: true })
    const lines = chunk.split('\n')

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const jsonStr = line.slice(6).trim()
      if (jsonStr === '[DONE]') break

      try {
        const json = JSON.parse(jsonStr)
        const content = json.choices?.[0]?.delta?.content
        if (content) {
          fullText += content
          onChunk(content)
        }
      } catch {
        // skip malformed chunks
      }
    }
  }

  return fullText
}
