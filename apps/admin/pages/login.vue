<template>
  <div class="login-page">
    <div class="login-card">
      <h1>Admin — Joga Fácil</h1>
      <p class="sub">Acesso restrito a administradores da plataforma</p>
      <div v-if="reason === 'unauthorized'" class="error-notice">
        Sem permissão de administrador.
      </div>
      <div class="field">
        <label>E-mail</label>
        <input v-model="email" type="email" placeholder="admin@jogafacil.com" @keydown.enter="login" />
      </div>
      <div class="field">
        <label>Senha</label>
        <input v-model="password" type="password" placeholder="••••••••" @keydown.enter="login" />
      </div>
      <div v-if="error" class="error-notice">{{ error }}</div>
      <button class="btn-login" :disabled="loading" @click="login">
        <span v-if="loading">Entrando...</span>
        <span v-else>Entrar</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: false });

const route = useRoute();
const reason = route.query.reason as string | undefined;
const supabase = useSupabaseClient();
const email = ref('');
const password = ref('');
const loading = ref(false);
const error = ref('');

async function login() {
  loading.value = true;
  error.value = '';
  const { error: err } = await supabase.auth.signInWithPassword({
    email: email.value,
    password: password.value,
  });
  if (err) {
    error.value = err.message;
    loading.value = false;
    return;
  }
  await navigateTo('/dashboard');
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f1f5f9;
}
.login-card {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  padding: 2.5rem;
  width: 360px;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
h1 { font-size: 1.25rem; font-weight: 700; color: #0f172a; margin: 0; }
.sub { font-size: 0.875rem; color: #64748b; margin: -0.5rem 0 0; }
.error-notice {
  background: #fef2f2;
  border: 1px solid #fca5a5;
  color: #991b1b;
  border-radius: 8px;
  padding: 0.625rem 0.875rem;
  font-size: 0.875rem;
}
.field { display: flex; flex-direction: column; gap: 0.375rem; }
.field label { font-size: 0.8125rem; font-weight: 600; color: #374151; }
.field input {
  padding: 0.625rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 0.875rem;
  outline: none;
}
.field input:focus { border-color: #0f172a; }
.btn-login {
  padding: 0.75rem;
  background: #0f172a;
  color: #fff;
  border: none;
  border-radius: 10px;
  font-size: 0.9375rem;
  font-weight: 700;
  cursor: pointer;
  font-family: inherit;
}
.btn-login:hover { background: #1e293b; }
.btn-login:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
