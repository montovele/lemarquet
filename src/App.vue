<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import SupportDesk from './SupportDesk.vue'
import CustomerChat from './CustomerChat.vue'

const showScrollTop = ref(false)
const isSupportDesk = ref(window.location.hash === '#/atencion')
const isMobileMenuOpen = ref(false)

const handleScroll = () => {
  showScrollTop.value = window.scrollY > 400
}

const scrollToTop = () => {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

const closeMobileMenu = () => {
  isMobileMenuOpen.value = false
}

const handleHashChange = () => {
  isSupportDesk.value = window.location.hash === '#/atencion'
  closeMobileMenu()
  if (isSupportDesk.value) {
    window.scrollTo({ top: 0 })
  }
}

const leaveSupportDesk = () => {
  window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`)
  isSupportDesk.value = false
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
  window.addEventListener('hashchange', handleHashChange)
  handleScroll()
})

onBeforeUnmount(() => {
  window.removeEventListener('scroll', handleScroll)
  window.removeEventListener('hashchange', handleHashChange)
})

const b2bUrl = import.meta.env.VITE_SOLICITUD_URL_B2B || '#'
const demoUrl = import.meta.env.VITE_SOLICITUD_DEMO_URL || '#'
const managementUrl = import.meta.env.VITE_SOLICITUD_SUBSCRIPTION_URL || '#'
const projectUrl = import.meta.env.VITE_CONTACT_URL || demoUrl

const navItems = [
  { label: 'Ecosistema', href: '#ecosistema' },
  { label: 'Vende y gestiona', href: '#vende-sin-inventario' },
  { label: 'Solución B2B', href: '#b2b' },
  { label: 'Servicios', href: '#servicios' },
  { label: 'Portafolio', href: '#portafolio' }
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

const portfolioProjects = [
  {
    name: 'LEMARQUET POS',
    category: 'Software de gestión · Punto de venta',
    description: 'Un punto de venta para comercios que reúne el cobro y la administración diaria. Permite registrar ventas, controlar aperturas y arqueos de caja, revisar existencias y consultar reportes desde un solo sistema.',
    highlights: ['Ventas y cobro', 'Caja e inventario', 'Reportes operativos'],
    url: 'https://pos.ssaxxon.com/',
    theme: 'commerce',
    image: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=1400&q=85',
    imageAlt: 'Cobro en el mostrador de un comercio',
    signature: 'Vende con agilidad. Administra con claridad.'
  },
  {
    name: 'Entremomentos',
    category: 'Comunidad digital · Red social',
    description: 'Un espacio personal para guardar y compartir historias, fotografías y momentos cotidianos. La experiencia invita a volver a los recuerdos y mantenerse cerca de la propia comunidad, con opciones para crear una cuenta o explorar.',
    highlights: ['Historias y fotografías', 'Espacio personal', 'Exploración pública'],
    url: 'https://social-media.ssaxxon.com/explore',
    theme: 'memories',
    image: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=1400&q=85',
    imageAlt: 'Sendero soleado entre los árboles, imagen de portada de Entremomentos',
    signature: 'Tus días siguen aquí.'
  },
  {
    name: 'Holi Places',
    category: 'Plataforma comunitaria · Congregaciones',
    description: 'Una plataforma para descubrir lo que sucede en las congregaciones: sedes, encuentros, áreas de participación e historias. Reúne la información pública de cada comunidad y ayuda a las personas a encontrar un espacio donde participar.',
    highlights: ['Sedes y agenda', 'Áreas de participación', 'Historias y actividades'],
    url: 'https://holi-places.ssaxxon.com/',
    theme: 'community',
    image: 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&w=1400&q=85',
    imageAlt: 'Personas reunidas en una actividad comunitaria, imagen de portada de Holi Places',
    signature: 'Un lugar en la mesa para cada persona.'
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
  <SupportDesk v-if="isSupportDesk" @exit="leaveSupportDesk" />
  <div v-else class="page-shell">
    <button v-if="showScrollTop" class="scroll-top" aria-label="Volver arriba" @click="scrollToTop">
      ↑
    </button>

    <header class="topbar">
      <div class="container nav">
        <div class="brand">
          <img class="brand-mark" src="/navicon.png" alt="Lemarquet" />
        </div>

        <button
          class="mobile-menu-toggle"
          type="button"
          :aria-expanded="isMobileMenuOpen"
          aria-controls="primary-navigation"
          :aria-label="isMobileMenuOpen ? 'Cerrar menú' : 'Abrir menú'"
          @click="isMobileMenuOpen = !isMobileMenuOpen"
          @keydown.esc="closeMobileMenu"
        >
          <span></span>
          <span></span>
          <span></span>
        </button>

        <div
          id="primary-navigation"
          class="nav-menu"
          :class="{ 'is-open': isMobileMenuOpen }"
          @keydown.esc="closeMobileMenu"
        >
          <nav class="main-nav" aria-label="Navegación principal">
            <a v-for="link in navItems" :key="link.label" :href="link.href" @click="closeMobileMenu">{{ link.label }}</a>
          </nav>

          <a :href="b2bUrl" target="_blank" rel="noopener noreferrer" class="primary-button" @click="closeMobileMenu">Solicitar acceso B2B</a>
        </div>
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
              <button class="secondary-button large" @click="scrollToSection('vende-sin-inventario')">Vender y gestionar</button>
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

      <section id="vende-sin-inventario" class="section idea-section">
        <div id="backoffice" class="container idea-layout">
          <div class="idea-copy">
            <span class="eyebrow">Vende y gestiona desde un mismo entorno</span>
            <h2>Que tu próxima venta empiece con una idea, no con una bodega.</h2>
            <p>
              ¿Te ilusiona vender, pero te frena comprar mercancía antes de saber si habrá clientes? Con una suscripción a Lemarquet puedes acceder a herramientas para presentar productos y organizar pedidos, sin empezar acumulando inventario. Así puedes concentrarte en conectar con tus primeros clientes.
            </p>
            <p>
              Y cuando lleguen los pedidos, la gestión interna te ayuda a dar seguimiento a productos, proveedores y operación desde un mismo lugar. Los productos disponibles, el surtido y las condiciones comerciales dependerán del plan y de los acuerdos con cada proveedor.
            </p>
            <p>La suscripción da acceso a herramientas, no garantiza ganancias. Los ingresos dependen de las ventas, el margen, los costos y las condiciones comerciales aplicables.</p>
            <a :href="managementUrl" target="_blank" rel="noopener noreferrer" class="primary-button large">Conocer la suscripción</a>
          </div>

          <div class="list-panel">
            <h3>Gestión interna para acompañar tus ventas</h3>
            <ul>
              <li v-for="item in backofficeAreas" :key="item">{{ item }}</li>
            </ul>
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

      <section id="portafolio" class="section portfolio-section">
        <div class="container">
          <div class="section-heading">
            <span class="eyebrow">Proyectos seleccionados</span>
            <h2>Soluciones digitales diseñadas para resolver necesidades reales.</h2>
            <p class="portfolio-intro">Desde facilitar la operación de un negocio hasta acercar a las comunidades, creamos productos y experiencias digitales útiles para el día a día.</p>
          </div>

          <div class="portfolio-grid">
            <article v-for="(project, index) in portfolioProjects" :key="project.name" class="portfolio-card">
              <div class="portfolio-art" :class="`portfolio-art-${project.theme}`">
                <img :src="project.image" :alt="project.imageAlt" loading="lazy" decoding="async" />
                <span class="portfolio-art-index">0{{ index + 1 }} / PROYECTO</span>
                <span class="portfolio-signature">{{ project.signature }}</span>
              </div>
              <div class="portfolio-content">
                <span class="portfolio-category">{{ project.category }}</span>
                <h3>{{ project.name }}</h3>
                <p>{{ project.description }}</p>
                <ul class="portfolio-highlights">
                  <li v-for="highlight in project.highlights" :key="highlight">{{ highlight }}</li>
                </ul>
                <a :href="project.url" target="_blank" rel="noopener noreferrer" class="portfolio-link">
                  Explorar proyecto <span aria-hidden="true">↗</span>
                </a>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section class="section idea-section">
        <div class="container idea-layout">
          <div class="idea-copy">
            <span class="eyebrow">De una idea a un producto digital</span>
            <h2>Tu idea puede convertirse en un sistema con su propio modelo de ingresos.</h2>
            <p>
              Imagina una plataforma, comunidad, marketplace o herramienta creada alrededor de una necesidad que conoces bien. Podemos ayudarte a darle forma y desarrollar un sistema a la medida; si el proyecto lo necesita, también se puede incorporar una capa de monetización pensada desde el inicio.
            </p>
            <p>
              El modelo se define según el valor que entregas y la experiencia que quieres ofrecer, para que el producto y su forma de generar ingresos puedan crecer juntos.
            </p>
            <a href="#servicios" class="primary-button large">Explorar desarrollo a medida <span aria-hidden="true">↓</span></a>
          </div>

          <div class="idea-models">
            <span class="idea-models-label">Opciones que podemos explorar</span>
            <ul>
              <li><strong>Suscripciones</strong><span>Acceso recurrente a un servicio o comunidad.</span></li>
              <li><strong>Planes y niveles</strong><span>Beneficios y herramientas según cada tipo de usuario.</span></li>
              <li><strong>Funciones premium</strong><span>Capacidades adicionales para quienes las necesitan.</span></li>
            </ul>
            <p>El esquema se adapta a tu propuesta; no existe un modelo único para todas las ideas.</p>
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
    <CustomerChat :avoid-scroll-button="showScrollTop" />
  </div>
</template>
