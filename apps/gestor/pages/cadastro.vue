<template>
  <div>
    <h1 style="font-size: 1.5rem; margin: 0 0 0.5rem; text-align: center; color: var(--p-text-color);">
      Solicite sua conta
    </h1>
    <p style="margin: 0 0 2rem; color: var(--p-text-color-secondary); text-align: center; font-size: 0.95rem;">
      Preencha os dados abaixo para criar sua conta de parceiro.
    </p>

    <form @submit.prevent="onSubmit" class="flex flex-col gap-4">
      <div class="flex flex-col gap-2">
        <label for="name" style="font-size: 0.875rem; font-weight: 500; color: var(--p-text-color);">Nome Completo ou Razão Social</label>
        <InputText
          id="name"
          v-model="form.name"
          placeholder="Ex: Quadras do Silva Ltda"
          required
          class="w-full"
        />
      </div>

      <div class="flex gap-4 mobile-col">
        <div class="flex flex-col gap-2 w-full">
          <label for="document" style="font-size: 0.875rem; font-weight: 500; color: var(--p-text-color);">CPF ou CNPJ</label>
          <InputText
            id="document"
            v-model="form.document"
            placeholder="Apenas números"
            required
            class="w-full"
          />
        </div>
        <div class="flex flex-col gap-2 w-full">
          <label for="phone" style="font-size: 0.875rem; font-weight: 500; color: var(--p-text-color);">WhatsApp / Telefone</label>
          <InputMask
            id="phone"
            v-model="form.phone"
            mask="(99) 99999-9999"
            placeholder="(11) 90000-0000"
            required
            class="w-full"
          />
        </div>
      </div>

      <div class="flex flex-col gap-2">
        <label for="email" style="font-size: 0.875rem; font-weight: 500; color: var(--p-text-color);">E-mail Corporativo</label>
        <InputText
          id="email"
          v-model="form.email"
          type="email"
          placeholder="voce@empresa.com.br"
          required
          class="w-full"
        />
      </div>

      <div class="flex flex-col gap-2">
        <label for="password" style="font-size: 0.875rem; font-weight: 500; color: var(--p-text-color);">Senha de Acesso</label>
        <Password
          id="password"
          v-model="form.password"
          placeholder="Crie uma senha forte"
          toggleMask
          required
          inputClass="w-full"
          class="w-full"
          promptLabel="Digite uma senha"
          weakLabel="Fraca"
          mediumLabel="Média"
          strongLabel="Forte"
        />
      </div>

      <div class="flex items-start gap-2 mt-2">
        <Checkbox v-model="form.terms" inputId="terms" :binary="true" required />
        <label for="terms" style="font-size: 0.8rem; color: var(--p-text-color-secondary); line-height: 1.4;">
          Declaro que li e concordo com os 
          <a href="#" style="color: var(--p-primary-color); text-decoration: none;">Termos de Uso</a> e 
          <a href="#" style="color: var(--p-primary-color); text-decoration: none;">Política de Privacidade</a>.
        </label>
      </div>

      <Button
        type="submit"
        :loading="loading"
        label="Criar Minha Conta"
        icon="pi pi-user-plus"
        class="w-full mt-2"
        size="large"
      />
    </form>

    <Message v-if="message" :severity="messageType" class="mt-4">
      {{ message }}
    </Message>

    <Divider align="center" class="my-4">
      <span style="color: var(--p-text-color-secondary); font-size: 0.85rem;">ou</span>
    </Divider>

    <p style="font-size: 0.9rem; color: var(--p-text-color); text-align: center; margin: 0;">
      Já possui uma conta? 
      <NuxtLink to="/login" style="color: var(--p-primary-color); font-weight: 600; text-decoration: none;">
        Faça login
      </NuxtLink>
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';
import InputText from 'primevue/inputtext';
import InputMask from 'primevue/inputmask';
import Password from 'primevue/password';
import Button from 'primevue/button';
import Checkbox from 'primevue/checkbox';
import Message from 'primevue/message';
import Divider from 'primevue/divider';
import { useSupabaseClient, useRuntimeConfig, navigateTo, definePageMeta, useFetch } from '#imports';

definePageMeta({ layout: 'auth' });

const supabase = useSupabaseClient();
const config = useRuntimeConfig();

const form = reactive({
  name: '',
  document: '',
  phone: '',
  email: '',
  password: '',
  terms: false,
});

const loading = ref(false);
const message = ref('');
const messageType = ref<'success' | 'error'>('success');

async function onSubmit() {
  if (!form.terms) {
    messageType.value = 'error';
    message.value = 'Você deve aceitar os termos de uso.';
    return;
  }

  loading.value = true;
  message.value = '';

  if (config.public.mockAuth) {
    await new Promise(r => setTimeout(r, 800));
    await navigateTo('/onboarding');
    loading.value = false;
    return;
  }

  try {
    const result = await $fetch<{ access_token?: string; refresh_token?: string; needsConfirmation?: boolean }>(
      '/api/auth/signup',
      {
        method: 'POST',
        body: {
          email: form.email,
          password: form.password,
          name: form.name,
          document: form.document,
          phone: form.phone,
        },
      },
    );

    if (result.needsConfirmation) {
      messageType.value = 'success';
      message.value = 'Conta criada! Verifique seu e-mail para confirmar o cadastro e depois faça login.';
      loading.value = false;
      return;
    }

    // Servidor retornou os tokens — define a sessão no cliente diretamente
    if (result.access_token && result.refresh_token) {
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: result.access_token,
        refresh_token: result.refresh_token,
      });

      loading.value = false;

      if (sessionError) {
        messageType.value = 'error';
        message.value = 'Conta criada, mas não foi possível entrar automaticamente. Faça login.';
        return;
      }

      await navigateTo('/onboarding');
      return;
    }

    loading.value = false;
    messageType.value = 'error';
    message.value = 'Resposta inesperada do servidor. Tente fazer login.';
  } catch (err: any) {
    loading.value = false;
    messageType.value = 'error';
    message.value = err?.data?.message || err?.message || 'Erro ao criar conta';
  }
}
</script>

<style scoped>
.flex { display: flex; }
.flex-col { flex-direction: column; }
.gap-2 { gap: 0.5rem; }
.gap-4 { gap: 1rem; }
.items-start { align-items: flex-start; }
.w-full { width: 100%; }
.mt-2 { margin-top: 0.5rem; }
.mt-4 { margin-top: 1rem; }
.my-4 { margin-top: 1rem; margin-bottom: 1rem; }
:deep(.p-password input) { width: 100%; }

@media (max-width: 480px) {
  .mobile-col {
    flex-direction: column;
  }
}
</style>
