<template>
  <div class="ct-actions-vertical">

    <!-- Local → CT -->
    <button
      v-if="isLocal"
      class="act"
      title="Procesar (Local)"
      @click="sendLocal"
    >📦</button>

    <button
      v-if="isCtPendiente"
      class="act primary"
      title="Petición de pedido CT"
      @click="sendCt"
    >🚀</button>

    <!-- Confirmaciones -->
    <button
      v-if="isFinalizado"
      class="act success"
      title="Proceso terminado"
      @click="confirmLocal"
    >✔</button>

    <button
      v-if="isCotizado&&!isFinalizado&&!isLocal&&!isCtPendiente"
      class="act success"
      title="Confirmar en CT"
      @click="confirmCt"
    >🧾</button>

    <!-- 🗑 ELIMINAR LOCAL -->
    <button
      v-if="!isLocal"
      class="act danger"
      title="Eliminar orden"
      @click="confirmEliminar"
    >🗑</button>

    <!-- STATUS / LOGS / HISTORIAL -->
    <button
      class="act"
      title="Status local / Logs"
      @click="abrirLogs(orden.id)"
    >📄</button>

    <button
      class="act"
      title="Historial"
      @click="abrirHistorial(orden.id)"
    >📜</button>

    <button
      v-if="isCt"
      class="act"
      title="Status CT"
      @click="abrirStatus(orden.ct_folio)"
    >📡</button>

    <button
      v-if="isCt"
      class="act"
      title="Detalle CT"
      @click="verDetalle(orden.ct_folio,orden.id)"
    >🔍</button>

<button
  v-if="isFolioCt && !isCotizado"
  class="act"
  :class="{ error: isErrorCotizacion, warning: !isErrorCotizacion }"
  :title="isErrorCotizacion 
    ? 'Error técnico al cotizar — Reintentar'
    : 'Cotizar guía'"
  @click="abrirCotizacion(orden.ct_folio)"
>
  <span v-if="isErrorCotizacion" class="icon">⚠️</span>
  <span v-else class="icon">💰</span>
</button>
<button 
  v-if="isFinalizado"  
  class="act primary"
  :title="isErrorCotizacion 
    ? 'Error técnico en precio — Reintentar'
    : 'Precio Final'" 
  @click="() => { showModal = true }">
  🟢
</button>

<button
  v-if="isFinalizado"  
  class="act primary"
  :title="isErrorCotizacion 
    ? 'Error técnico — Reintentar'
    : 'Administrar Guia'" 
    :disabled="ctGuiaStore.cooldownRemaining > 0 || ctGuiaStore.isRateLimited"
  @click="administrarGuia(orden.ct_folio)"
>
📄
</button>
<!-- Mensajes flotantes -->
  <div class="ct-alerts">
    <transition name="fade">
      <div v-if="ctGuiaStore.cooldownRemaining" class="ct-alert ct-alert-info">
        ⏳ Espera {{ ctGuiaStore.cooldownRemaining }}s para volver a consultar
      </div>
    </transition>

    <transition name="fade">
      <div v-if="ctGuiaStore.isRateLimited" class="ct-alert ct-alert-error">
        🚫 Límite de consultas por hora alcanzado
      </div>
    </transition>
  </div>

<!-- MODALES -->
    <Teleport to="body">
      <CtPedidoDetalleModal />

      <LogsModal ref="logsModal" />

      <CTHistorialModal
        :visible="mostrarHistorial"
        :ordenCtId="historialOrdenCtId"
        @close="cerrarHistorial"
      />

      <CtStatusModal />
      <CtCotizacionModal />

      <CtPedidoEstadoModal
        :visible="ctPedidoModalVisible"
        @close="ctPedidoModalVisible = false"
      />
      <CtPrecioFinalModal
  :visible="showModal"
  :ordenId="ordenSeleccionada"
  :orden="orden"
  @close="showModal = false"
/>
<CtGuiaModal />
    </Teleport>

  </div>
</template>
<script setup>
import { computed, ref, watch } from 'vue'
import { useCt } from '@/composables/useCt'
import { useUiStore } from '@/stores/useUiStore'
import { useCtStatusStore } from '@/stores/useCtStatusStore'
import { useCtPedidoStore } from "@/stores/useCtPedidoStore";
import { useCtConfirmacionStore } from "@/stores/useCtConfirmacionStore";
import { usePedidoDetalleCt } from '@/composables/usePedidoDetalleCt'
import { useCotizacionCt } from "@/composables/useCotizacionCt";

import LogsModal from '@/components/ct/LogsModal.vue'
import CTHistorialModal from '@/components/ct/CTHistorialModal.vue'
import CtStatusModal from '@/components/ct/CtStatusModal.vue'
import CtPedidoDetalleModal from '@/components/ct/CtPedidoDetalleModal.vue'
import CtCotizacionModal from "@/components/ct/CtCotizacionModal.vue";
import CtPedidoEstadoModal from "@/components/ct/CtPedidoEstadoModal.vue";
import CtPrecioFinalModal from "@/components/ct/CtPrecioFinalModal.vue";
import CtGuiaModal from "@/components/ct/CtGuiaModal.vue";
import { useCtGuiaStore } from '@/stores/useCtGuiaStore'


/* ---------------------------------------------
   INSTANCIAS
----------------------------------------------*/
const ct = useCt()
const ui = useUiStore()
const statusStore = useCtStatusStore()
const ctPedido = useCtPedidoStore()
const ctConfirmacion = useCtConfirmacionStore()

/* PROPS convertidos a reactive para reactividad */
const props = defineProps({
  orden: { type: Object, required: true }
})
const orden = ref({ ...props.orden })

const showModal = ref(false)
const ordenSeleccionada = ref(orden?.value?.id || null)

/* ---------------------------------------------
   MODALES / COMPOSABLES
----------------------------------------------*/
const ctPedidoModalVisible = ref(false)
const { cotizar, resultados, isModalOpen, isLoading, error, cerrarModal } = useCotizacionCt()
const { cargarDetalle } = usePedidoDetalleCt()
const ctGuiaStore = useCtGuiaStore()

const administrarGuia = async (ctFolio) => {
  console.log('administrarGuia',ctFolio)
  try {
    await ctGuiaStore.fetchGuiaByFolio(ctFolio)
    // aquí normalmente abres modal o navegas a vista
    // ejemplo:
    // showGuiaModal.value = true
  } catch (err) {
    // el toast ya lo maneja useApi
  }
}

/* ---------------------------------------------
   ACCIONES CT: COTIZACION
----------------------------------------------*/
async function abrirCotizacion(folio) {
  if (!folio) {
    console.warn("⚠️ No se proporcionó folio para cotización");
    return
  }

  console.group("📦 Abrir cotización CT")
  console.log("Folio CT:", folio)
  console.log("Resultados actuales:", resultados.value)
  console.groupEnd()

  await cotizar(folio)          // esperar a que termine la cotización
  await ct.listar()              // refrescar lista para actualizar orden
}

/* ---------------------------------------------
   ACCIONES CT: CONFIRMAR
----------------------------------------------*/
async function ctConfirmar(folio) {
  if (!folio) return
  await ctConfirmacion.confirmarOrdenCt({ id: folio })
  await ct.listar()
}

function verDetalle(folio,ordenId) {
  cargarDetalle(folio,ordenId)
}

/* ---------------------------------------------
   MODAL STATUS
----------------------------------------------*/
const abrirStatus = async (folio) => {
  if (!folio) return
  await statusStore.consultarStatusCt(folio)
}

/* ---------------------------------------------
   MODAL HISTORIAL
----------------------------------------------*/
const mostrarHistorial = ref(false)
const historialOrdenCtId = ref(null)

const abrirHistorial = (ordenCtId) => {
  historialOrdenCtId.value = ordenCtId
  mostrarHistorial.value = true
}
const cerrarHistorial = () => (mostrarHistorial.value = false)

/* ---------------------------------------------
   MODAL LOGS
----------------------------------------------*/
const logsModal = ref(null)
const abrirLogs = (id) => logsModal.value?.open(id)

/* ---------------------------------------------
   ESTADOS COMPUTADOS
----------------------------------------------*/
const isLocal = computed(() => orden.value.estado_local === 'local')
const isCtPendiente = computed(() => orden.value.estado_ct === 'pendiente_ct')
const isFinalizado = computed(() => orden.value.ct_folio && orden.value.estado_ct === 'confirmada_ct')
const isCotizado = computed(() => orden.value.pedido_status === 'cotizada')
const isFolioCt = computed(() => orden.value.estado_ct === 'Pendiente')
const isCt = computed(() =>
  (orden.value.ct_folio && orden.value.estado_ct === 'Pendiente') ||
  orden.value.estado_ct === 'confirmada_ct'
)
const isErrorCotizacion = computed(() => orden.value.pedido_status === 'error_tecnico')
const isErrorAlmacenComun = computed(() => orden.value.pedido_status === 'sin_almacen_comun')
const isErrorCotizacionFatal = computed(() => orden.value.pedido_status === 'error_cotizacion')
/* ---------------------------------------------
   ACCIONES PRINCIPALES
----------------------------------------------*/
const sendLocal = async () => {
  await ct.enviarLocal(orden.value.id)
  await ct.listar()
}

const sendCt = async () => {
  ctPedidoModalVisible.value = true
  ctPedido.reset()
  await ct.enviarPedidoCt({ id: orden.value.id })
  await ctPedido.listenStatus()   // esperar que termine la escucha
  await ct.listar()
}

const confirmLocal = async () => {
  await ct.confirmarLocal({ id: orden.value.id })
  await ct.listar()
}

const confirmCt = async () => {
  if (!orden.value.ct_folio) return
  await ctConfirmacion.confirmarOrdenCt({ id: orden.value.ct_folio })
  await ct.listar()
}

const confirmEliminar = async () => {
  const ok = await ui.openConfirm("¿Eliminar esta orden?")
  if (!ok) return

  await ct.eliminar(orden.value.id)
  await ct.listar()
}

/* ---------------------------------------------
   WATCH para actualizar orden cada vez que props cambie
----------------------------------------------*/
watch(
  () => props.orden,
  (newVal) => {
    orden.value = { ...newVal }
  },
  { deep: true }
)
</script>
<style scoped>
/* ===============================
   CONTENEDOR
   =============================== */
.ct-actions-vertical {
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-items: center;
}

/* ===============================
   BOTÓN BASE
   =============================== */
.act {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  border: 1px solid transparent;
  cursor: pointer;

  display: flex;
  align-items: center;
  justify-content: center;

  font-size: 16px;
  line-height: 1;

  transition:
    transform 0.15s ease,
    background-color 0.15s ease,
    box-shadow 0.15s ease,
    filter 0.15s ease;
}

.act:hover {
  transform: scale(1.08);
  filter: brightness(1.05);
}

.act:active {
  transform: scale(0.96);
}

.act:disabled {
  cursor: not-allowed;
  opacity: 0.45;
  filter: grayscale(1);
}

/* ===============================
   ICONO
   =============================== */
.icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
}

/* ===============================
   ESTADOS VISUALES
   =============================== */

/* 🔵 PRIMARY */
.act.primary {
  background: #e0e7ff;
  border-color: #2563eb;
  color: #1e3a8a;
  box-shadow: 0 2px 6px rgba(37, 99, 235, 0.25);
}

/* 🟢 SUCCESS */
.act.success {
  background: #dcfce7;
  border-color: #16a34a;
  color: #065f46;
  box-shadow: 0 2px 6px rgba(22, 163, 74, 0.25);
}

/* 🟡 WARNING */
.act.warning {
  background: #fef3c7;
  border-color: #ca8a04;
  color: #92400e;
  box-shadow: 0 2px 6px rgba(202, 138, 4, 0.3);
}

/* 🔴 DANGER */
.act.danger {
  background: #fee2e2;
  border-color: #dc2626;
  color: #7f1d1d;
  box-shadow: 0 2px 6px rgba(220, 38, 38, 0.3);
}

/* 🚨 ERROR CT (prioridad máxima) */
.act.error {
  background: #dc2626;
  border-color: #991b1b;
  color: #ffffff;
  box-shadow:
    0 0 0 2px rgba(220, 38, 38, 0.4),
    0 4px 10px rgba(220, 38, 38, 0.6);
  animation: ctErrorPulse 1.4s infinite;
}

/* ===============================
   ERROR PULSE
   =============================== */
@keyframes ctErrorPulse {
  0% {
    box-shadow:
      0 0 0 0 rgba(220, 38, 38, 0.6),
      0 4px 10px rgba(220, 38, 38, 0.5);
  }
  70% {
    box-shadow:
      0 0 0 8px rgba(220, 38, 38, 0),
      0 4px 10px rgba(220, 38, 38, 0.5);
  }
  100% {
    box-shadow:
      0 0 0 0 rgba(220, 38, 38, 0),
      0 4px 10px rgba(220, 38, 38, 0.5);
  }
}
/* Container flotante */
.ct-alerts {
  position: fixed;
  top: 2.3rem;        /* mantener cerca del top */
  left: 1rem;       /* mover a la izquierda */
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  z-index: 2000;
  max-width: 300px; /* opcional, para no crecer demasiado */
}

/* Alert base */
.ct-alert {
  padding: 0.75rem 1rem;
  border-radius: 0.5rem;
  color: white;
  font-weight: 500;
  min-width: 220px;
  max-width: 100%;   /* asegurar que no genere scroll horizontal */
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  opacity: 0.95;
  word-break: break-word; /* prevenir overflow de texto largo */
}

/* Tipos de alertas */
.ct-alert-info {
  background-color: #3b82f6; /* azul */
}

.ct-alert-error {
  background-color: #ef4444; /* rojo */
}

/* Transiciones */
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
.fade-enter-to, .fade-leave-from {
  opacity: 1;
  transform: translateY(0);
}

</style>
