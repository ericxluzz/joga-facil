<template>
  <div>
    <h1 style="font-size: 1.5rem; margin: 0 0 0.5rem; text-align: center; color: var(--p-text-color);">
      Acesse sua conta
    </h1>
    <p style="margin: 0 0 2rem; color: var(--p-text-color-secondary); text-align: center; font-size: 0.95rem;">
      Informe suas credenciais para acessar o painel.
    </p>

    <form @submit.prevent="onSubmit" class="flex flex-col gap-4">
      <div class="flex flex-col gap-2">
        <label for="email" style="font-size: 0.875rem; font-weight: 500; color: var(--p-text-color);">E-mail Corporativo</label>
        <InputText
          id="email"
          v-model="email"
          type="email"
          placeholder="voce@empresa.com.br"
          required
          class="w-full"
        />
      </div>

      <div class="flex flex-col gap-2">
        <div class="flex justify-between items-center">
          <label for="password" style="font-size: 0.875rem; font-weight: 500; color: var(--p-text-color);">Senha</label>
          <NuxtLink to="/esqueci-minha-senha" style="font-size: 0.8rem; color: var(--p-primary-color); text-decoration: none; font-weight: 500;">
            Esqueceu a senha?
          </NuxtLink>
        </div>
        <Password
          id="password"
          v-model="password"
          placeholder="••••••••"
          :feedback="false"
          toggleMask
          required
          inputClass="w-full"
          class="w-full"
        />
      </div>

      <Button
        type="submit"
        :loading="loading"
        label="Entrar na Plataforma"
        icon="pi pi-sign-in"
        class="w-full mt-2"
        size="large"
      />
    </form>

    <Message v-if="message" :severity="messageType" class="mt-4">
      {{ message }}
    </Message>

    <Divider align="center" class="my-4">
      <span style="color: var(--p-text-color-secondary); font-size: 0.85rem;">ou entre com</span>
    </Divider>

    <div class="flex gap-3 w-full mb-4">
      <button
        type="button"
        class="social-btn"
        @click="loginWithGoogle"
      >
        <svg class="social-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
        </svg>
        <span>Google</span>
      </button>
      <button
        type="button"
        class="social-btn"
        @click="loginWithApple"
      >
        <svg class="social-icon" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
          <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 4.17c.66-.81 1.11-1.93.99-3.06-1 .04-2.21.67-2.93 1.49-.62.69-1.16 1.84-1.01 2.96 1.12.09 2.27-.58 2.95-1.39z"/>
        </svg>
        <span>Apple</span>
      </button>
    </div>

    <p style="font-size: 0.9rem; color: var(--p-text-color); text-align: center; margin: 0;">
      Ainda não é parceiro? 
      <NuxtLink to="/cadastro" style="color: var(--p-primary-color); font-weight: 600; text-decoration: none;">
        Solicite sua conta
      </NuxtLink>
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import InputText from 'primevue/inputtext';
import Password from 'primevue/password';
import Button from 'primevue/button';
import Message from 'primevue/message';
import Divider from 'primevue/divider';
import { useSupabaseClient, useRuntimeConfig, navigateTo, definePageMeta } from '#imports';

definePageMeta({ layout: 'auth' });

const supabase = useSupabaseClient();
const config = useRuntimeConfig();
const email = ref('');
const password = ref('');
const loading = ref(false);
const message = ref('');
const messageType = ref<'success' | 'error'>('success');

async function onSubmit() {
  loading.value = true;
  message.value = '';

  if (config.public.mockAuth) {
    await new Promise(r => setTimeout(r, 500));
    await navigateTo('/dashboard');
    loading.value = false;
    return;
  }

  const { error } = await supabase.auth.signInWithPassword({
    email: email.value,
    password: password.value,
  });

  loading.value = false;
  if (error) {
    messageType.value = 'error';
    message.value = 'Credenciais inválidas. Tente novamente.';
  } else {
    navigateTo('/dashboard');
  }
}

async function loginWithGoogle() {
  if (config.public.mockAuth) {
    navigateTo('/dashboard');
    return;
  }
  await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/dashboard`
    }
  });
}

async function loginWithApple() {
  if (config.public.mockAuth) {
    navigateTo('/dashboard');
    return;
  }
  await supabase.auth.signInWithOAuth({
    provider: 'apple',
    options: {
      redirectTo: `${window.location.origin}/dashboard`
    }
  });
}
</script>

<style scoped>
.flex { display: flex; }
.flex-col { flex-direction: column; }
.gap-2 { gap: 0.5rem; }
.gap-3 { gap: 0.75rem; }
.gap-4 { gap: 1rem; }
.justify-between { justify-content: space-between; }
.items-center { align-items: center; }
.w-full { width: 100%; }
.mt-2 { margin-top: 0.5rem; }
.mt-4 { margin-top: 1rem; }
.mb-4 { margin-bottom: 1rem; }
.my-4 { margin-top: 1rem; margin-bottom: 1rem; }
:deep(.p-password input) { width: 100%; }

/* Estilização Premium dos Botões de Login Social */
.social-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.6rem;
  width: 100%;
  padding: 0.65rem 1rem; /* Mais fino e alinhado */
  background-color: var(--p-surface-0);
  border: 1px solid var(--p-surface-200);
  border-radius: 8px;
  color: var(--p-text-color);
  font-family: 'Poppins', sans-serif;
  font-weight: 500;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.social-btn:hover {
  background-color: var(--p-surface-50);
  border-color: var(--p-surface-300);
}

.social-btn:focus {
  outline: none;
  border-color: var(--p-primary-500);
  box-shadow: 0 0 0 3px var(--p-primary-50);
}

.social-icon {
  width: 1.15rem;
  height: 1.15rem;
  flex-shrink: 0;
}
</style>
