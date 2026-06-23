import { ref, onMounted, onUnmounted } from 'vue'

export function useAgentSpeech() {
  const isSpeaking = ref(false)
  const isListening = ref(false)
  const isRecognitionSupported = ref(false)
  const voiceError = ref('')
  const subtitle = ref("")
  
  let synth = null
  let recognition = null

  onMounted(() => {
    synth = window.speechSynthesis
    
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      recognition = new SpeechRecognition()
      isRecognitionSupported.value = true
      recognition.continuous = false
      recognition.interimResults = false
      recognition.lang = 'zh-CN'
      recognition.onstart = () => {
        voiceError.value = ''
        isListening.value = true
      }
      recognition.onend = () => { isListening.value = false }
      recognition.onerror = (event) => {
        isListening.value = false
        voiceError.value = getRecognitionErrorText(event?.error)
      }
    }

    // 监听 Store 发出的说话事件
    window.addEventListener('agent-speak', handleSpeakEvent)
  })

  onUnmounted(() => {
    window.removeEventListener('agent-speak', handleSpeakEvent)
    if (synth) synth.cancel()
  })

  const handleSpeakEvent = (e) => {
    speak(e.detail.text, e.detail.emotion)
  }

  const speak = (text, emotion) => {
    if (!synth) return
    synth.cancel()

    // 清洗文本，过滤 Markdown 和 Emoji
    const spokenText = text.replace(/[*_#`~]/g, '').replace(/[\p{Extended_Pictographic}\uFE0F]/gu, '').trim()
    if (!spokenText) return

    const u = new SpeechSynthesisUtterance(spokenText)
    u.lang = 'zh-CN'
    const v = synth.getVoices().find(v => v.name.includes('Google') && v.lang.includes('zh')) || synth.getVoices().find(v => v.lang.includes('zh'))
    if (v) u.voice = v

    // 语调配置字典 (与你原代码一致)
    const VOICE_SETTINGS = {
      neutral: { rate: 1.0, pitch: 1.0, volume: 1.0 },
      happy: { rate: 1.1, pitch: 1.2, volume: 1.0 },
      sad: { rate: 0.9, pitch: 0.8, volume: 0.9 },
      angry: { rate: 1.2, pitch: 0.9, volume: 1.1 },
      surprised: { rate: 1.1, pitch: 1.3, volume: 1.0 },
      fearful: { rate: 1.0, pitch: 0.7, volume: 0.8 },
      disgusted: { rate: 0.9, pitch: 0.8, volume: 0.9 },
      laughing: { rate: 1.2, pitch: 1.3, volume: 1.1 },
      sleepy: { rate: 0.8, pitch: 0.7, volume: 0.8 },
      confused: { rate: 1.0, pitch: 1.1, volume: 1.0 },
      bored: { rate: 0.9, pitch: 0.8, volume: 0.9 }
    }
    const settings = VOICE_SETTINGS[emotion] || VOICE_SETTINGS.neutral
    u.rate = settings.rate; u.pitch = settings.pitch; u.volume = settings.volume

    u.onstart = () => { isSpeaking.value = true; subtitle.value = text }
    u.onend = () => { isSpeaking.value = false }
    synth.speak(u)
  }

  const toggleMic = (onResult) => {
    if (isListening.value) {
      recognition?.stop()
    } else {
      synth?.resume() // 唤醒可能沉睡的语音引擎
      if (recognition) {
        recognition.onresult = (e) => {
          voiceError.value = ''
          onResult(e.results[0][0].transcript)
        }
        try {
          recognition.start()
        } catch (error) {
          voiceError.value = '语音输入启动失败，请稍后再试。'
        }
      } else {
        voiceError.value = '当前浏览器暂不支持语音输入，建议使用 Chrome 或 Edge。'
      }
    }
  }
  
  // 专门用于只更新字幕但不发声的方法（用于面部表情的静态提醒）
  const updateSubtitleSilently = (text) => {
    subtitle.value = text
  }

  return { isSpeaking, isListening, isRecognitionSupported, voiceError, subtitle, speak, updateSubtitleSilently, toggleMic }
}

const getRecognitionErrorText = (error) => {
  const map = {
    'not-allowed': '麦克风权限未开启，请允许浏览器使用麦克风。',
    'audio-capture': '没有检测到可用麦克风。',
    'no-speech': '没有听清楚，请再说一遍。',
    network: '语音识别网络暂时不可用。'
  }
  return map[error] || '语音输入暂时不可用，请稍后再试。'
}
