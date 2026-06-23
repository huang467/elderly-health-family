import { defineStore } from 'pinia'

// 简单的 WebSocket 管理器类，用于处理重连和心跳
class WebSocketManager {
  constructor(url, token, onMessage, onStatusChange) {
    this.url = url
    this.token = token
    this.onMessage = onMessage
    this.onStatusChange = onStatusChange
    this.ws = null
    this.pingInterval = null
    this.forcedClose = false
  }
  connect() {
    if (this.ws || this.forcedClose) return
    this.onStatusChange('connecting')
    try {
      this.ws = new WebSocket(`ws://${this.url}`)
      this.ws.onopen = () => {
        this.onStatusChange('connected')
        // 握手协议
        this.send({
          type: "req", id: "auth-" + Date.now(), method: "connect",
          params: {
            minProtocol: 3, maxProtocol: 3,
            client: { id: "cli", mode: "cli", version: "2026.2.4", platform: "web", displayName: "WebUser" },
            role: "operator", auth: { token: this.token },
            scopes: ["operator.admin", "operator.approvals", "operator.pairing"]
          }
        })
        this.startHeartbeat()
      }
      this.ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data)
          this.onMessage(msg)
        } catch (err) { console.error(err) }
      }
      this.ws.onclose = () => {
        this.cleanup()
        this.onStatusChange('disconnected')
        if (!this.forcedClose) setTimeout(() => this.connect(), 3000)
      }
    } catch (e) { setTimeout(() => this.connect(), 5000) }
  }
  send(data) {
    if (this.ws && this.ws.readyState === 1 /* OPEN */) {
      this.ws.send(JSON.stringify(data))
      return true
    }
    return false
  }
  startHeartbeat() {
    if (this.pingInterval) clearInterval(this.pingInterval)
    this.pingInterval = setInterval(() => this.send({ type: "ping" }), 20000)
  }
  cleanup() { if (this.pingInterval) clearInterval(this.pingInterval) }
  disconnect() { this.forcedClose = true; this.cleanup(); if (this.ws) this.ws.close(); this.ws = null; this.onStatusChange('disconnected') }
}

export const useAgentStore = defineStore('agent', {
  state: () => ({
    status: 'disconnected',
    config: { url: "127.0.0.1:18789", token: "" },
    messages: [],
    emotion: 'neutral', // 暴露给全局的当前情绪
    isThinking: false,
    sessionKey: "web-" + Math.random().toString(36).substr(2, 9),
    wsManager: null
  }),
  actions: {
    initConnection() {
      if (this.wsManager) this.wsManager.disconnect()
      this.wsManager = new WebSocketManager(
        this.config.url, 
        this.config.token, 
        this.handleServerMessage, 
        (status) => { this.status = status }
      )
      this.wsManager.connect()
    },
    addMessage(content, type) {
      this.messages.push({ id: Date.now(), content, type })
      if (this.messages.length > 50) this.messages.shift()
    },
    deleteMessage(id) {
      this.messages = this.messages.filter(msg => msg.id !== id)
    },
    sendMessage(text, currentEmotionText = "平静") {
      if (!text.trim() || !this.wsManager) return
      
      this.isThinking = true
      // 隐式注入情绪信息
      const messageWithContext = `(系统提示：用户当前的微表情为${currentEmotionText}) \n\n用户说：${text}`
      
      const sent = this.wsManager.send({
        type: "req", id: "chat-" + Date.now(), method: "chat.send",
        params: { sessionKey: this.sessionKey, message: messageWithContext, idempotencyKey: "msg-" + Date.now() }
      })
      
      if (sent) this.addMessage(text, 'me')
      else { this.addMessage("未连接", 'err'); this.isThinking = false }
    },
    handleServerMessage(msg) {
      if (msg.type === 'event' && msg.event === 'chat') {
        const p = msg.payload
        if (p.state === 'final') {
          this.isThinking = false
          if (p.message?.content) {
            let text = Array.isArray(p.message.content) ? p.message.content.map(c => c.text || '').join('') : p.message.content
            this.addMessage(text, 'ai')
            // 这里会触发全局事件，让独立的语音模块去朗读
            window.dispatchEvent(new CustomEvent('agent-speak', { detail: { text, emotion: this.emotion } }))
          }
        }
      }
    }
  }
})
