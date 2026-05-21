<template>
  <div class="page">
    <div class="container">
      <div class="icon-circle">
        <i class="pi pi-clock"></i>
      </div>
      <h1>Aguardando aprovação</h1>
      <p>
        O estabelecimento foi notificado. Quando aprovarem, você recebe a confirmação por
        e-mail e WhatsApp.
      </p>

      <Card class="info-card">
        <template #content>
          <div class="info-row flex justify-content-between align-items-center py-2">
            <span class="label">Limite</span>
            <strong>60 minutos</strong>
          </div>
          <Divider />
          <div class="info-row flex justify-content-between align-items-center py-2">
            <span class="label">Status</span>
            <Tag value="Pendente" severity="warn" />
          </div>
        </template>
      </Card>

      <Button label="Ver minhas reservas" outlined size="large" class="cta" @click="navigateTo('/minhas-reservas')" />
      <Button label="Voltar pra página inicial" text size="small" @click="navigateTo(`/r/${slug}`)" />
    </div>
  </div>
</template>

<script setup lang="ts">
const route = useRoute();
const slug = route.params.slug as string;
</script>

<style scoped>
.page {
  min-height: 80dvh;
  display: flex; align-items: center; justify-content: center;
  padding: 1.5rem;
}
.container {
  text-align: center;
  max-width: 380px;
}
.icon-circle {
  display: inline-flex;
  align-items: center; justify-content: center;
  width: 96px; height: 96px;
  background: linear-gradient(135deg, #FFE8CC, #FED7AA);
  color: #C2410C;
  border-radius: 50%;
  font-size: 2.5rem;
  margin-bottom: 1.5rem;
}
h1 { margin: 0 0 0.75rem; font-size: 1.5rem; }
p {
  color: var(--p-text-color-secondary);
  font-size: 0.95rem;
  line-height: 1.6;
  margin: 0 0 1.5rem;
}

.info-card {
  margin-bottom: 1.5rem;
  text-align: left;
}
.label { font-size: 0.85rem; color: var(--p-text-color-secondary); }

.cta { width: 100%; margin-bottom: 0.5rem; }
</style>
