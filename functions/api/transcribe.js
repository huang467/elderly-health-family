export async function onRequestPost(context) {
  const { request, env } = context

  if (!env.OPENAI_API_KEY) {
    return json({ error: 'OPENAI_API_KEY is not configured.' }, 500)
  }

  const formData = await request.formData()
  const audio = formData.get('audio')

  if (!(audio instanceof File)) {
    return json({ error: 'Missing audio file.' }, 400)
  }

  const upstreamForm = new FormData()
  upstreamForm.append('file', audio, audio.name || 'speech.webm')
  upstreamForm.append('model', env.OPENAI_TRANSCRIBE_MODEL || 'gpt-4o-mini-transcribe')
  upstreamForm.append('language', formData.get('language') || 'zh')

  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.OPENAI_API_KEY}`
    },
    body: upstreamForm
  })

  const text = await response.text()
  let data

  try {
    data = JSON.parse(text)
  } catch {
    data = { raw: text }
  }

  if (!response.ok) {
    return json({ error: data.error?.message || 'Transcription failed.' }, response.status)
  }

  return json({ text: data.text || data.output_text || '' })
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8'
    }
  })
}
