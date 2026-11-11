<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { supportRequest } from './supportApi'

const emit = defineEmits(['exit'])
const token = ref('')
const username = ref('')
const password = ref('')
const loginError = ref('')
const loginLoading = ref(false)
const conversations = ref([])
const selectedId = ref(null)
const messages = ref([])
const search = ref('')
const statusFilter = ref('all')
const reply = ref('')
const loading = ref(false)
const sending = ref(false)
const updatingStatus = ref(false)
const error = ref('')
let refreshTimer
let searchTimer

const selectedConversation = computed(() =>
  conversations.value.find((conversation) => conversation.id === selectedId.value) || null
)

const statusLabels = {
  open: 'Abierta',
  pending: 'En espera',
  closed: 'Cerrada'
}

function formatTime(value) {
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? ''
    : new Intl.DateTimeFormat('es-MX', { dateStyle: 'short', timeStyle: 'short' }).format(date)
}

function handleApiError(apiError) {
  if (apiError.status === 401) {
    token.value = ''
    conversations.value = []
    messages.value = []
    selectedId.value = null
    error.value = 'La sesión expiró. Inicia sesión de nuevo.'
    return
  }
  error.value = apiError.message
}

async function loadConversations({ keepSelection = true } = {}) {
  if (!token.value) return
  loading.value = conversations.value.length === 0
  try {
    const params = new URLSearchParams()
    if (search.value.trim()) params.set('q', search.value.trim())
    if (statusFilter.value !== 'all') params.set('status', statusFilter.value)
    const data = await supportRequest(`/conversations?${params}`, { token: token.value })
    conversations.value = data.conversations
    if (keepSelection && selectedId.value && data.conversations.some((item) => item.id === selectedId.value)) {
      return
    }
    selectedId.value = data.conversations[0]?.id ?? null
    await loadMessages()
  } catch (apiError) {
    handleApiError(apiError)
  } finally {
    loading.value = false
  }
}

async function loadMessages() {
  if (!token.value || !selectedId.value) {
    messages.value = []
    return
  }
  try {
    const data = await supportRequest(`/conversations/${selectedId.value}/messages`, { token: token.value })
    messages.value = data.messages
  } catch (apiError) {
    handleApiError(apiError)
  }
}

async function signIn() {
  loginError.value = ''
  loginLoading.value = true
  try {
    const data = await supportRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: username.value, password: password.value })
    })
    token.value = data.token
    password.value = ''
    error.value = ''
    await loadConversations({ keepSelection: false })
  } catch (apiError) {
    loginError.value = apiError.message
  } finally {
    loginLoading.value = false
  }
}

async function selectConversation(conversation) {
  selectedId.value = conversation.id
  messages.value = []
  error.value = ''
  await loadMessages()
}

async function sendReply() {
  const message = reply.value.trim()
  if (!message || !selectedConversation.value || sending.value) return
  sending.value = true
  error.value = ''
  try {
    await supportRequest(`/conversations/${selectedId.value}/messages`, {
      method: 'POST',
      token: token.value,
      body: JSON.stringify({ message })
    })
    reply.value = ''
    await Promise.all([loadMessages(), loadConversations()])
  } catch (apiError) {
    handleApiError(apiError)
  } finally {
    sending.value = false
  }
}

async function changeStatus(status) {
  if (!selectedConversation.value || updatingStatus.value) return
  updatingStatus.value = true
  error.value = ''
  try {
    await supportRequest(`/conversations/${selectedId.value}/status`, {
      method: 'PATCH',
      token: token.value,
      body: JSON.stringify({ status })
    })
    await loadConversations()
  } catch (apiError) {
    handleApiError(apiError)
  } finally {
    updatingStatus.value = false
  }
}

function signOut() {
  token.value = ''
  conversations.value = []
  messages.value = []
  selectedId.value = null
  password.value = ''
}

onMounted(() => {
  refreshTimer = window.setInterval(() => {
    if (token.value) {
      loadConversations()
      loadMessages()
    }
  }, 12000)
})

watch([search, statusFilter], () => {
  window.clearTimeout(searchTimer)
  searchTimer = window.setTimeout(() => loadConversations({ keepSelection: false }), 250)
})

onBeforeUnmount(() => {
  window.clearInterval(refreshTimer)
  window.clearTimeout(searchTimer)
})
</script>

<template>
  <main class="support-desk">
    <header class="support-topbar">
      <a class="support-brand" href="#" @click.prevent="emit('exit')">
        <span class="support-brand-mark">L</span>
        <span>Lemarquet <small>ATENCIÓN A CLIENTES</small></span>
      </a>
      <div class="support-top-actions">
        <span v-if="token" class="agent-label">Agente: {{ username }}</span>
        <button class="support-top-button" type="button" @click="emit('exit')">Volver al sitio</button>
        <button v-if="token" class="support-top-button" type="button" @click="signOut">Cerrar sesión</button>
      </div>
    </header>

    <section v-if="!token" class="support-login-wrap">
      <form class="support-login-card" @submit.prevent="signIn">
        <div class="support-login-symbol" aria-hidden="true">L</div>
        <p class="support-overline">Centro de soporte</p>
        <h1>Atención a clientes</h1>
        <p class="support-login-intro">Inicia sesión para consultar y responder las conversaciones.</p>
        <label for="support-username">Usuario</label>
        <input id="support-username" v-model="username" autocomplete="username" required />
        <label for="support-password">Contraseña</label>
        <input id="support-password" v-model="password" type="password" autocomplete="current-password" required />
        <p v-if="loginError" class="support-error" role="alert">{{ loginError }}</p>
        <button class="support-primary-button" type="submit" :disabled="loginLoading">
          {{ loginLoading ? 'Verificando…' : 'Iniciar sesión' }}
        </button>
        <p class="support-login-note">El acceso al panel requiere credenciales de agente.</p>
      </form>
    </section>

    <section v-else class="support-layout">
      <aside class="support-inbox">
        <div class="support-inbox-heading">
          <div>
            <p class="support-overline">Bandeja de entrada</p>
            <h1>Conversaciones <span>{{ conversations.length }}</span></h1>
          </div>
          <button class="support-icon-button" type="button" aria-label="Actualizar conversaciones" @click="loadConversations">
            ↻
          </button>
        </div>

        <label class="support-search">
          <span aria-hidden="true">⌕</span>
          <input v-model="search" placeholder="Usuario o referencia…" aria-label="Buscar usuario o referencia" />
        </label>

        <div class="support-filters" aria-label="Filtrar por estado">
          <button
            v-for="filter in ['all', 'open', 'pending', 'closed']"
            :key="filter"
            type="button"
            :class="{ active: statusFilter === filter }"
            @click="statusFilter = filter"
          >
            {{ filter === 'all' ? 'Todas' : statusLabels[filter] }}
          </button>
        </div>

        <p v-if="error" class="support-error support-inbox-error" role="alert">{{ error }}</p>
        <div v-if="loading" class="support-empty">Cargando conversaciones…</div>
        <div v-else-if="!conversations.length" class="support-empty">
          <strong>No hay conversaciones</strong>
          <span>Prueba otra búsqueda o espera un nuevo mensaje.</span>
        </div>
        <div v-else class="support-conversation-list">
          <button
            v-for="conversation in conversations"
            :key="conversation.id"
            class="support-conversation"
            :class="{ selected: selectedId === conversation.id }"
            type="button"
            @click="selectConversation(conversation)"
          >
            <span class="support-avatar">{{ conversation.customerName?.slice(0, 1)?.toUpperCase() || '?' }}</span>
            <span class="support-conversation-copy">
              <span class="support-conversation-title">
                <strong>{{ conversation.customerName }}</strong>
                <time>{{ formatTime(conversation.updatedAt) }}</time>
              </span>
              <span class="support-conversation-user">@{{ conversation.customerUsername }}</span>
              <span class="support-conversation-preview">{{ conversation.lastMessage || 'Sin mensajes' }}</span>
              <span class="support-conversation-meta">
                <span class="support-status" :class="`status-${conversation.status}`">{{ statusLabels[conversation.status] }}</span>
                <span>{{ conversation.reference }}</span>
              </span>
            </span>
          </button>
        </div>
      </aside>

      <section v-if="selectedConversation" class="support-chat">
        <header class="support-chat-header">
          <div class="support-customer">
            <span class="support-avatar large">{{ selectedConversation.customerName?.slice(0, 1)?.toUpperCase() || '?' }}</span>
            <div>
              <h2>{{ selectedConversation.customerName }}</h2>
              <span>@{{ selectedConversation.customerUsername }} · {{ selectedConversation.reference }}</span>
            </div>
          </div>
          <label class="support-status-select">
            <span>Estado</span>
            <select
              :value="selectedConversation.status"
              :disabled="updatingStatus"
              @change="changeStatus($event.target.value)"
            >
              <option value="open">Abierta</option>
              <option value="pending">En espera</option>
              <option value="closed">Cerrada</option>
            </select>
          </label>
        </header>

        <div class="support-message-list" aria-live="polite">
          <p class="support-chat-date">Sesión iniciada {{ formatTime(selectedConversation.createdAt) }}</p>
          <article
            v-for="message in messages"
            :key="message.id"
            class="support-message"
            :class="message.sender === 'agent' ? 'from-agent' : 'from-customer'"
          >
            <span class="support-message-sender">{{ message.sender === 'agent' ? 'Tú' : selectedConversation.customerName }}</span>
            <p>{{ message.body }}</p>
            <time>{{ formatTime(message.createdAt) }}</time>
          </article>
        </div>

        <form class="support-reply" @submit.prevent="sendReply">
          <p v-if="error" class="support-error" role="alert">{{ error }}</p>
          <label for="agent-reply">Responder al cliente</label>
          <div class="support-reply-row">
            <textarea
              id="agent-reply"
              v-model="reply"
              rows="2"
              maxlength="5000"
              placeholder="Escribe tu mensaje…"
              required
              @keydown.ctrl.enter.prevent="sendReply"
            ></textarea>
            <button class="support-primary-button" type="submit" :disabled="sending || !reply.trim()">
              {{ sending ? 'Enviando…' : 'Enviar' }}
            </button>
          </div>
          <span class="support-shortcut">Ctrl + Enter para enviar</span>
        </form>
      </section>

      <section v-else class="support-chat support-chat-empty">
        <span aria-hidden="true">✉</span>
        <h2>Tu bandeja está lista</h2>
        <p>Selecciona una conversación para consultar la sesión y responder al cliente.</p>
      </section>
    </section>
  </main>
</template>

<style scoped>
.support-desk {
  --support-ink: #17241f;
  --support-muted: #74817b;
  --support-line: #e6ece8;
  min-height: 100vh;
  background: #f5f7f5;
  color: var(--support-ink);
  font-family: Inter, "Segoe UI", sans-serif;
}

.support-topbar {
  height: 72px;
  padding: 0 32px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #fff;
  border-bottom: 1px solid var(--support-line);
}

.support-brand,
.support-top-actions,
.support-customer,
.support-conversation-title,
.support-conversation-meta,
.support-reply-row {
  display: flex;
  align-items: center;
}

.support-brand {
  gap: 11px;
  color: var(--support-ink);
  text-decoration: none;
  font-weight: 750;
  letter-spacing: -0.02em;
}

.support-brand small {
  display: block;
  margin-top: 2px;
  color: var(--support-muted);
  font-size: 9px;
  letter-spacing: 0.13em;
}

.support-brand-mark,
.support-login-symbol {
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  border-radius: 12px;
  background: #e8f3ec;
  color: #236742;
  font-size: 19px;
  font-weight: 800;
}

.support-top-actions { gap: 10px; }
.agent-label { color: var(--support-muted); font-size: 13px; margin-right: 8px; }

.support-top-button,
.support-icon-button {
  background: #fff;
  color: #53625a;
  border: 1px solid var(--support-line);
  border-radius: 9px;
}

.support-top-button { padding: 9px 13px; font-size: 12px; }
.support-icon-button { width: 36px; height: 36px; font-size: 21px; }
.support-top-button:hover, .support-icon-button:hover { border-color: #a7c7b1; color: #236742; }

.support-login-wrap {
  min-height: calc(100vh - 72px);
  display: grid;
  place-items: center;
  padding: 32px 16px;
  background: radial-gradient(ellipse at 50% 20%, #edf5ef, #f5f7f5 60%);
}

.support-login-card {
  width: min(100%, 410px);
  padding: 38px;
  border: 1px solid var(--support-line);
  border-radius: 18px;
  background: #fff;
  box-shadow: 0 20px 70px rgba(27, 55, 37, 0.08);
}

.support-login-symbol { width: 48px; height: 48px; font-size: 23px; }
.support-overline { margin: 22px 0 6px; color: #347b50; font-size: 11px; font-weight: 750; letter-spacing: .13em; text-transform: uppercase; }
.support-login-card h1 { margin: 0; font-size: 27px; letter-spacing: -.04em; }
.support-login-intro, .support-login-note { color: var(--support-muted); font-size: 13px; line-height: 1.65; }
.support-login-intro { margin: 9px 0 24px; }
.support-login-card label, .support-reply label { display: block; margin: 15px 0 7px; color: #46534c; font-size: 12px; font-weight: 700; }
.support-login-card input, .support-search input, .support-reply textarea, .support-status-select select {
  width: 100%;
  border: 1px solid #dfe7e1;
  border-radius: 9px;
  background: #fff;
  color: var(--support-ink);
  font: inherit;
}
.support-login-card input { padding: 12px; }
.support-login-card input:focus, .support-search input:focus, .support-reply textarea:focus, .support-status-select select:focus { outline: 2px solid #b5d8c0; border-color: #82b493; }

.support-primary-button {
  border-radius: 9px;
  background: #287348;
  color: #fff;
  font-size: 13px;
  font-weight: 700;
}
.support-primary-button:hover { background: #1d603a; }
.support-primary-button:disabled { cursor: wait; opacity: .65; }
.support-login-card > .support-primary-button { width: 100%; margin-top: 21px; padding: 13px; }
.support-login-note { margin: 16px 0 0; font-size: 11px; text-align: center; }
.support-error { margin: 10px 0; color: #a63e38; font-size: 12px; }

.support-layout {
  display: grid;
  grid-template-columns: minmax(310px, 370px) minmax(0, 1fr);
  width: min(1440px, 100%);
  height: calc(100vh - 72px);
  min-height: 520px;
  margin: 0 auto;
  border-left: 1px solid var(--support-line);
  border-right: 1px solid var(--support-line);
  background: #fff;
}

.support-inbox { display: flex; flex-direction: column; min-height: 0; border-right: 1px solid var(--support-line); }
.support-inbox-heading { display: flex; justify-content: space-between; align-items: center; padding: 23px 20px 14px; }
.support-inbox-heading .support-overline { margin: 0 0 5px; font-size: 9px; }
.support-inbox-heading h1 { margin: 0; font-size: 21px; letter-spacing: -.04em; }
.support-inbox-heading h1 span { margin-left: 5px; color: #8c9890; font-size: 12px; font-weight: 500; }
.support-search { position: relative; display: flex; align-items: center; margin: 0 16px 12px; color: #89958e; }
.support-search span { position: absolute; left: 12px; font-size: 20px; }
.support-search input { padding: 10px 12px 10px 36px; background: #f8faf8; font-size: 12px; }
.support-filters { display: flex; gap: 5px; padding: 0 16px 14px; border-bottom: 1px solid var(--support-line); }
.support-filters button { padding: 7px 9px; border-radius: 7px; background: transparent; color: #74817b; font-size: 10px; white-space: nowrap; }
.support-filters button:hover { color: #287348; background: #f0f6f1; }
.support-filters button.active { background: #eaf4ed; color: #236742; font-weight: 750; }
.support-inbox-error { padding: 0 17px; }
.support-conversation-list { overflow: auto; }
.support-conversation {
  display: flex;
  width: 100%;
  gap: 11px;
  padding: 15px 16px;
  border-bottom: 1px solid #f0f3f0;
  background: #fff;
  color: inherit;
  text-align: left;
}
.support-conversation:hover { background: #f8faf8; }
.support-conversation.selected { background: #eef6f0; box-shadow: inset 3px 0 #368252; }
.support-avatar { flex: 0 0 38px; display: grid; place-items: center; width: 38px; height: 38px; border-radius: 50%; background: #e7f0e9; color: #33734b; font-size: 14px; font-weight: 750; }
.support-avatar.large { width: 42px; height: 42px; font-size: 16px; }
.support-conversation-copy { display: grid; min-width: 0; flex: 1; gap: 4px; }
.support-conversation-title { justify-content: space-between; gap: 7px; }
.support-conversation-title strong { overflow: hidden; font-size: 12px; text-overflow: ellipsis; white-space: nowrap; }
.support-conversation-title time, .support-message time { color: #99a39d; font-size: 9px; white-space: nowrap; }
.support-conversation-user { color: #728078; font-size: 10px; }
.support-conversation-preview { overflow: hidden; color: #6f7b73; font-size: 11px; text-overflow: ellipsis; white-space: nowrap; }
.support-conversation-meta { justify-content: space-between; color: #96a19a; font-size: 9px; }
.support-status { display: inline-flex; padding: 3px 7px; border-radius: 20px; font-size: 9px; font-weight: 700; }
.status-open { background: #e8f5eb; color: #31734b; }
.status-pending { background: #fff4dc; color: #976b1c; }
.status-closed { background: #eff1ef; color: #6e7972; }
.support-empty { display: grid; place-content: center; flex: 1; gap: 5px; padding: 28px; color: #7d8981; font-size: 12px; text-align: center; }
.support-empty strong { color: #4b5850; }

.support-chat { display: flex; flex-direction: column; min-width: 0; min-height: 0; background: #fcfdfc; }
.support-chat-header { display: flex; justify-content: space-between; align-items: center; gap: 16px; padding: 17px 24px; border-bottom: 1px solid var(--support-line); background: #fff; }
.support-customer { min-width: 0; gap: 12px; }
.support-customer h2 { overflow: hidden; margin: 0 0 3px; font-size: 14px; text-overflow: ellipsis; white-space: nowrap; }
.support-customer div > span { color: #74817b; font-size: 10px; }
.support-status-select { display: grid; gap: 4px; color: #829087; font-size: 9px; }
.support-status-select select { width: auto; min-width: 112px; padding: 7px 9px; font-size: 11px; }
.support-message-list { display: flex; flex: 1; flex-direction: column; gap: 15px; overflow: auto; padding: 25px clamp(16px, 5vw, 72px); }
.support-chat-date { align-self: center; margin: 0 0 4px; padding: 5px 10px; border-radius: 30px; background: #f0f3f0; color: #7b8780; font-size: 9px; }
.support-message { max-width: min(78%, 560px); padding: 11px 14px 9px; border-radius: 13px; }
.support-message.from-customer { align-self: flex-start; background: #fff; border: 1px solid #e8ede9; border-top-left-radius: 4px; }
.support-message.from-agent { align-self: flex-end; background: #e8f3eb; border-top-right-radius: 4px; }
.support-message-sender { color: #52705c; font-size: 9px; font-weight: 750; }
.support-message p { margin: 5px 0 7px; color: #29362e; font-size: 12px; line-height: 1.65; white-space: pre-wrap; overflow-wrap: anywhere; }
.support-message time { display: block; text-align: right; }
.support-reply { padding: 13px 24px 12px; border-top: 1px solid var(--support-line); background: #fff; }
.support-reply label { margin: 0 0 8px; }
.support-reply-row { align-items: stretch; gap: 10px; }
.support-reply textarea { resize: vertical; min-height: 48px; max-height: 160px; padding: 11px; font-size: 12px; line-height: 1.5; }
.support-reply-row .support-primary-button { align-self: flex-end; min-width: 86px; padding: 12px; }
.support-shortcut { display: block; margin-top: 5px; color: #98a39c; font-size: 9px; text-align: right; }
.support-chat-empty { align-items: center; justify-content: center; padding: 32px; text-align: center; }
.support-chat-empty > span { display: grid; place-items: center; width: 56px; height: 56px; border-radius: 18px; background: #eaf4ed; color: #33734b; font-size: 24px; }
.support-chat-empty h2 { margin: 14px 0 5px; font-size: 17px; }
.support-chat-empty p { max-width: 290px; margin: 0; color: #78847c; font-size: 12px; line-height: 1.6; }

@media (max-width: 760px) {
  .support-topbar { height: auto; min-height: 64px; padding: 10px 14px; gap: 10px; }
  .support-top-actions { gap: 5px; }
  .support-top-button { padding: 8px; font-size: 10px; }
  .agent-label { display: none; }
  .support-layout { grid-template-columns: 1fr; height: auto; min-height: calc(100vh - 64px); border: 0; }
  .support-inbox { min-height: calc(100vh - 64px); border-right: 0; }
  .support-chat { min-height: calc(100vh - 64px); }
  .support-chat-header { padding: 14px; }
  .support-message-list { min-height: 250px; padding: 20px 14px; }
  .support-reply { padding: 12px 14px; }
  .support-message { max-width: 90%; }
}

@media (max-width: 440px) {
  .support-brand { gap: 7px; font-size: 12px; }
  .support-brand-mark { width: 32px; height: 32px; }
  .support-top-actions { gap: 4px; }
  .support-top-button { padding: 7px; font-size: 9px; }
  .support-filters { gap: 2px; padding-inline: 8px; }
  .support-filters button { padding: 7px 6px; font-size: 9px; }
  .support-login-card { padding: 28px 22px; }
  .support-reply-row { flex-direction: column; }
  .support-reply-row .support-primary-button { align-self: stretch; }
}
</style>
