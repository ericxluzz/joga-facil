<template>
  <div class="auth-wrapper">
    <!-- Lado Esquerdo: Formulário -->
    <div class="auth-left">
      <div class="auth-header">
        <div class="brand">
          <AppLogo :size="32" />
          <span class="brand-name">Joga Fácil</span>
        </div>
      </div>
      
      <div class="auth-content">
        <slot />
      </div>

      <div class="auth-footer">
        <span>Copyright © 2026 Joga Fácil. Todos os direitos reservados.</span>
        <div class="footer-links">
          <a href="#">Termos de Uso</a>
          <span class="separator">•</span>
          <a href="#">Política de Privacidade</a>
        </div>
      </div>
    </div>

    <!-- Lado Direito: Imagem da Arena -->
    <div class="auth-right">
      <div class="image-container">
        <img 
          src="https://images.unsplash.com/photo-1561554078-b9a19c6511d9?q=80&w=687&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" 
          alt="Arena Esportiva" 
        />
        <div class="image-overlay">
          <h2>Simplifique a gestão da sua quadra.</h2>
          <p>Faça login para acessar o painel de reservas, controle financeiro e gerenciar sua operação em tempo real.</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.auth-wrapper {
  display: flex;
  height: 100vh;
  background-color: var(--p-surface-0);
  font-family: var(--font-family, 'Inter', sans-serif);
  overflow: hidden;
}

.auth-left {
  width: 100%;
  display: flex;
  flex-direction: column;
  padding: 2rem;
  overflow-y: auto;
}

.auth-header {
  display: flex;
  justify-content: flex-start;
}

.brand {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-family: var(--font-heading, sans-serif);
  font-weight: 700;
  font-size: 1.25rem;
  color: var(--p-text-color);
}

.brand-icon {
  color: var(--p-primary-500);
  font-size: 1.5rem;
}

.auth-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  max-width: 440px;
  width: 100%;
  margin: 0 auto;
}

.auth-footer {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8rem;
  color: var(--p-text-color-secondary);
  text-align: center;
  margin-top: 2rem;
}

.footer-links {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.separator {
  color: var(--p-surface-300);
}

.auth-footer a {
  color: var(--p-text-color-secondary);
  text-decoration: none;
}
.auth-footer a:hover {
  color: var(--p-primary-500);
}

.auth-right {
  display: none;
  width: 50%;
  padding: 1.5rem;
  padding-left: 0;
}

.image-container {
  width: 100%;
  height: 100%;
  border-radius: 1.5rem;
  overflow: hidden;
  position: relative;
}

.image-container img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center 75%; /* Sobe a imagem para posicionar a bola perfeitamente no centro/meio e destacá-la */
}

.image-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  /* Gradiente ultra suave focado apenas na base para dar contraste ao texto */
  background: linear-gradient(to top, rgba(0, 0, 0, 0.8) 0%, rgba(0, 0, 0, 0.3) 30%, rgba(0, 0, 0, 0) 60%);
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  /* Posiciona o texto realmente na parte de baixo, rente à base */
  padding: 4rem 3rem 3rem;
  color: white;
}

.image-overlay h2 {
  font-size: 2.2rem;
  font-weight: 700;
  margin-bottom: 0.75rem;
  line-height: 1.25;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5); /* Sombra no texto */
}

.image-overlay p {
  font-size: 1.05rem;
  opacity: 0.9;
  line-height: 1.5;
  max-width: 90%;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5); /* Sombra no texto */
}

@media (min-width: 1024px) {
  .auth-left {
    width: 50%;
    padding: 3rem 4rem;
  }
  .auth-right {
    display: block;
  }
}
</style>
