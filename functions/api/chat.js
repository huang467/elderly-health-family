export async function onRequestPost(context) {
  const request = context.request
  const env = context.env

  if (!env.DEEPSEEK_API_KEY) {
    return json({ error: 'DEEPSEEK_API_KEY is not configured.' }, 500)
  }

  let body

  try {
    body = await request.json()
  } catch {
    return json({ error: 'Invalid JSON body.' }, 400)
  }

  const messages = Array.isArray(body.messages) ? body.messages : []

  if (!messages.length) {
    return json({ error: 'Missing messages.' }, 400)
  }

  const endpoint = env.DEEPSEEK_CHAT_ENDPOINT || 'https://api.deepseek.com/chat/completions'
  const model = env.DEEPSEEK_CHAT_MODEL || 'deepseek-v4-flash'

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.DEEPSEEK_API_KEY}`
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: typeof body.temperature === 'number' ? body.temperature : 0.7
    })
  })

  const text = await response.text()
  let data

  try {
    data = JSON.parse(text)
  } catch {
    data = { raw: text }
  }

  if (!response.ok) {
    return json({ error: data.error?.message || 'Chat model failed.' }, response.status)
  }

  const content = data.choices?.[0]?.message?.content || data.output_text || data.message || ''
  return json({ content })
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8'
    }
  })
}
