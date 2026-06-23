<template>
  <div class="digital-human">
    <section class="avatar-panel">
      <div class="status-row">
        <span class="state-pill" :class="{ active: initialized }">
          {{ initialized ? '已唤醒' : '待唤醒' }}
        </span>
        <span class="state-pill" :class="{ active: apiReady }">
          {{ apiReady ? '模型就绪' : '等待密钥' }}
        </span>
      </div>

      <div class="avatar-wrap">
        <div class="aura" :class="emotion"></div>
        <div class="avatar" :class="[emotion, { speaking: speech.isSpeaking.value }]">
          <div class="forehead"></div>
          <div class="eyes">
            <span class="eye left"><i></i></span>
            <span class="eye right"><i></i></span>
          </div>
          <div class="mouth"></div>
        </div>
      </div>

      <div class="subtitle-card">
        <p>{{ speech.subtitle.value || emotionHint }}</p>
      </div>

      <div class="camera-card">
        <video ref="videoRef" muted playsinline></video>
        <div class="camera-overlay">
          表情: <strong>{{ cameraStatusText }}</strong>
          <span>{{ Math.round(emotionConfidence * 100) }}%</span>
        </div>
        <div v-if="cameraError" class="camera-error">{{ cameraError }}</div>
      </div>

      <button class="primary-btn wide" @click="startSystem" :disabled="booting">
        <IconSvg name="eye" :size="18" />
        {{ initialized ? '重新唤醒' : booting ? '唤醒中' : '唤醒数字人' }}
      </button>
    </section>

    <section class="control-panel">
      <div class="config-grid">
        <label>
          <span>API Key</span>
          <input v-model="apiConfig.apiKey" type="password" autocomplete="off" placeholder="在这里输入密钥，本页不会保存" />
        </label>
        <label>
          <span>模型接口</span>
          <input v-model="apiConfig.endpoint" autocomplete="off" placeholder="OpenAI 兼容 chat completions 地址" />
        </label>
        <label>
          <span>模型 ID</span>
          <input v-model="apiConfig.model" autocomplete="off" placeholder="例如 gpt-4o-mini 或你的模型名" />
        </label>
      </div>

      <div class="chat-box">
        <div class="chat-header">
          <h3>陪伴对话</h3>
          <span>{{ runtimeStatus }}</span>
        </div>

        <div ref="messageListRef" class="message-list">
          <div
            v-for="message in messages"
            :key="message.id"
            class="message"
            :class="message.role"
          >
            {{ message.content }}
          </div>
          <div v-if="thinking" class="message assistant thinking">正在思考...</div>
        </div>

        <div class="input-row">
          <button
            class="voice-btn"
            @click="toggleVoice"
            :class="{ active: speech.isListening.value }"
            :title="voiceStatusText"
          >
            <IconSvg name="wind" :size="18" />
            <span>{{ speech.isListening.value ? '正在听' : '语音输入' }}</span>
          </button>
          <input v-model="inputText" @keyup.enter="sendMessage" placeholder="输入想说的话，也可以说“过五分钟叫我吃饭”" />
          <button class="send-btn" @click="sendMessage" :disabled="thinking">
            <IconSvg name="arrow-right" :size="18" />
            发送
          </button>
        </div>
        <div class="voice-status" :class="{ active: speech.isListening.value, error: speech.voiceError.value }">
          {{ voiceStatusText }}
        </div>
      </div>

      <div class="task-panel">
        <div class="task-header">
          <h3>定时任务</h3>
          <span>{{ activeTasks.length }} 项</span>
        </div>

        <div class="task-form">
          <input v-model="taskDraft.title" placeholder="任务内容" />
          <input v-model="taskDraft.time" type="datetime-local" />
          <select v-model="taskDraft.repeat">
            <option value="once">一次</option>
            <option value="hourly">每小时</option>
            <option value="daily">每天</option>
          </select>
          <button class="primary-btn" @click="addManualTask">
            <IconSvg name="plus" :size="16" />
            添加
          </button>
        </div>

        <div class="task-list" v-if="activeTasks.length">
          <article v-for="task in activeTasks" :key="task.id" class="task-item">
            <div>
              <strong>{{ task.title }}</strong>
              <span>{{ formatTaskTime(task) }}</span>
            </div>
            <button class="delete-btn" @click="removeTask(task.id)">
              <IconSvg name="trash" :size="16" />
            </button>
          </article>
        </div>
        <div v-else class="empty-task">暂无任务</div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, reactive, ref } from 'vue'
import * as faceapi from 'face-api.js'
import IconSvg from '@/components/IconSvg.vue'
import { useAgentSpeech } from '@/hooks/useAgentSpeech'

const speech = useAgentSpeech()

const initialized = ref(false)
const booting = ref(false)
const thinking = ref(false)
const cameraError = ref('')
const cameraStatus = ref('waiting')
const emotion = ref('neutral')
const emotionConfidence = ref(0)
const inputText = ref('')
const videoRef = ref(null)
const messageListRef = ref(null)
let mediaStream = null
let detectInterval = null
let schedulerTimer = null
let lastProactiveAt = 0
let proactiveInFlight = false
let sustainedEmotion = 'neutral'
let sustainedEmotionStartedAt = 0
let sustainedEmotionTriggered = false
let textEmotionHoldUntil = 0
const expressionScores = reactive({
  neutral: 0,
  happy: 0,
  sad: 0,
  angry: 0,
  surprised: 0,
  fearful: 0,
  disgusted: 0
})
const emotionSamples = []

const apiConfig = reactive({
  apiKey: '',
  endpoint: 'https://api.openai.com/v1/chat/completions',
  model: ''
})

const messages = ref([
  {
    id: `msg_${Date.now()}`,
    role: 'assistant',
    content: '您好，我在这里陪您聊天，也可以帮您记提醒。'
  }
])

const tasks = ref([])
const taskDraft = reactive({
  title: '',
  time: '',
  repeat: 'once'
})

const emotionMap = {
  neutral: '平静',
  happy: '开心',
  sad: '难过',
  angry: '生气',
  surprised: '惊讶',
  fearful: '担心',
  disgusted: '不适'
}

const textEmotionHoldMs = 2000

const emotionTextOptions = [
  { value: 'neutral', label: 'Neutral', aliases: ['neutral', 'calm', 'normal', 'pingjing', 'putong', '\u5e73\u9759', '\u666e\u901a', '\u6b63\u5e38'] },
  { value: 'happy', label: 'Happy', aliases: ['happy', 'smile', 'laugh', 'kaixin', 'gaoxing', 'kuaile', '\u5f00\u5fc3', '\u9ad8\u5174', '\u5feb\u4e50', '\u5fae\u7b11', '\u7b11'] },
  { value: 'sad', label: 'Sad', aliases: ['sad', 'unhappy', 'nanguo', 'beishang', '\u96be\u8fc7', '\u4f24\u5fc3', '\u60b2\u4f24', '\u4e0d\u5f00\u5fc3'] },
  { value: 'angry', label: 'Angry', aliases: ['angry', 'mad', 'shengqi', 'fennu', '\u751f\u6c14', '\u6124\u6012', '\u607c\u706b'] },
  { value: 'surprised', label: 'Surprised', aliases: ['surprised', 'shock', 'jingya', 'chijing', '\u60ca\u8bb6', '\u9707\u60ca', '\u5403\u60ca'] },
  { value: 'fearful', label: 'Fearful', aliases: ['fearful', 'afraid', 'scared', 'danxin', 'haipa', 'jinzhang', '\u62c5\u5fc3', '\u5bb3\u6015', '\u6050\u60e7', '\u7d27\u5f20'] },
  { value: 'disgusted', label: 'Disgusted', aliases: ['disgusted', 'uncomfortable', 'bushi', 'nanshou', 'exin', '\u4e0d\u9002', '\u96be\u53d7', '\u6076\u5fc3', '\u4e0d\u8212\u670d'] }
]

const emotionTextLabels = emotionTextOptions.reduce((labels, item) => {
  labels[item.value] = item.label
  return labels
}, {})

const emotionCommandPrefixes = [
  '/emotion',
  '/face',
  '/mood',
  'emotion',
  'face',
  'mood',
  'expression',
  'biaoqing',
  'qingxu',
  'xinqing',
  '\u8868\u60c5',
  '\u60c5\u7eea',
  '\u5fc3\u60c5',
  '\u5207\u6362\u8868\u60c5',
  '\u8bbe\u7f6e\u8868\u60c5',
  '\u6570\u5b57\u4eba\u8868\u60c5'
]

const sensitiveEmotionWeight = {
  happy: 1.6,
  sad: 2.25,
  angry: 2,
  surprised: 1.7,
  fearful: 2.25,
  disgusted: 1.9,
  neutral: 0.45
}

const apiReady = computed(() => apiConfig.apiKey.trim() && apiConfig.endpoint.trim() && apiConfig.model.trim())
const activeTasks = computed(() => tasks.value.filter(task => !task.done))
const runtimeStatus = computed(() => thinking.value ? '模型响应中' : speech.isListening.value ? '语音输入中' : '待命')
const cameraStatusText = computed(() => {
  if (cameraStatus.value === 'detecting') return emotionMap[emotion.value] || emotion.value
  if (cameraStatus.value === 'no-face') return '未检测到人脸'
  if (cameraStatus.value === 'error') return '检测失败'
  return '等待识别'
})
const voiceStatusText = computed(() => {
  if (speech.voiceError.value) return speech.voiceError.value
  if (speech.isListening.value) return '正在听您说话，说完后会自动发送。'
  if (!speech.isRecognitionSupported.value) return '可点击语音输入；若浏览器不支持，请使用 Chrome 或 Edge。'
  return '点击语音输入，说完后会自动发送。'
})
const emotionHint = computed(() => {
  const map = {
    happy: '看起来心情不错，我也很开心。',
    sad: '我注意到您有些低落，我会慢慢陪着您。',
    angry: '我会放慢一点，先陪您缓一缓。',
    surprised: '我看到您有些惊讶，需要我帮您确认什么吗？',
    fearful: '我在这里，请慢慢说。'
  }
  return map[emotion.value] || '正在默默陪伴您...'
})

const startSystem = async () => {
  booting.value = true
  cameraError.value = ''

  try {
    await loadFaceModels()
    await startCamera()
    initialized.value = true
    startScheduler()
  } finally {
    booting.value = false
  }
}

const loadFaceModels = async () => {
  try {
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
      faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
      faceapi.nets.faceExpressionNet.loadFromUri('/models')
    ])
  } catch (error) {
    cameraError.value = '表情模型加载失败，数字人仍可对话。'
  }
}

const startCamera = async () => {
  stopCamera()

  try {
    mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
    await nextTick()
    if (videoRef.value) {
      videoRef.value.srcObject = mediaStream
      await videoRef.value.play()
    }
    detectInterval = setInterval(detectExpression, 250)
  } catch (error) {
    cameraError.value = cameraErrorText(error)
    initialized.value = true
  }
}

const stopCamera = () => {
  if (detectInterval) {
    clearInterval(detectInterval)
    detectInterval = null
  }

  if (mediaStream) {
    mediaStream.getTracks().forEach(track => track.stop())
    mediaStream = null
  }
}

const detectExpression = async () => {
  if (Date.now() < textEmotionHoldUntil) return
  if (!videoRef.value || speech.isSpeaking.value) return

  try {
    const result = await faceapi
      .detectSingleFace(videoRef.value, new faceapi.TinyFaceDetectorOptions({
        inputSize: 320,
        scoreThreshold: 0.18
      }))
      .withFaceLandmarks()
      .withFaceExpressions()

    if (!result) {
      cameraStatus.value = 'no-face'
      return
    }
    cameraStatus.value = 'detecting'
    updateEmotion(result.expressions)
  } catch (error) {
    cameraStatus.value = 'error'
  }
}

const resetProactiveEmotionState = () => {
  sustainedEmotion = 'neutral'
  sustainedEmotionStartedAt = 0
  sustainedEmotionTriggered = false
}

const setEmotionFromText = (nextEmotion) => {
  const isValidEmotion = emotionTextOptions.some(item => item.value === nextEmotion)
  if (!isValidEmotion) return false

  emotion.value = nextEmotion
  emotionConfidence.value = 1
  cameraStatus.value = 'detecting'
  textEmotionHoldUntil = Date.now() + textEmotionHoldMs
  Object.keys(expressionScores).forEach(key => {
    expressionScores[key] = key === nextEmotion ? 1 : 0
  })
  resetProactiveEmotionState()
  return true
}

const normalizeEmotionText = (text) => {
  return text
    .trim()
    .toLowerCase()
    .replace(/[=:\uff1a,\uff0c,，.!?\uff01\uff1f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const parseExplicitEmotionCommand = (text) => {
  const normalized = normalizeEmotionText(text)
  const matchedPrefix = emotionCommandPrefixes.find(prefix =>
    normalized === prefix || normalized.startsWith(`${prefix} `)
  )

  if (!matchedPrefix) return null
  const commandBody = normalized.slice(matchedPrefix.length).trim()
  if (!commandBody) return null

  return findEmotionInText(commandBody)
}

const findEmotionInText = (text) => {
  const normalized = normalizeEmotionText(text)
  return emotionTextOptions.find(item =>
    item.value === normalized || item.aliases.some(alias => normalized.includes(alias))
  )?.value || null
}

const applyTextEmotionSignal = (text) => {
  const explicitEmotion = parseExplicitEmotionCommand(text)
  const inferredEmotion = explicitEmotion || findEmotionInText(text)
  if (!inferredEmotion) return { matched: false, explicit: false }

  setEmotionFromText(inferredEmotion)
  return { matched: true, explicit: !!explicitEmotion, emotion: inferredEmotion }
}

const updateEmotion = (expressions) => {
  Object.keys(expressionScores).forEach(key => {
    const rawScore = expressions[key] || 0
    const weightedScore = rawScore * (sensitiveEmotionWeight[key] || 1)
    expressionScores[key] = expressionScores[key] * 0.35 + weightedScore * 0.65
  })

  const expressiveKeys = Object.keys(expressionScores).filter(key => key !== 'neutral')
  const expressiveDominant = expressiveKeys.reduce((a, b) =>
    expressionScores[a] > expressionScores[b] ? a : b
  )
  const expressiveConfidence = Math.min(0.99, expressionScores[expressiveDominant])
  const neutralScore = expressionScores.neutral || 0

  if (expressiveConfidence > 0.045 || expressiveConfidence > neutralScore * 0.24) {
    emotion.value = expressiveDominant
    emotionConfidence.value = expressiveConfidence
  } else if (neutralScore > 0.26) {
    emotion.value = 'neutral'
    emotionConfidence.value = neutralScore
  }

  trackEmotionSample(emotion.value, emotionConfidence.value)
}

const trackEmotionSample = (currentEmotion, confidence) => {
  const now = Date.now()
  emotionSamples.push({ emotion: currentEmotion, confidence, time: now })

  while (emotionSamples.length > 8) {
    emotionSamples.shift()
  }

  maybeTriggerProactiveCare(currentEmotion, confidence, now)
}

const maybeTriggerProactiveCare = async (currentEmotion, confidence, now) => {
  if (proactiveInFlight || thinking.value || speech.isListening.value || !initialized.value) return
  if (currentEmotion === 'neutral' || confidence < 0.07) {
    sustainedEmotion = 'neutral'
    sustainedEmotionStartedAt = 0
    sustainedEmotionTriggered = false
    return
  }

  if (currentEmotion !== sustainedEmotion) {
    sustainedEmotion = currentEmotion
    sustainedEmotionStartedAt = now
    sustainedEmotionTriggered = false
    return
  }

  if (sustainedEmotionTriggered) return
  if (now - sustainedEmotionStartedAt < 1500) return
  if (now - lastProactiveAt < 10 * 1000) return

  sustainedEmotionTriggered = true
  lastProactiveAt = now
  proactiveInFlight = true

  const prompt = getEmotionPrompt(currentEmotion)

  try {
    thinking.value = true
    const reply = apiReady.value
      ? await callModel(prompt, { hidden: true })
      : getLocalCareReply(currentEmotion)
    addAssistantReply(reply)
  } catch (error) {
    addAssistantReply(getLocalCareReply(currentEmotion))
  } finally {
    thinking.value = false
    proactiveInFlight = false
  }
}

const sendMessage = async () => {
  const text = inputText.value.trim()
  if (!text || thinking.value) return

  inputText.value = ''
  addMessage('user', text)

  const textEmotionSignal = applyTextEmotionSignal(text)
  if (textEmotionSignal.explicit) {
    addAssistantReply(`Emotion set to ${emotionTextLabels[textEmotionSignal.emotion] || textEmotionSignal.emotion}.`)
    return
  }

  const scheduledTask = parseScheduleIntent(text)
  if (scheduledTask) {
    createTask(scheduledTask.title, scheduledTask.dueAt, scheduledTask.repeat)
    const reply = `好的，我会在 ${formatDateTime(scheduledTask.dueAt)} 提醒您：${scheduledTask.title}`
    addAssistantReply(reply)
    return
  }

  if (!apiReady.value) {
    addAssistantReply('请先输入 API Key、模型接口和模型 ID。')
    return
  }

  thinking.value = true
  try {
    const reply = await callModel(text)
    addAssistantReply(reply)
  } catch (error) {
    addAssistantReply('模型接口暂时没有响应，请检查密钥、模型 ID 或接口地址。')
  } finally {
    thinking.value = false
  }
}

const callModel = async (text, options = {}) => {
  const recentMessages = messages.value
    .slice(-12)
    .filter(message => message.role === 'user' || message.role === 'assistant')
    .map(message => ({
      role: message.role,
      content: message.content
    }))

  const response = await fetch(apiConfig.endpoint.trim(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiConfig.apiKey.trim()}`
    },
    body: JSON.stringify({
      model: apiConfig.model.trim(),
      messages: [
        {
          role: 'system',
          content: `你是老人端陪伴数字人。请用温和、简短、可靠的中文回答。用户当前表情是：${emotionMap[emotion.value] || emotion.value}。如果用户表达身体不适或紧急情况，建议联系家属或医生。`
        },
        ...recentMessages,
        {
          role: 'user',
          content: options.hidden ? text : text
        }
      ],
      temperature: 0.7
    })
  })

  if (!response.ok) {
    throw new Error(`model api failed: ${response.status}`)
  }

  const data = await response.json()
  const content = data.choices?.[0]?.message?.content || data.output_text || data.message
  if (!content) throw new Error('empty model response')
  return content.trim()
}

const toggleVoice = () => {
  speech.toggleMic((text) => {
    inputText.value = text
    sendMessage()
  })
}

const addMessage = (role, content) => {
  messages.value.push({
    id: `msg_${Date.now()}_${Math.random().toString(16).slice(2)}`,
    role,
    content
  })

  if (messages.value.length > 80) {
    messages.value.shift()
  }

  scrollMessages()
}

const addAssistantReply = (content) => {
  addMessage('assistant', content)
  speech.speak(content, emotion.value)
}

const getEmotionPrompt = (currentEmotion) => {
  const emotionText = emotionMap[currentEmotion] || currentEmotion
  const intents = {
    happy: '用户看起来心情不错。请自然地回应这份好心情，可以轻轻问问是不是遇到了开心的事。',
    surprised: '用户持续呈现惊讶表情。请温和地询问是否发生了什么，语气不要紧张。',
    sad: '用户持续呈现难过表情。请主动关心，像陪伴型数字人一样轻声询问是否愿意聊聊。',
    fearful: '用户持续呈现担心或害怕表情。请先安抚，再询问是否需要帮助或联系家属。',
    angry: '用户持续呈现生气表情。请放慢语气，先接住情绪，不要争辩。',
    disgusted: '用户持续呈现不适表情。请关心身体感受，并建议先休息一下。'
  }
  return `系统观察：用户同一种微表情「${emotionText}」已经持续超过 3 秒。不要说你在监控或分析表情，也不要提到“系统观察”。${intents[currentEmotion] || '请自然、温和地开启一句主动陪伴式对话。'}请只回复一句简短中文。`
}

const getLocalCareReply = (currentEmotion) => {
  const replies = {
    happy: '您看起来心情不错，是不是有什么开心的事？',
    surprised: '您刚刚好像有点惊讶，发生什么了吗？',
    sad: '您看起来有点不开心，我在这里陪着您。愿意和我说说发生了什么吗？',
    fearful: '别着急，我会陪着您。现在有没有哪里不舒服，或者需要我帮您联系家属？',
    angry: '我感觉您可能有点烦，我先慢慢陪您缓一缓。要不要和我说说？',
    disgusted: '您看起来有些不舒服，要不要先坐下休息一下？'
  }
  return replies[currentEmotion] || '我在这里陪着您，想聊的时候可以慢慢说。'
}

const scrollMessages = async () => {
  await nextTick()
  if (messageListRef.value) {
    messageListRef.value.scrollTop = messageListRef.value.scrollHeight
  }
}

const addManualTask = () => {
  if (!taskDraft.title.trim() || !taskDraft.time) return
  createTask(taskDraft.title.trim(), new Date(taskDraft.time).getTime(), taskDraft.repeat)
  taskDraft.title = ''
  taskDraft.time = ''
  taskDraft.repeat = 'once'
}

const createTask = (title, dueAt, repeat = 'once') => {
  tasks.value.push({
    id: `task_${Date.now()}_${Math.random().toString(16).slice(2)}`,
    title,
    dueAt,
    repeat,
    done: false
  })
  startScheduler()
}

const removeTask = (id) => {
  tasks.value = tasks.value.filter(task => task.id !== id)
}

const startScheduler = () => {
  if (schedulerTimer) return
  schedulerTimer = setInterval(checkTasks, 1000)
}

const checkTasks = () => {
  const now = Date.now()
  tasks.value.forEach(task => {
    if (task.done || task.dueAt > now) return

    const reminder = `提醒时间到了：${task.title}`
    addAssistantReply(reminder)

    if (task.repeat === 'hourly') {
      task.dueAt += 60 * 60 * 1000
    } else if (task.repeat === 'daily') {
      task.dueAt += 24 * 60 * 60 * 1000
    } else {
      task.done = true
    }
  })
}

const parseScheduleIntent = (text) => {
  const normalizedText = text.trim().replace(/\s+/g, '')

  const delayMatch = normalizedText.match(/^(?:请|帮我|麻烦你)?(?:过|再|等)?([零〇一二两三四五六七八九十百\d半]+)(秒钟?|分钟?|小时|个小时|钟头)(?:后|之后|以后)?(?:提醒我|提醒|叫我|喊我|通知我)?(.+)$/)
  if (delayMatch) {
    const amount = parseChineseAmount(delayMatch[1])
    const unit = delayMatch[2]
    const title = cleanReminderTitle(delayMatch[3])
    if (!amount || !title) return null
    const unitMs = getUnitMs(unit)
    return { title, dueAt: Date.now() + amount * unitMs, repeat: 'once' }
  }

  const commandFirstMatch = normalizedText.match(/^(?:提醒我|提醒|叫我|喊我|通知我)(.+?)(?:在|于)?(\d{1,2})[:：点](\d{2})?$/)
  if (commandFirstMatch) {
    const due = new Date()
    const minute = commandFirstMatch[3] ? Number(commandFirstMatch[3]) : 0
    due.setHours(Number(commandFirstMatch[2]), minute, 0, 0)
    if (due.getTime() <= Date.now()) {
      due.setDate(due.getDate() + 1)
    }
    return { title: cleanReminderTitle(commandFirstMatch[1]), dueAt: due.getTime(), repeat: 'once' }
  }

  const dailyMatch = normalizedText.match(/^(?:每天|每日)(\d{1,2})[:：点](\d{2})?(?:提醒我|提醒|叫我|喊我|通知我)?(.+)$/)
  if (dailyMatch) {
    const due = new Date()
    const minute = dailyMatch[2] ? Number(dailyMatch[2]) : 0
    due.setHours(Number(dailyMatch[1]), minute, 0, 0)
    if (due.getTime() <= Date.now()) {
      due.setDate(due.getDate() + 1)
    }
    return { title: cleanReminderTitle(dailyMatch[3]), dueAt: due.getTime(), repeat: 'daily' }
  }

  const clockMatch = normalizedText.match(/(?:提醒我|提醒|叫我|喊我|通知我)(.+?)(?:在|于)?(\d{1,2})[:：](\d{2})/)
  if (clockMatch) {
    const due = new Date()
    due.setHours(Number(clockMatch[2]), Number(clockMatch[3]), 0, 0)
    if (due.getTime() <= Date.now()) {
      due.setDate(due.getDate() + 1)
    }
    return { title: cleanReminderTitle(clockMatch[1]), dueAt: due.getTime(), repeat: 'once' }
  }

  return null
}

const parseChineseAmount = (raw) => {
  if (!raw) return 0
  if (raw === '半') return 0.5
  if (/^\d+$/.test(raw)) return Number(raw)

  const digitMap = {
    零: 0,
    〇: 0,
    一: 1,
    二: 2,
    两: 2,
    三: 3,
    四: 4,
    五: 5,
    六: 6,
    七: 7,
    八: 8,
    九: 9
  }

  if (raw.includes('百')) {
    const [hundreds, rest = ''] = raw.split('百')
    return (digitMap[hundreds] || 1) * 100 + parseChineseAmount(rest)
  }

  if (raw.includes('十')) {
    const [tens, ones = ''] = raw.split('十')
    const tensValue = tens ? digitMap[tens] || Number(tens) || 1 : 1
    const onesValue = ones ? digitMap[ones] || Number(ones) || 0 : 0
    return tensValue * 10 + onesValue
  }

  return digitMap[raw] || 0
}

const getUnitMs = (unit) => {
  if (unit.includes('小时') || unit.includes('钟头')) return 60 * 60 * 1000
  if (unit.includes('分钟')) return 60 * 1000
  return 1000
}

const cleanReminderTitle = (raw) => {
  return raw
    .replace(/^(要|去|该|让我|我|一下|的时候)/, '')
    .replace(/[。！!，,]$/g, '')
    .trim()
}

const formatTaskTime = (task) => {
  const repeatText = {
    once: '一次',
    hourly: '每小时',
    daily: '每天'
  }[task.repeat] || '一次'
  return `${formatDateTime(task.dueAt)} · ${repeatText}`
}

const formatDateTime = (value) => {
  return new Date(value).toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const cameraErrorText = (error) => {
  if (error?.name === 'NotAllowedError' || error?.name === 'PermissionDeniedError') {
    return '摄像头权限未开启，表情识别暂停。'
  }
  if (error?.name === 'NotFoundError') {
    return '未检测到摄像头，表情识别暂停。'
  }
  if (error?.name === 'NotReadableError') {
    return '摄像头被占用，表情识别暂停。'
  }
  return '摄像头暂不可用，表情识别暂停。'
}

onBeforeUnmount(() => {
  stopCamera()
  if (schedulerTimer) {
    clearInterval(schedulerTimer)
    schedulerTimer = null
  }
})
</script>

<style scoped>
.digital-human {
  width: 100%;
  height: 100%;
  display: grid;
  grid-template-columns: minmax(300px, 0.9fr) minmax(520px, 1.5fr);
  gap: 24px;
  padding: 24px;
  color: #f8fafc;
}

.avatar-panel,
.control-panel,
.chat-box,
.task-panel {
  border: 1px solid rgba(148, 163, 184, 0.24);
  background: rgba(15, 23, 42, 0.72);
  box-shadow: 0 18px 45px rgba(2, 6, 23, 0.24);
}

.avatar-panel {
  border-radius: 22px;
  padding: 22px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 18px;
  min-width: 0;
}

.control-panel {
  border-radius: 22px;
  padding: 20px;
  display: grid;
  grid-template-rows: auto minmax(330px, 1fr) auto;
  gap: 16px;
  min-width: 0;
}

.status-row {
  width: 100%;
  display: flex;
  justify-content: space-between;
  gap: 10px;
}

.state-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 32px;
  padding: 6px 12px;
  border-radius: 999px;
  background: #334155;
  color: #cbd5e1;
  font-size: 13px;
  font-weight: 700;
}

.state-pill.active {
  background: #064e3b;
  color: #a7f3d0;
}

.avatar-wrap {
  position: relative;
  width: min(280px, 72vw);
  aspect-ratio: 1;
  display: grid;
  place-items: center;
}

.aura {
  position: absolute;
  inset: 10%;
  border-radius: 50%;
  filter: blur(30px);
  opacity: 0.55;
  background: #38bdf8;
  transition: all 0.35s ease;
}

.aura.happy { background: #facc15; }
.aura.sad { background: #6366f1; }
.aura.angry { background: #ef4444; }
.aura.surprised { background: #ec4899; }
.aura.fearful { background: #8b5cf6; }
.aura.disgusted { background: #84cc16; }

.avatar {
  position: relative;
  width: 210px;
  height: 210px;
  border-radius: 54px;
  background: linear-gradient(145deg, #38bdf8, #2563eb);
  box-shadow: inset 0 12px 22px rgba(255, 255, 255, 0.18), 0 24px 55px rgba(37, 99, 235, 0.28);
  display: grid;
  grid-template-rows: 52px 72px 1fr;
  justify-items: center;
  align-items: center;
  transition: all 0.35s ease;
}

.avatar.happy {
  background: linear-gradient(145deg, #fde047, #f59e0b);
  border-radius: 72px;
}

.avatar.sad {
  background: linear-gradient(145deg, #818cf8, #3730a3);
  transform: translateY(6px);
}

.avatar.angry {
  background: linear-gradient(145deg, #f87171, #b91c1c);
  border-radius: 40px;
}

.avatar.surprised {
  background: linear-gradient(145deg, #f472b6, #be185d);
  transform: scale(1.04);
}

.avatar.fearful {
  background: linear-gradient(145deg, #a78bfa, #6d28d9);
}

.avatar.speaking .mouth {
  animation: talk 0.28s infinite;
}

.forehead {
  width: 64px;
  height: 16px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.18);
  align-self: end;
}

.eyes {
  display: flex;
  gap: 38px;
}

.eye {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  background: #f8fafc;
  display: grid;
  place-items: center;
  transition: all 0.25s ease;
}

.eye i {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #0f172a;
  transition: all 0.25s ease;
}

.avatar.happy .eye {
  height: 18px;
  border-radius: 999px;
}

.avatar.sad .eye i {
  transform: translateY(8px);
}

.avatar.angry .left {
  transform: rotate(12deg);
}

.avatar.angry .right {
  transform: rotate(-12deg);
}

.avatar.surprised .eye {
  width: 50px;
  height: 50px;
}

.mouth {
  width: 58px;
  height: 8px;
  border-radius: 999px;
  background: white;
  transition: all 0.25s ease;
}

.avatar.happy .mouth {
  width: 74px;
  height: 34px;
  background: transparent;
  border-bottom: 6px solid white;
}

.avatar.sad .mouth {
  width: 62px;
  height: 28px;
  background: transparent;
  border-top: 5px solid white;
}

.avatar.surprised .mouth {
  width: 42px;
  height: 42px;
  border: 6px solid white;
  background: transparent;
}

@keyframes talk {
  0%, 100% { height: 8px; }
  50% { height: 24px; }
}

.subtitle-card {
  width: 100%;
  min-height: 76px;
  border: 1px solid rgba(148, 163, 184, 0.28);
  background: rgba(2, 6, 23, 0.38);
  border-radius: 16px;
  display: grid;
  place-items: center;
  padding: 14px;
  text-align: center;
}

.subtitle-card p {
  margin: 0;
  color: #e2e8f0;
  line-height: 1.55;
}

.camera-card {
  position: relative;
  width: 100%;
  max-width: 260px;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  border-radius: 14px;
  background: #020617;
  border: 1px solid rgba(148, 163, 184, 0.26);
}

.camera-card video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.camera-overlay,
.camera-error {
  position: absolute;
  left: 8px;
  right: 8px;
  bottom: 8px;
  padding: 5px 8px;
  border-radius: 8px;
  background: rgba(2, 6, 23, 0.72);
  color: #e2e8f0;
  font-size: 12px;
}

.camera-error {
  top: 8px;
  bottom: auto;
  color: #fecaca;
}

.config-grid {
  display: grid;
  grid-template-columns: 0.9fr 1.4fr 0.8fr;
  gap: 12px;
}

label {
  display: flex;
  flex-direction: column;
  gap: 7px;
  color: #cbd5e1;
  font-size: 13px;
  font-weight: 700;
}

input,
select {
  min-height: 42px;
  border: 1px solid rgba(148, 163, 184, 0.28);
  border-radius: 12px;
  background: rgba(2, 6, 23, 0.5);
  color: #f8fafc;
  padding: 0 12px;
  outline: none;
}

input:focus,
select:focus {
  border-color: #38bdf8;
}

.chat-box,
.task-panel {
  border-radius: 18px;
  padding: 16px;
  min-width: 0;
}

.chat-box {
  display: grid;
  grid-template-rows: auto 1fr auto;
  min-height: 0;
}

.chat-header,
.task-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.chat-header h3,
.task-header h3 {
  margin: 0;
  font-size: 18px;
}

.chat-header span,
.task-header span {
  color: #93c5fd;
  font-size: 13px;
}

.message-list {
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-right: 6px;
}

.message {
  max-width: 84%;
  padding: 11px 13px;
  border-radius: 16px;
  line-height: 1.55;
  font-size: 14px;
}

.message.user {
  align-self: flex-end;
  background: #2563eb;
  color: white;
  border-bottom-right-radius: 5px;
}

.message.assistant {
  align-self: flex-start;
  background: #334155;
  color: #e2e8f0;
  border-bottom-left-radius: 5px;
}

.message.thinking {
  color: #bfdbfe;
}

.input-row,
.task-form {
  display: grid;
  gap: 10px;
  margin-top: 12px;
}

.input-row {
  grid-template-columns: 132px 1fr auto;
}

.task-form {
  grid-template-columns: 1fr 210px 92px auto;
}

button {
  border: none;
  cursor: pointer;
  font-weight: 800;
  transition: transform 0.2s, opacity 0.2s, background 0.2s;
}

button:hover:not(:disabled) {
  transform: translateY(-1px);
}

button:disabled {
  opacity: 0.58;
  cursor: not-allowed;
}

.primary-btn,
.send-btn,
.voice-btn,
.icon-btn,
.delete-btn {
  min-height: 42px;
  border-radius: 12px;
  color: white;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
}

.primary-btn,
.send-btn {
  background: #2563eb;
  padding: 0 16px;
}

.wide {
  width: 100%;
}

.icon-btn {
  background: #334155;
}

.voice-btn {
  background: #334155;
}

.voice-btn.active,
.icon-btn.active {
  background: #16a34a;
}

.voice-status {
  min-height: 18px;
  margin-top: 8px;
  color: #94a3b8;
  font-size: 12px;
}

.voice-status.active {
  color: #86efac;
}

.voice-status.error {
  color: #fecaca;
}

.delete-btn {
  width: 38px;
  min-height: 38px;
  background: #3f1d2b;
  color: #fecaca;
}

.task-list {
  display: grid;
  gap: 10px;
  max-height: 150px;
  overflow-y: auto;
  margin-top: 12px;
}

.task-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  padding: 12px;
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 14px;
  background: rgba(2, 6, 23, 0.34);
}

.task-item strong,
.task-item span {
  display: block;
}

.task-item span {
  color: #94a3b8;
  font-size: 12px;
  margin-top: 4px;
}

.empty-task {
  margin-top: 12px;
  min-height: 64px;
  display: grid;
  place-items: center;
  color: #94a3b8;
  border: 1px dashed rgba(148, 163, 184, 0.28);
  border-radius: 14px;
}

@media (max-width: 1100px) {
  .digital-human {
    grid-template-columns: 1fr;
    overflow-y: auto;
  }

  .control-panel {
    min-height: 720px;
  }
}

@media (max-width: 760px) {
  .digital-human {
    padding: 14px;
  }

  .config-grid,
  .task-form,
  .input-row {
    grid-template-columns: 1fr;
  }
}
</style>
