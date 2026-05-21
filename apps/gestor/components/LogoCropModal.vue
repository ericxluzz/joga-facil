<template>
  <Teleport to="body">
    <div v-if="visible" class="crop-backdrop" @click.self="cancel">
      <div class="crop-modal">
        <div class="crop-header">
          <h3>Ajustar logotipo</h3>
          <button class="crop-close" @click="cancel"><i class="pi pi-times" /></button>
        </div>

        <div class="crop-body">
          <div class="crop-stage" ref="stageRef">
            <img ref="imgRef" :src="srcUrl" class="crop-img" draggable="false" />
            <div
              class="crop-box"
              :style="boxStyle"
              @mousedown.prevent="startDrag"
              @touchstart.prevent="startTouchDrag"
            >
              <div class="crop-corners">
                <span /><span /><span /><span />
              </div>
              <div class="crop-guide" />
            </div>
          </div>
          <p class="crop-hint">Arraste para posicionar · O logotipo será salvo em 512×512px</p>
        </div>

        <div class="crop-footer">
          <button class="btn-cancel" @click="cancel">Cancelar</button>
          <button class="btn-confirm" @click="confirm">
            <i class="pi pi-check" /> Usar esta imagem
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
const props = defineProps<{ visible: boolean; file: File | null }>();
const emit  = defineEmits<{ (e: 'confirm', blob: Blob): void; (e: 'cancel'): void }>();

const stageRef = ref<HTMLDivElement>();
const imgRef   = ref<HTMLImageElement>();

const srcUrl   = ref('');
const imgNaturalW = ref(0);
const imgNaturalH = ref(0);
const imgDisplayW = ref(0);
const imgDisplayH = ref(0);

// posição do crop box (em px, relativo à img renderizada)
const boxX = ref(0);
const boxY = ref(0);
const boxSize = ref(0); // sempre quadrado

watch(() => props.file, async (f) => {
  if (!f) return;
  srcUrl.value = URL.createObjectURL(f);
  await nextTick();
  await loadImageMeta();
});

async function loadImageMeta() {
  if (!imgRef.value) return;
  await new Promise<void>(res => {
    if (imgRef.value!.complete) { res(); return; }
    imgRef.value!.onload = () => res();
  });
  imgNaturalW.value = imgRef.value!.naturalWidth;
  imgNaturalH.value = imgRef.value!.naturalHeight;
  imgDisplayW.value = imgRef.value!.clientWidth;
  imgDisplayH.value = imgRef.value!.clientHeight;

  // Crop inicial: centro, tamanho = min(w,h)
  const size = Math.min(imgDisplayW.value, imgDisplayH.value);
  boxSize.value = size;
  boxX.value = (imgDisplayW.value - size) / 2;
  boxY.value = (imgDisplayH.value - size) / 2;
}

const boxStyle = computed(() => ({
  left: `${boxX.value}px`,
  top:  `${boxY.value}px`,
  width:  `${boxSize.value}px`,
  height: `${boxSize.value}px`,
}));

// ── Drag logic ─────────────────────────────────────────────
let dragging = false;
let dragStartX = 0;
let dragStartY = 0;
let dragOriginX = 0;
let dragOriginY = 0;

function startDrag(e: MouseEvent) {
  dragging = true;
  dragStartX  = e.clientX;
  dragStartY  = e.clientY;
  dragOriginX = boxX.value;
  dragOriginY = boxY.value;
  window.addEventListener('mousemove', onDrag);
  window.addEventListener('mouseup',   stopDrag);
}

function onDrag(e: MouseEvent) {
  if (!dragging) return;
  moveBox(e.clientX - dragStartX, e.clientY - dragStartY);
}

function stopDrag() {
  dragging = false;
  window.removeEventListener('mousemove', onDrag);
  window.removeEventListener('mouseup',   stopDrag);
}

function startTouchDrag(e: TouchEvent) {
  const t = e.touches[0];
  dragStartX  = t.clientX;
  dragStartY  = t.clientY;
  dragOriginX = boxX.value;
  dragOriginY = boxY.value;
  window.addEventListener('touchmove',  onTouchDrag, { passive: false });
  window.addEventListener('touchend',   stopTouchDrag);
}
function onTouchDrag(e: TouchEvent) {
  e.preventDefault();
  const t = e.touches[0];
  moveBox(t.clientX - dragStartX, t.clientY - dragStartY);
}
function stopTouchDrag() {
  window.removeEventListener('touchmove',  onTouchDrag);
  window.removeEventListener('touchend',   stopTouchDrag);
}

function moveBox(dx: number, dy: number) {
  const maxX = imgDisplayW.value - boxSize.value;
  const maxY = imgDisplayH.value - boxSize.value;
  boxX.value = Math.max(0, Math.min(dragOriginX + dx, maxX));
  boxY.value = Math.max(0, Math.min(dragOriginY + dy, maxY));
}

// ── Confirm: crop + resize via Canvas ──────────────────────
async function confirm() {
  if (!imgRef.value) return;

  // Escala do display para natural
  const scaleX = imgNaturalW.value / imgDisplayW.value;
  const scaleY = imgNaturalH.value / imgDisplayH.value;

  const sx = boxX.value * scaleX;
  const sy = boxY.value * scaleY;
  const sSize = boxSize.value * Math.min(scaleX, scaleY);

  const canvas = document.createElement('canvas');
  canvas.width  = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(imgRef.value, sx, sy, sSize, sSize, 0, 0, 512, 512);

  canvas.toBlob(blob => {
    if (blob) emit('confirm', blob);
  }, 'image/png', 0.95);
}

function cancel() {
  emit('cancel');
}
</script>

<style scoped>
.crop-backdrop {
  position: fixed; inset: 0; z-index: 1000;
  background: rgba(0,0,0,.55);
  display: flex; align-items: center; justify-content: center;
  padding: 1rem;
}
.crop-modal {
  background: #fff; border-radius: 18px;
  width: 100%; max-width: 480px;
  overflow: hidden;
  box-shadow: 0 24px 64px rgba(0,0,0,.28);
}
.crop-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid #e8ecf0;
}
.crop-header h3 { margin: 0; font-size: .95rem; font-weight: 700; }
.crop-close {
  background: none; border: none; cursor: pointer;
  color: #64748b; font-size: .85rem; width: 30px; height: 30px;
  border-radius: 50%; display: flex; align-items: center; justify-content: center;
}
.crop-close:hover { background: #f1f5f9; }

.crop-body { padding: 16px 20px; }

.crop-stage {
  position: relative;
  width: 100%;
  background: #0a0f1e;
  border-radius: 12px;
  overflow: hidden;
  user-select: none;
}
.crop-img {
  width: 100%;
  display: block;
  opacity: .5;
}
.crop-box {
  position: absolute;
  cursor: grab;
  box-shadow: 0 0 0 9999px rgba(0,0,0,.52);
  border: 2px solid #fff;
  border-radius: 14px;
}
.crop-box:active { cursor: grabbing; }

.crop-corners { position: absolute; inset: -2px; pointer-events: none; }
.crop-corners span {
  position: absolute; width: 12px; height: 12px;
  border: 3px solid #fff;
}
.crop-corners span:nth-child(1) { top: 0; left: 0; border-right: none; border-bottom: none; border-radius: 3px 0 0 0; }
.crop-corners span:nth-child(2) { top: 0; right: 0; border-left: none; border-bottom: none; border-radius: 0 3px 0 0; }
.crop-corners span:nth-child(3) { bottom: 0; left: 0; border-right: none; border-top: none; border-radius: 0 0 0 3px; }
.crop-corners span:nth-child(4) { bottom: 0; right: 0; border-left: none; border-top: none; border-radius: 0 0 3px 0; }

/* Linhas de grade no interior */
.crop-guide {
  position: absolute; inset: 0;
  background-image:
    linear-gradient(rgba(255,255,255,.2) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,.2) 1px, transparent 1px);
  background-size: 33.33% 33.33%;
}

/* A área dentro do box deve aparecer mais nítida */
.crop-box::before {
  content: '';
  position: absolute; inset: 0;
  background: transparent;
}

.crop-hint {
  margin: 10px 0 0; font-size: .75rem; color: #64748b; text-align: center;
}

.crop-footer {
  display: flex; gap: 8px; justify-content: flex-end;
  padding: 12px 20px 16px;
  border-top: 1px solid #e8ecf0;
}
.btn-cancel {
  padding: 9px 18px; border-radius: 10px;
  background: #f1f5f9; border: none; cursor: pointer;
  font-size: .88rem; font-weight: 600; font-family: inherit; color: #475569;
}
.btn-confirm {
  padding: 9px 20px; border-radius: 10px;
  background: #10B981; color: #fff; border: none; cursor: pointer;
  font-size: .88rem; font-weight: 700; font-family: inherit;
  display: flex; align-items: center; gap: 6px;
  transition: filter .15s;
}
.btn-confirm:hover { filter: brightness(1.07); }
</style>
