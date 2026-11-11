<script setup>
import { onBeforeUnmount, ref } from 'vue'
import { supportRequest } from './supportApi'

defineProps({
  avoidScrollButton: {
    type: Boolean,
    default: false
  }
})

const isOpen = ref(false)
const mode = ref('start')
const customerName = ref('')
const customerUsername = ref('')
const customerEmail = ref('')
const firstMessage = ref('')
const referenceInput = ref('')
const verificationCode = ref('')
const reference = ref('')
const messages = ref([])
const conversations = ref([])
const selectedConversation = ref(null)
const customerToken = ref('')
const draft = ref('')
const error = ref('')
const busy = ref(false)
const pendingPurpose = ref('')
let refreshTimer
let polling = false

function formatTime(value) {
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? ''
    : new Intl.DateTimeFormat('es-MX', { hour: '2-digit', minute: '2-digit' }).format(date)
}

async function loadMessages() {
  if ((!reference.value && !selectedConversation.value) || polling) return
  polling = true
  try {
    const path = selectedConversation.value && customerToken.value
      ? `/public/customer/conversations/${selectedConversation.value.id}/messages`
      : `/public/conversations/${reference.value}/messages`
    const data = await supportRequest(path, { token: customerToken.value || undefined })
    messages.value = data.messages
  } catch (requestError) {
    error.value = requestError.message
    window.clearInterval(refreshTimer)
  } finally {
    polling = false
  }
}

function beginPolling() {
  window.clearInterval(refreshTimer)
  refreshTimer = window.setInterval(loadMessages, 7000)
}

async function requestEmailCode(purpose) {
  error.value = ''
  busy.value = true
  try {
    await supportRequest('/public/email-verification/request', {
      method: 'POST',
      body: JSON.stringify({ email: customerEmail.value, purpose })
    })
    pendingPurpose.value = purpose
    mode.value = purpose === 'start' ? 'verify-start' : 'verify-recover'
  } catch (requestError) {
    error.value = requestError.message
  } finally {
    busy.value = false
  }
}

async function createConversation() {
  error.value = ''
  busy.value = true
  try {
    const data = await supportRequest('/public/conversations', {
      method: 'POST',
      token: customerToken.value,
      body: JSON.stringify({
        customerName: customerName.value,
        customerUsername: customerUsername.value,
        message: firstMessage.value
      })
    })
    reference.value = data.reference
    selectedConversation.value = null
    customerToken.value = ''
    firstMessage.value = ''
    mode.value = 'chat'
    await loadMessages()
    beginPolling()
  } catch (requestError) {
    error.value = requestError.message
  } finally {
    busy.value = false
  }
}

async function verifyEmailCode() {
  error.value = ''
  busy.value = true
  try {
    const data = await supportRequest('/public/email-verification/verify', {
      method: 'POST',
      body: JSON.stringify({
        email: customerEmail.value,
        purpose: pendingPurpose.value,
        code: verificationCode.value
      })
    })
    customerToken.value = data.token
    verificationCode.value = ''
    if (pendingPurpose.value === 'start') {
      await createConversation()
      return
    }

    const result = await supportRequest('/public/customer/conversations', { token: customerToken.value })
    conversations.value = result.conversations
    mode.value = 'choose'
  } catch (requestError) {
    error.value = requestError.message
  } finally {
    busy.value = false
  }
}

async function resumeConversation() {
  error.value = ''
  const enteredReference = referenceInput.value.trim().toUpperCase()
  if (!/^LMQ-[A-F0-9]{16}$/.test(enteredReference)) {
    error.value = 'Revisa la referencia. Debe tener el formato LMQ- seguido de 16 caracteres.'
    return
  }
  busy.value = true
  try {
    reference.value = enteredReference
    selectedConversation.value = null
    customerToken.value = ''
    const data = await supportRequest(`/public/conversations/${reference.value}/messages`)
    messages.value = data.messages
    mode.value = 'chat'
    beginPolling()
  } catch (requestError) {
    error.value = requestError.message
  } finally {
    busy.value = false
  }
}

async function openConversation(conversation) {
  error.value = ''
  busy.value = true
  try {
    selectedConversation.value = conversation
    reference.value = conversation.reference
    const data = await supportRequest(
      `/public/customer/conversations/${conversation.id}/messages`,
      { token: customerToken.value }
    )
    messages.value = data.messages
    mode.value = 'chat'
    beginPolling()
  } catch (requestError) {
    error.value = requestError.message
  } finally {
    busy.value = false
  }
}

async function linkExistingConversation() {
  error.value = ''
  const enteredReference = referenceInput.value.trim().toUpperCase()
  if (!/^LMQ-[A-F0-9]{16}$/.test(enteredReference)) {
    error.value = 'Escribe una referencia válida con el formato LMQ- seguido de 16 caracteres.'
    return
  }
  busy.value = true
  try {
    await supportRequest('/public/customer/conversations/link', {
      method: 'POST',
      token: customerToken.value,
      body: JSON.stringify({ reference: enteredReference })
    })
    const result = await supportRequest('/public/customer/conversations', { token: customerToken.value })
    conversations.value = result.conversations
    referenceInput.value = ''
  } catch (requestError) {
    error.value = requestError.message
  } finally {
    busy.value = false
  }
}

async function sendMessage() {
  const message = draft.value.trim()
  if (!message || busy.value) return
  error.value = ''
  busy.value = true
  try {
    const path = selectedConversation.value && customerToken.value
      ? `/public/customer/conversations/${selectedConversation.value.id}/messages`
      : `/public/conversations/${reference.value}/messages`
    await supportRequest(path, {
      method: 'POST',
      token: customerToken.value || undefined,
      body: JSON.stringify({ message })
    })
    draft.value = ''
    await loadMessages()
  } catch (requestError) {
    error.value = requestError.message
  } finally {
    busy.value = false
  }
}

function closeChat() {
  isOpen.value = false
}

onBeforeUnmount(() => window.clearInterval(refreshTimer))
</script>

<template>
  <div
    class="customer-support-widget"
    :style="{ '--widget-offset': avoidScrollButton ? '66px' : '0px' }"
  >
    <section v-if="isOpen" class="customer-chat-panel" aria-label="Chat de atención a clientes">
      <header class="customer-chat-header">
        <div class="customer-chat-brand">
          <span class="customer-chat-mark">L</span>
          <span><strong>Atención Lemarquet</strong><small>Estamos aquí para ayudarte</small></span>
        </div>
        <button type="button" aria-label="Cerrar chat" @click="closeChat">×</button>
      </header>

      <div v-if="mode !== 'chat'" class="customer-chat-form">
        <template v-if="mode === 'start'">
          <h2>¿En qué podemos ayudarte?</h2>
          <p>Verificaremos tu correo para que puedas recuperar tus conversaciones fácilmente.</p>
          <form @submit.prevent="requestEmailCode('start')">
            <label for="customer-name">Nombre</label>
            <input id="customer-name" v-model="customerName" maxlength="120" autocomplete="name" required />
            <label for="customer-username">Usuario</label>
            <input id="customer-username" v-model="customerUsername" maxlength="120" autocomplete="username" required />
            <label for="customer-email">Correo electrónico</label>
            <input id="customer-email" v-model="customerEmail" type="email" maxlength="254" autocomplete="email" required />
            <label for="customer-first-message">Mensaje</label>
            <textarea id="customer-first-message" v-model="firstMessage" maxlength="5000" rows="3" required></textarea>
            <button type="submit" :disabled="busy">{{ busy ? 'Enviando código…' : 'Continuar por correo' }}</button>
          </form>
          <button class="customer-chat-link" type="button" @click="mode = 'recover'; error = ''">Recuperar mis chats con correo</button>
          <button class="customer-chat-link" type="button" @click="mode = 'resume'; error = ''">Tengo una referencia de chat</button>
        </template>

        <template v-else-if="mode === 'recover'">
          <h2>Recupera tus conversaciones</h2>
          <p>Enviaremos un código al correo que verificaste al iniciar el chat.</p>
          <form @submit.prevent="requestEmailCode('recovery')">
            <label for="recovery-email">Correo electrónico</label>
            <input id="recovery-email" v-model="customerEmail" type="email" maxlength="254" autocomplete="email" required />
            <button type="submit" :disabled="busy">{{ busy ? 'Enviando código…' : 'Enviar código de recuperación' }}</button>
          </form>
          <button class="customer-chat-link" type="button" @click="mode = 'start'; error = ''">Iniciar un chat nuevo</button>
        </template>

        <template v-else-if="mode === 'verify-start' || mode === 'verify-recover'">
          <h2>Revisa tu correo</h2>
          <p>Escribe el código de 6 dígitos que enviamos a <strong>{{ customerEmail }}</strong>. Vence en 10 minutos.</p>
          <form @submit.prevent="verifyEmailCode">
            <label for="customer-verification-code">Código de verificación</label>
            <input
              id="customer-verification-code"
              v-model="verificationCode"
              inputmode="numeric"
              autocomplete="one-time-code"
              pattern="[0-9]{6}"
              maxlength="6"
              required
            />
            <button type="submit" :disabled="busy">{{ busy ? 'Verificando…' : 'Verificar y continuar' }}</button>
          </form>
          <button class="customer-chat-link" type="button" @click="requestEmailCode(pendingPurpose)">Enviar otro código</button>
        </template>

        <template v-else-if="mode === 'choose'">
          <h2>Tus conversaciones</h2>
          <p v-if="conversations.length">Selecciona un chat para continuar. Puedes recuperarlos con este correo cuando lo necesites.</p>
          <p v-else>Aún no hay chats asociados a este correo. Si conservas la referencia de un chat anterior, puedes vincularlo.</p>
          <div v-if="conversations.length" class="customer-chat-conversations">
            <button
              v-for="conversation in conversations"
              :key="conversation.id"
              type="button"
              @click="openConversation(conversation)"
            >
              <strong>{{ conversation.customerName }}</strong>
              <span>{{ conversation.customerUsername }} · {{ conversation.reference }}</span>
              <small>{{ conversation.lastMessage || 'Sin mensajes' }}</small>
            </button>
          </div>
          <form class="customer-chat-link-form" @submit.prevent="linkExistingConversation">
            <label for="link-reference">Vincular chat anterior con referencia</label>
            <input id="link-reference" v-model="referenceInput" placeholder="LMQ-…" maxlength="20" required />
            <button type="submit" :disabled="busy">{{ busy ? 'Vinculando…' : 'Vincular a este correo' }}</button>
          </form>
          <button class="customer-chat-link" type="button" @click="mode = 'start'; customerToken = ''; error = ''">Iniciar un chat nuevo</button>
        </template>

        <template v-else-if="mode === 'resume'">
          <h2>Retoma tu conversación</h2>
          <p>Escribe la referencia que recibiste al iniciar el chat.</p>
          <form @submit.prevent="resumeConversation">
            <label for="customer-reference">Referencia del chat</label>
            <input id="customer-reference" v-model="referenceInput" placeholder="LMQ-…" maxlength="20" required />
            <button type="submit" :disabled="busy">{{ busy ? 'Buscando…' : 'Abrir conversación' }}</button>
          </form>
          <button class="customer-chat-link" type="button" @click="mode = 'recover'; error = ''">Recuperar con correo</button>
          <button class="customer-chat-link" type="button" @click="mode = 'start'; error = ''">Iniciar un chat nuevo</button>
        </template>
        <p v-if="error" class="customer-chat-error" role="alert">{{ error }}</p>
      </div>

      <template v-else>
        <div class="customer-chat-reference">
          Referencia: <strong>{{ reference }}</strong>
          <small>Guárdala para consultar esta sesión más adelante.</small>
        </div>
        <div class="customer-chat-messages" aria-live="polite">
          <article v-for="message in messages" :key="message.id" :class="`message-${message.sender}`">
            <span>{{ message.sender === 'agent' ? 'Atención Lemarquet' : 'Tú' }}</span>
            <p>{{ message.body }}</p>
            <time>{{ formatTime(message.createdAt) }}</time>
          </article>
        </div>
        <form class="customer-chat-compose" @submit.prevent="sendMessage">
          <textarea v-model="draft" rows="2" maxlength="5000" placeholder="Escribe tu mensaje…" required></textarea>
          <button type="submit" aria-label="Enviar mensaje" :disabled="busy || !draft.trim()">Enviar</button>
        </form>
        <p v-if="error" class="customer-chat-error" role="alert">{{ error }}</p>
      </template>
    </section>

    <button
      class="customer-chat-launcher"
      type="button"
      :aria-expanded="isOpen"
      @click="isOpen = !isOpen"
    >
      <span aria-hidden="true">{{ isOpen ? '×' : '✉' }}</span>
      {{ isOpen ? 'Cerrar' : 'Atención a clientes' }}
    </button>
  </div>
</template>

<style scoped>
.customer-support-widget { position: fixed; right: 24px; bottom: calc(24px + var(--widget-offset)); z-index: 45; font-family: Inter, "Segoe UI", sans-serif; color: #17241f; }
.customer-chat-launcher { display: flex; align-items: center; gap: 9px; padding: 13px 18px; border-radius: 30px; background: #287348; color: #fff; font-size: 13px; font-weight: 700; box-shadow: 0 12px 35px rgba(0, 0, 0, .24); }
.customer-chat-launcher:hover { background: #1d603a; transform: translateY(-2px); }
.customer-chat-launcher span { font-size: 18px; }
.customer-chat-panel { position: absolute; right: 0; bottom: 66px; display: flex; flex-direction: column; width: min(370px, calc(100vw - 28px)); height: min(580px, calc(100vh - 110px - var(--widget-offset))); min-height: min(390px, calc(100vh - 110px - var(--widget-offset))); overflow: hidden; border: 1px solid #e3ebe5; border-radius: 17px; background: #fff; box-shadow: 0 24px 70px rgba(15, 32, 21, .24); }
.customer-chat-header { display: flex; flex: 0 0 auto; align-items: center; justify-content: space-between; padding: 14px 16px; background: #287348; color: #fff; }
.customer-chat-brand { display: flex; align-items: center; gap: 10px; }
.customer-chat-mark { display: grid; place-items: center; width: 34px; height: 34px; border-radius: 11px; background: rgba(255,255,255,.18); font-weight: 800; }
.customer-chat-brand strong, .customer-chat-brand small { display: block; }
.customer-chat-brand strong { font-size: 13px; }
.customer-chat-brand small { margin-top: 2px; color: rgba(255,255,255,.75); font-size: 10px; }
.customer-chat-header > button { padding: 2px 6px; background: transparent; color: #fff; font-size: 25px; }
.customer-chat-form { overflow: auto; padding: 19px; }
.customer-chat-form h2 { margin: 0 0 7px; color: #20352a; font-size: 18px; letter-spacing: -.03em; }
.customer-chat-form > p { margin: 0 0 17px; color: #758179; font-size: 12px; line-height: 1.6; }
.customer-chat-form label { display: block; margin: 12px 0 5px; color: #536159; font-size: 11px; font-weight: 700; }
.customer-chat-form input, .customer-chat-form textarea, .customer-chat-compose textarea { width: 100%; padding: 10px; border: 1px solid #dfe7e1; border-radius: 8px; background: #fff; color: #17241f; font: inherit; font-size: 12px; }
.customer-chat-form textarea, .customer-chat-compose textarea { resize: vertical; }
.customer-chat-form input:focus, .customer-chat-form textarea:focus, .customer-chat-compose textarea:focus { outline: 2px solid #b5d8c0; }
.customer-chat-form form > button { width: 100%; margin-top: 14px; padding: 11px; border-radius: 8px; background: #287348; color: #fff; font-size: 12px; font-weight: 700; }
.customer-chat-form form > button:disabled, .customer-chat-compose button:disabled { cursor: wait; opacity: .6; }
.customer-chat-conversations { display: grid; gap: 8px; max-height: 190px; overflow: auto; margin: 12px 0; }
.customer-chat-conversations button { display: grid; gap: 4px; padding: 10px; border: 1px solid #e3ebe5; border-radius: 9px; background: #f8faf8; color: #334139; text-align: left; }
.customer-chat-conversations button:hover { border-color: #9dc5a8; background: #f0f7f1; }
.customer-chat-conversations strong { font-size: 12px; }
.customer-chat-conversations span, .customer-chat-conversations small { overflow: hidden; color: #758179; font-size: 10px; text-overflow: ellipsis; white-space: nowrap; }
.customer-chat-link-form { margin-top: 16px; padding-top: 13px; border-top: 1px solid #e8eee9; }
.customer-chat-link-form label { display: block; margin: 0 0 6px; color: #536159; font-size: 11px; font-weight: 700; }
.customer-chat-link-form input { width: 100%; padding: 10px; border: 1px solid #dfe7e1; border-radius: 8px; background: #fff; color: #17241f; font: inherit; font-size: 12px; }
.customer-chat-link-form > button { width: 100%; margin-top: 8px; padding: 10px; border-radius: 8px; background: #eaf4ed; color: #287348; font-size: 11px; font-weight: 700; }
.customer-chat-link-form > button:hover { background: #dceee0; }
.customer-chat-link-form > button:disabled { cursor: wait; opacity: .6; }
.customer-chat-link { display: block; margin: 12px auto 0; padding: 3px; background: transparent; color: #287348; font-size: 11px; font-weight: 650; }
.customer-chat-link:hover { text-decoration: underline; }
.customer-chat-error { margin: 9px 16px; color: #a63e38; font-size: 11px; }
.customer-chat-reference { padding: 11px 15px; border-bottom: 1px solid #e8eee9; color: #59665e; font-size: 10px; }
.customer-chat-reference strong { color: #287348; letter-spacing: .04em; }
.customer-chat-reference small { display: block; margin-top: 3px; color: #89948d; }
.customer-chat-messages { display: flex; flex: 1; flex-direction: column; gap: 11px; overflow: auto; padding: 15px; background: #f7f9f7; }
.customer-chat-messages article { max-width: 88%; padding: 9px 11px; border-radius: 11px; }
.customer-chat-messages .message-customer { align-self: flex-end; background: #e6f2e9; }
.customer-chat-messages .message-agent { align-self: flex-start; background: #fff; border: 1px solid #e5ebe6; }
.customer-chat-messages article > span { color: #57705e; font-size: 9px; font-weight: 700; }
.customer-chat-messages article p { margin: 4px 0 6px; color: #2b3930; font-size: 12px; line-height: 1.55; white-space: pre-wrap; overflow-wrap: anywhere; }
.customer-chat-messages article time { display: block; color: #98a29b; font-size: 9px; text-align: right; }
.customer-chat-compose { display: flex; align-items: flex-end; gap: 8px; padding: 11px; border-top: 1px solid #e7ece8; }
.customer-chat-compose textarea { min-height: 42px; max-height: 110px; }
.customer-chat-compose button { flex: 0 0 auto; padding: 11px 13px; border-radius: 8px; background: #287348; color: #fff; font-size: 11px; font-weight: 700; }
@media (max-width: 480px) { .customer-support-widget { right: 12px; bottom: calc(12px + var(--widget-offset)); } .customer-chat-panel { bottom: 60px; } }
</style>
