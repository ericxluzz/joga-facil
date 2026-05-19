<template>
  <div>
    <h1 style="font-size: 1.5rem; margin: 0 0 0.5rem; text-align: center; color: var(--p-text-color);">
      Recuperar acesso
    </h1>
    <p style="margin: 0 0 2rem; color: var(--p-text-color-secondary); text-align: center; font-size: 0.95rem;">
      Informe seu e-mail e enviaremos um link para redefinir a senha.
    </p>

    <form @submit.prevent="onSubmit" class="flex flex-col gap-4">
      <div class="flex flex-col gap-2">
        <label for="email" style="font-size: 0.875rem; font-weight: 500; color: var(--p-text-color);">E-mail</label>
        <InputText
          id="email"
          v-model="email"
          type="email"
          placeholder="voce@empresa.com.br"
          required
          class="w-full"
        />
      </div>

      <Button
        type="submit"
        :loading="loading"
        label="Enviar link de redefinição"
        icon="pi pi-envelope"
        class="w-full mt-2"
        size="large"
      />
    </form>

    <Message v-if="message" :severity="messageType" class="mt-4">
      {{ message }}
    </Message>

    <p style="font-size: 0.9rem; color: var(--p-text-color); text-align: center; margin: 2rem 0 0;">
      Lembrou a senha?
      <NuxtLink to="/login" style="color: var(--p-primary-color); font-weight: 600; text-decoration: none;">
        Voltar para o login
      </NuxtLink>
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import InputText from 'primevue/inputtext';
import Button from 'primevue/button';
import Message from 'primevue/message';

definePageMeta({ layout: 'auth' });

const supabase = useSupabaseClient();
const config = useRuntimeConfig();
const email = ref('');
const loading = ref(false);
const message = ref('');
const messageType = ref<'success' | 'error'>('success');

async function onSubmit() {
  loading.value = true;
  message.value = '';

  if (config.public.mockAuth) {
    await new Promise(r => setTimeout(r, 700));
    messageType.value = 'success';
    message.value = 'Modo mock: o e-mail seria enviado em produção.';
    loading.value = false;
    return;
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email.value, {
    redirectTo: `${window.location.origin}/auth/callback?reset=1`,
  });

  loading.value = false;
  if (error) {
    messageType.value = 'error';
    message.value = error.message;
  } else {
    messageType.value = 'success';
    message.value = 'Link enviado. Verifique seu e-mail (e o spam).';
  }
}
</script>

<style scoped>
.flex { display: flex; }
.flex-col { flex-direction: column; }
.gap-2 { gap: 0.5rem; }
.gap-4 { gap: 1rem; }
.w-full { width: 100%; }
.mt-2 { margin-top: 0.5rem; }
.mt-4 { margin-top: 1rem; }
</style>
