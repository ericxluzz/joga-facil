<template>
  <div class="ob-wrap">
    <div class="ob-card">
      <div class="ob-logo">
        <AppLogo :size="44" />
        <h1 class="ob-title">Bem-vindo ao Joga Fácil</h1>
        <p class="ob-subtitle">Como se chama o seu estabelecimento?</p>
      </div>

      <div class="ob-form">
        <div class="ob-field">
          <label for="ob-name">Nome do estabelecimento <span class="required">*</span></label>
          <InputText
            id="ob-name"
            v-model="name"
            placeholder="Ex: Arena do Zé, Society Paulista…"
            class="w-full"
            autofocus
            @keyup.enter="name.trim() && save()"
          />
        </div>

        <div class="ob-field">
          <label for="ob-type">Modalidade principal</label>
          <Select
            id="ob-type"
            v-model="type"
            :options="typeOptions"
            optionLabel="label"
            optionValue="value"
            placeholder="Selecione a modalidade"
            class="w-full"
          />
        </div>
      </div>

      <Message v-if="error" severity="error" :closable="false" class="mb-3">{{ error }}</Message>

      <Button
        label="Criar estabelecimento"
        icon="pi pi-arrow-right"
        iconPos="right"
        fluid
        size="large"
        :loading="saving"
        :disabled="!name.trim()"
        @click="save"
      />

      <p class="ob-hint">
        Você pode completar as demais configurações (quadras, horários, serviços) depois, em <strong>Configurações</strong>.
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Message from 'primevue/message';
import Select from 'primevue/select';
import { useSupabaseClient } from '#imports';

definePageMeta({ layout: 'onboarding' });

const name = ref('');
const type = ref('society');
const saving = ref(false);
const error = ref('');

const typeOptions = [
  { label: 'Society', value: 'society' },
  { label: 'Futsal', value: 'futsal' },
  { label: 'Padel', value: 'padel' },
  { label: 'Beach Tennis', value: 'beach_tennis' },
  { label: 'Tênis', value: 'tennis' },
  { label: 'Vôlei de praia', value: 'beach_volleyball' },
  { label: 'Outro', value: 'outro' },
];

const supabase = useSupabaseClient();
const { createTenant } = useTenant();

onMounted(async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    await navigateTo('/login');
  }
});

async function save() {
  if (!name.value.trim()) return;
  error.value = '';
  saving.value = true;

  try {
    const slug = name.value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48);

    await createTenant({
      name: name.value.trim(),
      slug,
      type: type.value,
    });

    await navigateTo('/painel');
  } catch (err: any) {
    error.value = err?.data?.message || 'Erro ao criar estabelecimento. Tente novamente.';
  } finally {
    saving.value = false;
  }
}
</script>

<style scoped>
.ob-wrap {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem 1rem;
  background: var(--p-surface-50);
}

.ob-card {
  width: 100%;
  max-width: 440px;
  background: var(--p-surface-0);
  border: 1px solid var(--p-surface-200);
  border-radius: 16px;
  padding: 2.5rem 2rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.ob-logo {
  text-align: center;
}

.ob-title {
  font-size: 1.4rem;
  font-weight: 700;
  margin: 0.75rem 0 0;
  color: var(--p-text-color);
  letter-spacing: -0.01em;
}

.ob-subtitle {
  font-size: 0.9rem;
  color: var(--p-text-color-secondary);
  margin: 0.3rem 0 0;
}

.ob-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.ob-field {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.ob-field label {
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--p-text-color);
}

.required {
  color: var(--p-red-500, #ef4444);
}

.w-full { width: 100%; }

.ob-hint {
  font-size: 0.78rem;
  color: var(--p-text-color-secondary);
  text-align: center;
  margin: 0;
  line-height: 1.5;
}

@media (max-width: 480px) {
  .ob-card {
    padding: 1.75rem 1.25rem;
  }
}
</style>
