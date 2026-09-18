<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'

const showScrollTop = ref(false)

const handleScroll = () => {
  showScrollTop.value = window.scrollY > 400
}

const scrollToTop = () => {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

const scrollToSection = (id) => {
  const element = document.getElementById(id)

  if (element) {
    element.scrollIntoView({ behavior: 'smooth', block: 'start' })
    return
  }

  window.location.hash = id
}

onMounted(() => {
  window.addEventListener('scroll', handleScroll)
  handleScroll()
})

onBeforeUnmount(() => {
  window.removeEventListener('scroll', handleScroll)
})

const b2bUrl = import.meta.env.VITE_SOLICITUD_URL_B2B || '#'
const demoUrl = import.meta.env.VITE_SOLICITUD_DEMO_URL || '#'
const managementUrl = import.meta.env.VITE_SOLICITUD_SUBSCRIPTION_URL || '#'
const projectUrl = import.meta.env.VITE_CONTACT_URL || demoUrl

const navItems = [
  { label: 'Ecosistema', href: '#ecosistema' },
  { label: 'Solución B2B', href: '#b2b' },
  { label: 'Gestión interna', href: '#backoffice' },
  { label: 'Servicios', href: '#servicios' }
]

const techStack = ['B2B', 'Backoffice', 'APIs', 'Integraciones', 'Infraestructura', 'Operación comercial']

const ecosystemLines = [
  {
    label: 'Solución B2B',
    title: 'Portal B2B',
    description: 'Un entorno comercial para clientes empresariales que necesitan consultar productos, gestionar pedidos y dar seguimiento a su operación de compra.',
    features: ['Catálogo', 'Productos', 'Pedidos', 'Carrito y Order Builder', 'Precios comerciales', 'Cotización y totalización']
  },
  {
    label: 'Gestión interna',
    title: 'Backoffice',
    description: 'El centro operativo para administrar y supervisar la operación empresarial detrás del entorno comercial.',
    features: ['Usuarios y clientes', 'Proveedores', 'Productos y catálogo', 'Sincronización', 'Órdenes', 'Fulfillment']
  },
  {
    label: 'Servicios a medida',
    title: 'Desarrollo e integración tecnológica',
    description: 'Capacidades de desarrollo para crear, integrar o adaptar soluciones que respondan a necesidades específicas del negocio.',
    features: ['Desarrollo', 'Integraciones', 'APIs', 'Infraestructura', 'Automatización', 'Evolución tecnológica']
  }
]

const b2bFeatures = [
  'Consulta de productos, información comercial y disponibilidad',
  'Creación, consulta y seguimiento de pedidos',
  'Carrito y preparación de pedidos antes de confirmar',
  'Precios comerciales y condiciones del cliente',
  'Pagos, crédito y historial de operaciones',
  'Envíos, seguimiento y trazabilidad'
]

const backofficeAreas = [
  'Usuarios, clientes, proveedores y permisos de acceso',
  'Productos, variantes, categorías y sincronización de información',
  'Órdenes, fulfillment, envíos y calendario operativo',
  'Facturación, métricas y observabilidad',
  'Integraciones con plataformas y servicios externos',
  'Supervisión de procesos, errores y estados operativos'
]

const services = [
  {
    index: '01',
    title: 'Desarrollo de software',
    description: 'Diseñamos soluciones digitales para automatizar procesos, centralizar operaciones y mejorar la eficiencia del negocio.',
    items: ['Sistemas administrativos', 'Dashboards', 'Portales B2B', 'Automatización de procesos']
  },
  {
    index: '02',
    title: 'Integraciones y APIs',
    description: 'Conectamos plataformas, servicios y proveedores para unificar información y eliminar fricciones entre sistemas.',
    items: ['APIs REST', 'Webhooks', 'Sistemas externos', 'Sincronización de datos']
  },
  {
    index: '03',
    title: 'Infraestructura tecnológica',
    description: 'Preparamos entornos seguros, estables y preparados para crecer con el negocio y sus necesidades operativas.',
    items: ['Cloud', 'SSL', 'Deploy', 'Monitoreo y continuidad']
  }
]

const stats = [
  { value: '3', label: 'líneas de negocio' },
  { value: '1', label: 'ecosistema claro' },
  { value: 'B2B', label: 'entorno comercial' },
  { value: '24/7', label: 'control operativo' }
]
</script>

<template>
  <div class="page-shell">
    <button v-if="showScrollTop" class="scroll-top" aria-label="Volver arriba" @click="scrollToTop">
      ↑
    </button>

    <header class="topbar">
      <div class="container nav">
        <div class="brand">
          <img class="brand-mark" src="/navicon.png" alt="Lemarquet" />
        </div>

        <nav>
          <a v-for="link in navItems" :key="link.label" :href="link.href">{{ link.label }}</a>
        </nav>

        <a :href="b2bUrl" target="_blank" rel="noopener noreferrer" class="primary-button">Solicitar acceso B2B</a>
      </div>
    </header>

    <section class="top-demo">
      <div class="container demo-strip">
        <div class="demo-strip-copy">
          <span class="eyebrow">Live demo</span>
          <h2>Descubre la gestión interna en acción.</h2>
          <p>
            Explora cómo Lemarquet ayuda a operar, supervisar y escalar el negocio desde un único entorno conectado, claro y listo para crecer.
          </p>
        </div>

        <div class="demo-strip-actions">
          <a :href="demoUrl" target="_blank" rel="noopener noreferrer" class="primary-button large">Ver demo en vivo</a>
          <a :href="managementUrl" target="_blank" rel="noopener noreferrer" class="secondary-button large">Solicitar acceso</a>
        </div>
      </div>
    </section>

    <main>
      <section class="hero">
        <div class="container hero-grid">
          <div class="hero-copy">
            <span class="eyebrow">Lemarquet · Solución B2B · Gestión interna · Servicios a medida</span>
            <h1>Tecnología para operar, vender y crecer.</h1>
            <p>
              Construimos soluciones digitales que conectan la operación comercial, la gestión empresarial y la tecnología que hace posible crecer.
            </p>

            <div class="cta-row">
              <button class="primary-button large" @click="scrollToSection('b2b')">Conocer solución B2B</button>
              <button class="secondary-button large" @click="scrollToSection('backoffice')">Conocer gestión interna</button>
              <a :href="projectUrl" target="_blank" rel="noopener noreferrer" class="secondary-button large">DEMO</a>
            </div>

            <div class="tech-stack" aria-label="Tecnologías y líneas de negocio">
              <span v-for="item in techStack" :key="item">{{ item }}</span>
            </div>

            <ul class="hero-list">
              <li>Portal B2B para clientes empresariales.</li>
              <li>Backoffice para controlar la operación interna.</li>
              <li>Servicios a medida para desarrollo, integraciones y APIs.</li>
              <li>Infraestructura tecnológica preparada para crecer.</li>
            </ul>
          </div>

          <div class="hero-visual">
            <div class="visual-card">
              <img
                src="https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1200&q=80"
                alt="Equipo de tecnología y negocios"
              />
            </div>

            <div class="floating-panel">
              <div class="panel-header">
                <span class="status-dot"></span>
                <span>Ecosistema Lemarquet</span>
              </div>

              <div class="panel-metric">
                <strong>3</strong>
                <span>líneas estratégicas: B2B, gestión interna y servicios</span>
              </div>

              <div class="mini-grid">
                <div>
                  <label>B2B</label>
                  <strong>Portal</strong>
                </div>
                <div>
                  <label>Interna</label>
                  <strong>Backoffice</strong>
                </div>
                <div>
                  <label>Desarrollo</label>
                  <strong>A medida</strong>
                </div>
                <div>
                  <label>Operación</label>
                  <strong>Control</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="ecosistema" class="section">
        <div class="container">
          <div class="section-heading">
            <span class="eyebrow">Ecosistema</span>
            <h2>Un ecosistema tecnológico para diferentes necesidades empresariales.</h2>
          </div>

          <div class="module-differentiation-grid">
            <article v-for="line in ecosystemLines" :key="line.title" class="module-differentiation-card">
              <span class="eyebrow light">{{ line.label }}</span>
              <h3>{{ line.title }}</h3>
              <p>{{ line.description }}</p>
              <ul>
                <li v-for="feature in line.features" :key="feature">{{ feature }}</li>
              </ul>
            </article>
          </div>
        </div>
      </section>

      <section id="b2b" class="section dark-section">
        <div class="container">
          <div class="section-heading left">
            <span class="eyebrow">Solución B2B</span>
            <h2>Un entorno comercial diseñado para empresas.</h2>
          </div>

          <div class="business-layout">
            <div class="business-copy">
              <p>
                El Portal B2B permite a clientes empresariales acceder a un entorno comercial donde pueden consultar productos, gestionar pedidos y dar seguimiento a sus operaciones de compra.
              </p>
              <p>
                La solución está orientada a facilitar la relación comercial entre empresas y proveedores dentro de un entorno controlado.
              </p>
              <p>
                El acceso al entorno B2B se realiza mediante solicitud y autorización, sin costo de suscripción.
              </p>
            </div>

            <div class="list-panel">
              <h3>Funcionalidades principales</h3>
              <ul>
                <li v-for="item in b2bFeatures" :key="item">{{ item }}</li>
              </ul>
            </div>
          </div>

          <div class="cta-row" style="margin-top: 28px;">
            <a :href="b2bUrl" target="_blank" rel="noopener noreferrer" class="primary-button large">Solicitar acceso B2B</a>
          </div>
        </div>
      </section>

      <section id="backoffice" class="section">
        <div class="container">
          <div class="section-heading left">
            <span class="eyebrow">Gestión interna</span>
            <h2>El centro operativo para administrar el negocio.</h2>
          </div>

          <div class="business-layout">
            <div class="business-copy">
              <p>
                El Backoffice concentra las herramientas necesarias para administrar y supervisar la operación empresarial detrás del entorno comercial.
              </p>
              <p>
                No es un segundo portal comercial: es el entorno desde el cual se controla la operación.
              </p>
            </div>

            <div class="list-panel">
              <h3>Áreas principales</h3>
              <ul>
                <li v-for="item in backofficeAreas" :key="item">{{ item }}</li>
              </ul>
            </div>
          </div>

          <div class="cta-row" style="margin-top: 28px;">
            <a :href="managementUrl" target="_blank" rel="noopener noreferrer" class="primary-button large">Conocer la gestión empresarial</a>
          </div>
        </div>
      </section>

      <section id="servicios" class="services-section section">
        <div class="container">
          <div class="section-heading">
            <span class="eyebrow">Servicios a medida</span>
            <h2>Desarrollo, integración y tecnología pensada para escalar.</h2>
          </div>

          <div class="services-grid">
            <article v-for="service in services" :key="service.title" class="service-card">
              <span class="service-index">{{ service.index }}</span>
              <h3>{{ service.title }}</h3>
              <p>{{ service.description }}</p>
              <ul>
                <li v-for="item in service.items" :key="item">{{ item }}</li>
              </ul>
            </article>
          </div>
        </div>
      </section>

      <section class="section dark-section">
        <div class="container">
          <div class="section-heading left">
            <span class="eyebrow">Relación entre B2B y gestión interna</span>
            <h2>Ambas áreas forman parte del mismo ecosistema tecnológico.</h2>
          </div>

          <div class="module-differentiation-grid">
            <div class="module-differentiation-card module-membership">
              <span class="eyebrow light">Portal B2B</span>
              <h3>Cliente B2B</h3>
              <p>Accede a productos, pedidos y seguimiento comercial dentro de un entorno controlado.</p>
            </div>
            <div class="module-differentiation-card module-b2b">
              <span class="eyebrow light">Backoffice</span>
              <h3>Operación interna</h3>
              <p>Administra proveedores, pedidos, sincronización, facturación y métricas del negocio.</p>
            </div>
          </div>

          <div class="differentiators" style="margin-top: 24px;">
            <div class="diff-item">Operación comercial</div>
            <div class="diff-item">Proveedores</div>
            <div class="diff-item">Pedidos</div>
            <div class="diff-item">Servicios</div>
          </div>
        </div>
      </section>

      <section class="stats">
        <div class="container stats-grid">
          <div v-for="item in stats" :key="item.label" class="stat-card">
            <strong>{{ item.value }}</strong>
            <span>{{ item.label }}</span>
          </div>
        </div>
      </section>

      <section id="demo" class="cta-section demo-section">
        <div class="container cta-box demo-box">
          <div class="demo-copy">
            <span class="eyebrow">¿Necesitas una solución?</span>
            <h2>¿Quieres operar, vender y crecer con una estructura tecnológica clara?</h2>
            <p>
              Lemarquet combina solución B2B, gestión interna y servicios a medida para resolver necesidades reales de operación, comercio y tecnología.
            </p>
            <ul class="demo-list">
              <li>Solución B2B para clientes empresariales</li>
              <li>Gestión interna para controlar la operación</li>
              <li>Desarrollo a medida para proyectos específicos</li>
            </ul>
          </div>

          <div class="cta-actions">
            <a :href="b2bUrl" target="_blank" rel="noopener noreferrer" class="primary-button large">Conocer solución B2B</a>
            <a :href="managementUrl" target="_blank" rel="noopener noreferrer" class="secondary-button large">Conocer gestión interna</a>
          </div>
        </div>
      </section>
    </main>
  </div>
</template>
