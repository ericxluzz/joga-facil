<template>
  <div class="schedule-editor">
    <p class="hint">
      Cadastre faixas de horário por dia da semana. O multiplicador define preço dinâmico
      (1.0× = preço base, 1.3× = +30% peak, 0.8× = -20% off-peak).
    </p>

    <div v-for="(group, weekday) in groupedRules" :key="weekday" class="weekday-section">
      <div class="weekday-header">
        <strong>{{ weekdayLabel(Number(weekday)) }}</strong>
        <Button icon="pi pi-plus" label="Faixa" text size="small" @click="addRule(Number(weekday))" />
      </div>

      <div v-if="group.length === 0" class="closed">
        <span>Fechado</span>
      </div>

      <div v-else class="rules-list">
        <div v-for="rule in group" :key="rule._key" class="rule-row">
          <div class="rule-fields">
            <div class="field-inline">
              <label>Abre</label>
              <InputMask v-model="rule.startTime" mask="99:99" placeholder="08:00" class="time-input" />
            </div>
            <div class="field-inline">
              <label>Fecha</label>
              <InputMask v-model="rule.endTime" mask="99:99" placeholder="23:00" class="time-input" />
            </div>
            <div class="field-inline">
              <label>Multiplicador</label>
              <InputNumber v-model="rule.priceModifier" suffix="x"
                :min="0.5" :max="3" :step="0.1" :minFractionDigits="1" class="modifier-input" />
            </div>
            <Tag :value="modifierBadge(rule.priceModifier)" :severity="modifierSeverity(rule.priceModifier)" />
          </div>
          <Button icon="pi pi-trash" severity="danger" text rounded
            @click="removeRule(Number(weekday), rule._key)" />
        </div>
      </div>
    </div>

    <div class="quick-actions">
      <Button label="Aplicar 'útil 18h-23h, fim de semana 8h-23h'" outlined size="small" @click="applyPreset" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue';
import InputMask from 'primevue/inputmask';
import InputNumber from 'primevue/inputnumber';
import Button from 'primevue/button';
import Tag from 'primevue/tag';

const props = defineProps<{ resource: any; rules: any[] }>();
const emit = defineEmits<{ (e: 'change', rules: any[]): void }>();

const weekdays = [
  { value: 1, label: 'Segunda' },
  { value: 2, label: 'Terça' },
  { value: 3, label: 'Quarta' },
  { value: 4, label: 'Quinta' },
  { value: 5, label: 'Sexta' },
  { value: 6, label: 'Sábado' },
  { value: 0, label: 'Domingo' },
];

function weekdayLabel(w: number) {
  return weekdays.find((x) => x.value === w)?.label || '';
}

function modifierBadge(m: number) {
  if (m === 1) return 'Padrão';
  if (m > 1) return `Peak +${Math.round((m - 1) * 100)}%`;
  return `Off-peak -${Math.round((1 - m) * 100)}%`;
}

function modifierSeverity(m: number) {
  if (m === 1) return 'secondary';
  if (m > 1) return 'warn';
  return 'info';
}

// Estado local: cópia profunda das regras com _key local
import { ref } from 'vue';
const localRules = ref<any[]>([]);

function syncFromProps() {
  localRules.value = props.rules.map((r) => ({ ...r, _key: r.id || Math.random().toString(36) }));
}

watch(() => props.rules, syncFromProps, { immediate: true });

const groupedRules = computed(() => {
  const out: Record<number, any[]> = {};
  for (const w of weekdays) out[w.value] = [];
  for (const r of localRules.value) {
    if (!out[r.weekday]) out[r.weekday] = [];
    out[r.weekday].push(r);
  }
  return out;
});

function emitChange() {
  emit(
    'change',
    localRules.value.map((r) => ({
      id: r.id,
      resourceId: props.resource.id,
      weekday: r.weekday,
      startTime: r.startTime,
      endTime: r.endTime,
      priceModifier: r.priceModifier,
    })),
  );
}

watch(localRules, emitChange, { deep: true });

function addRule(weekday: number) {
  localRules.value.push({
    _key: Math.random().toString(36),
    weekday,
    startTime: '18:00',
    endTime: '23:00',
    priceModifier: 1.0,
  });
}

function removeRule(weekday: number, key: string) {
  localRules.value = localRules.value.filter((r) => r._key !== key);
}

function applyPreset() {
  localRules.value = [
    ...[1, 2, 3, 4, 5].map((w) => ({
      _key: Math.random().toString(36), weekday: w, startTime: '18:00', endTime: '23:00', priceModifier: 1.0,
    })),
    { _key: Math.random().toString(36), weekday: 5, startTime: '18:00', endTime: '23:00', priceModifier: 1.3 },
    { _key: Math.random().toString(36), weekday: 6, startTime: '08:00', endTime: '23:00', priceModifier: 1.3 },
    { _key: Math.random().toString(36), weekday: 0, startTime: '08:00', endTime: '20:00', priceModifier: 1.0 },
  ];
}
</script>

<style scoped>
.schedule-editor { padding: 1rem 0; }
.hint { color: var(--p-text-color-secondary); font-size: 0.85rem; margin: 0 0 1rem; }

.weekday-section {
  background: var(--p-surface-0);
  border: 1px solid var(--p-surface-200);
  border-radius: 0.75rem;
  padding: 1rem 1.25rem;
  margin-bottom: 0.75rem;
}
.weekday-header {
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 0.75rem;
}
.weekday-header strong { font-size: 0.95rem; color: var(--p-text-color); }

.closed {
  padding: 0.5rem;
  background: var(--p-surface-50);
  border-radius: 0.5rem;
  text-align: center;
  color: var(--p-text-color-secondary);
  font-size: 0.85rem;
}

.rules-list { display: flex; flex-direction: column; gap: 0.5rem; }
.rule-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem;
  border-radius: 0.5rem;
  background: var(--p-surface-50);
}
.rule-fields { display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap; }

.field-inline { display: flex; flex-direction: column; gap: 0.25rem; }
.field-inline label { font-size: 0.7rem; color: var(--p-text-color-secondary); text-transform: uppercase; letter-spacing: 0.02em; }
.time-input { width: 90px; }
.modifier-input { width: 110px; }

.quick-actions { margin-top: 1rem; }
</style>
