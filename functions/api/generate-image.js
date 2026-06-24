export async function onRequestPost(context) {
  const { request, env } = context

  if (!env.OPENAI_API_KEY) {
    return json({ error: 'OPENAI_API_KEY is not configured.' }, 500)
  }

  let body

  try {
    body = await request.json()
  } catch {
    return json({ error: 'Invalid JSON body.' }, 400)
  }

  const prompt = String(body.prompt || '').trim()
  const size = String(body.size || '1024x1024')
  const model = String(env.OPENAI_IMAGE_MODEL || body.model || 'gpt-image-1').trim()

  if (!prompt) {
    return json({ error: 'Missing prompt.' }, 400)
  }

  const response = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model,
      prompt,
      size,
      n: 1
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
    return json({ error: data.error?.message || 'Image generation failed.' }, response.status)
  }

  const image = data.data?.[0]
  const url = image?.url || data.url || data.output?.[0]?.url
  const b64 = image?.b64_json || data.b64_json || data.output?.[0]?.b64_json

  if (url) {
    return json({ url })
  }

  if (b64) {
    return json({ b64_json: b64 })
  }

  return json({ error: 'Empty image response.' }, 502)
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8'
    }
  })
}
