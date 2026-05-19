<template>
  <div class="landing">
    <div v-if="loadingTenant" class="loading">
      <Skeleton width="100%" height="220px" />
      <div style="padding: 1.5rem;">
        <Skeleton width="70%" height="28px" class="mb-2" />
        <Skeleton width="50%" height="18px" class="mb-3" />
        <Skeleton width="100%" height="60px" />
      </div>
    </div>

    <template v-else-if="tenant">
      <!-- Hero -->
      <div class="hero">
        <div class="hero-photo" :style="photoStyle"></div>
        <button class="back-floating" @click="$router.back()" v-if="canGoBack">
          <i class="pi pi-arrow-left"></i>
        </button>
      </div>

      <!-- Card flutuante de informações -->
      <div class="info-card">
        <div class="header-tenant-info">
          <div v-if="tenant.settings?.logoUrl" class="tenant-logo" :style="{ backgroundImage: `url(${tenant.settings.logoUrl})` }"></div>
          <div class="tenant-texts">
            <h1 class="name">{{ tenant.name }}</h1>
            <p v-if="tenant.address" class="address">
              <i class="pi pi-map-marker" /> {{ tenant.address }}
            </p>
          </div>
        </div>

        <Button
          label="Reservar agora"
          icon="pi pi-calendar-plus"
          size="large"
          class="cta"
          @click="goToBooking"
        />
      </div>

      <!-- Descrição -->
      <section v-if="tenant.description" class="content-section card-section">
        <h2 class="section-title">Sobre</h2>
        <p class="description">{{ tenant.description }}</p>
      </section>

      <!-- Quadras -->
      <section v-if="tenant.resources?.length" class="content-section card-section">
        <h2 class="section-title">Quadras disponíveis</h2>
        <div class="chips">
          <span v-for="r in tenant.resources" :key="r.id" class="chip">
            <i class="pi pi-objects-column" />
            {{ r.name }}
          </span>
        </div>
      </section>

      <!-- Política -->
      <section class="content-section card-section">
        <h2 class="section-title">Política de cancelamento</h2>
        <p class="description">{{ tenant.cancellationPolicy }}</p>
      </section>

      <!-- Contato -->
      <section v-if="tenant.whatsapp || tenant.instagram" class="content-section card-section">
        <h2 class="section-title">Em caso de dúvidas</h2>
        <div class="contacts">
          <a v-if="tenant.whatsapp" :href="`https://wa.me/${tenant.whatsapp}`" class="contact" target="_blank">
            <i class="pi pi-whatsapp" /> WhatsApp
          </a>
          <a v-if="tenant.instagram" :href="`https://instagram.com/${tenant.instagram.replace('@','')}`" class="contact" target="_blank">
            <i class="pi pi-instagram" /> Instagram ({{ tenant.instagram }})
          </a>
        </div>
      </section>

      <footer class="footer">
        <span>Powered by <strong>Agenda-Slim</strong></span>
      </footer>
    </template>

    <div v-else class="error-state">
      <i class="pi pi-exclamation-triangle"></i>
      <h2>Estabelecimento não encontrado</h2>
      <p>Verifique o link e tente novamente.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import Button from 'primevue/button';
import Skeleton from 'primevue/skeleton';

const route = useRoute();
const router = useRouter();
const slug = route.params.slug as string;

const { tenant, loadingTenant, fetchTenant } = useReserva();

onMounted(async () => {
  await fetchTenant(slug);
});

const canGoBack = computed(() => router.options.history.state.back);

const photoStyle = computed(() =>
  tenant.value?.photoUrl
    ? { backgroundImage: `url(${tenant.value.photoUrl})` }
    : { background: 'linear-gradient(135deg, var(--p-primary-400), var(--p-primary-600))' },
);

function goToBooking() {
  navigateTo(`/r/${slug}/reservar`);
}
</script>

<style scoped>
.landing { padding-bottom: 2rem; }

.hero {
  position: relative;
  height: 240px;
}
.hero-photo {
  width: 100%;
  height: 100%;
  background-size: cover;
  background-position: center;
}
.back-floating {
  position: absolute;
  top: 1rem;
  left: 1rem;
  width: 40px; height: 40px;
  border-radius: 50%;
  background: rgba(255,255,255,0.95);
  border: none;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
  color: var(--p-text-color);
}

.info-card {
  background: var(--p-surface-0);
  margin: -2.5rem 1rem 0;
  padding: 1.5rem;
  border-radius: 1.25rem;
  position: relative;
  z-index: 2;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.05);
  border: 1px solid var(--p-surface-100);
}
.header-tenant-info {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.25rem;
}
.tenant-logo {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background-size: cover;
  background-position: center;
  border: 2px solid var(--p-surface-0);
  box-shadow: 0 4px 12px rgba(0,0,0,0.08);
  flex-shrink: 0;
}
.tenant-texts {
  display: flex;
  flex-direction: column;
  justify-content: center;
}
.name { margin: 0; font-size: 1.35rem; font-weight: 700; color: var(--p-text-color); line-height: 1.2; }
.address {
  margin: 0.25rem 0 0;
  font-size: 0.85rem;
  color: var(--p-text-color-secondary);
  display: flex; align-items: center; gap: 0.375rem;
}
.cta { width: 100%; border-radius: 12px; font-weight: 600; }

.content-section { padding: 0; }
.card-section {
  background: var(--p-surface-0);
  margin: 1rem 1rem 0;
  padding: 1.25rem;
  border-radius: 1.25rem;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.02);
  border: 1px solid var(--p-surface-100);
}
.section-title {
  font-size: 0.95rem;
  font-weight: 600;
  margin: 0 0 0.5rem;
  color: var(--p-text-color);
}
.description {
  font-size: 0.9rem;
  color: var(--p-text-color-secondary);
  line-height: 1.55;
  margin: 0;
}

.chips { display: flex; flex-wrap: wrap; gap: 0.5rem; }
.chip {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  background: var(--p-primary-50);
  color: var(--p-primary-700);
  padding: 0.375rem 0.75rem;
  border-radius: 999px;
  font-size: 0.85rem;
  font-weight: 500;
}

.contacts { display: flex; flex-direction: column; gap: 0.5rem; }
.contact {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--p-primary-600);
  text-decoration: none;
  font-weight: 500;
  font-size: 0.9rem;
}

.footer {
  text-align: center;
  padding: 2rem 1rem;
  font-size: 0.75rem;
  color: var(--p-surface-400);
}

.loading { padding: 0; }
.mb-2 { margin-bottom: 0.5rem; }
.mb-3 { margin-bottom: 1rem; }

.error-state {
  padding: 4rem 1.5rem;
  text-align: center;
  color: var(--p-text-color-secondary);
}
.error-state i { font-size: 3rem; color: var(--p-surface-400); margin-bottom: 1rem; }
.error-state h2 { font-size: 1.25rem; margin: 0 0 0.5rem; color: var(--p-text-color); }
.error-state p { font-size: 0.9rem; margin: 0; }
</style>
