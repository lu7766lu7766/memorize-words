<template>
  <div class="mistake-filter" data-testid="mistake-filter">
    <!-- Top Row: Search Input & Quick Actions -->
    <div class="search-row">
      <div class="search-input-wrapper">
        <span class="search-icon">🔍</span>
        <input
          :value="currentSearch"
          type="text"
          class="search-input"
          data-testid="search-input"
          placeholder="搜尋單字英文或中文釋義..."
          @input="onSearchInput"
        />
        <button
          v-if="currentSearch"
          type="button"
          class="clear-search-btn"
          data-testid="clear-search-btn"
          aria-label="清除搜尋"
          @click="clearSearch"
        >
          ✕
        </button>
      </div>

      <button
        type="button"
        class="filter-tab-btn"
        :class="{ active: currentOnlyLeech }"
        data-testid="only-leech-toggle"
        @click="toggleOnlyLeech"
      >
        🔥 僅頑固字
      </button>
    </div>

    <!-- Bottom Row: Category & Sort Controls -->
    <div class="selects-row">
      <!-- Category Filter -->
      <div class="select-group">
        <label for="category-select" class="select-label">詞庫範圍：</label>
        <select
          id="category-select"
          :value="currentCategory"
          class="filter-select"
          data-testid="category-select"
          @change="onCategoryChange"
        >
          <option value="all">全部詞庫</option>
          <optgroup label="高中學測 (GSAT)">
            <option value="gsat">學測全部 (Level 1~6)</option>
            <option value="gsat-1">學測 Level 1</option>
            <option value="gsat-2">學測 Level 2</option>
            <option value="gsat-3">學測 Level 3</option>
            <option value="gsat-4">學測 Level 4</option>
            <option value="gsat-5">學測 Level 5</option>
            <option value="gsat-6">學測 Level 6</option>
          </optgroup>
          <optgroup label="多益 (TOEIC)">
            <option value="toeic">多益全部</option>
            <option value="toeic-entry">多益入門</option>
            <option value="toeic-intermediate">多益中階</option>
            <option value="toeic-advanced">多益進階</option>
          </optgroup>
        </select>
      </div>

      <!-- Sort Options -->
      <div class="select-group">
        <label for="sort-select" class="select-label">排序方式：</label>
        <select
          id="sort-select"
          :value="currentSort"
          class="filter-select"
          data-testid="sort-select"
          @change="onSortChange"
        >
          <option value="mistakes-desc">依答錯次數 (高到低)</option>
          <option value="recent">依最近答錯時間</option>
          <option value="alphabetical">依單字字母順序 (A-Z)</option>
        </select>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

export type SortOption = 'mistakes-desc' | 'recent' | 'alphabetical';

export interface FilterOptions {
  search: string;
  category: string;
  sortBy: SortOption;
  onlyLeech: boolean;
}

const props = withDefaults(
  defineProps<{
    modelValue?: FilterOptions;
    search?: string;
    category?: string;
    sortBy?: SortOption;
    onlyLeech?: boolean;
  }>(),
  {
    search: '',
    category: 'all',
    sortBy: 'mistakes-desc',
    onlyLeech: false,
  }
);

const emit = defineEmits<{
  (e: 'update:modelValue', value: FilterOptions): void;
  (e: 'update:search', value: string): void;
  (e: 'update:category', value: string): void;
  (e: 'update:sortBy', value: SortOption): void;
  (e: 'update:onlyLeech', value: boolean): void;
  (e: 'change', value: FilterOptions): void;
}>();

const currentSearch = computed(() => {
  return props.modelValue?.search ?? props.search;
});

const currentCategory = computed(() => {
  return props.modelValue?.category ?? props.category;
});

const currentSort = computed(() => {
  return props.modelValue?.sortBy ?? props.sortBy;
});

const currentOnlyLeech = computed(() => {
  return props.modelValue?.onlyLeech ?? props.onlyLeech;
});

function emitAll(next: Partial<FilterOptions>) {
  const updated: FilterOptions = {
    search: next.search !== undefined ? next.search : currentSearch.value,
    category: next.category !== undefined ? next.category : currentCategory.value,
    sortBy: next.sortBy !== undefined ? next.sortBy : currentSort.value,
    onlyLeech: next.onlyLeech !== undefined ? next.onlyLeech : currentOnlyLeech.value,
  };
  emit('update:modelValue', updated);
  emit('change', updated);
}

function onSearchInput(event: Event) {
  const value = (event.target as HTMLInputElement).value;
  emit('update:search', value);
  emitAll({ search: value });
}

function clearSearch() {
  emit('update:search', '');
  emitAll({ search: '' });
}

function onCategoryChange(event: Event) {
  const value = (event.target as HTMLSelectElement).value;
  emit('update:category', value);
  emitAll({ category: value });
}

function onSortChange(event: Event) {
  const value = (event.target as HTMLSelectElement).value as SortOption;
  emit('update:sortBy', value);
  emitAll({ sortBy: value });
}

function toggleOnlyLeech() {
  const nextVal = !currentOnlyLeech.value;
  emit('update:onlyLeech', nextVal);
  emitAll({ onlyLeech: nextVal });
}
</script>

<style scoped>
.mistake-filter {
  background-color: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 12px;
  margin-bottom: 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.search-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.search-input-wrapper {
  flex: 1;
  position: relative;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  left: 10px;
  font-size: 0.875rem;
  color: #94a3b8;
  pointer-events: none;
}

.search-input {
  width: 100%;
  padding: 8px 32px 8px 34px;
  font-size: 0.875rem;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  outline: none;
  background-color: #f8fafc;
  transition: all 0.15s;
  box-sizing: border-box;
}

.search-input:focus {
  border-color: #2563eb;
  background-color: #ffffff;
  box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.1);
}

.clear-search-btn {
  position: absolute;
  right: 8px;
  background: none;
  border: none;
  font-size: 0.8125rem;
  color: #94a3b8;
  cursor: pointer;
  padding: 2px 4px;
}

.clear-search-btn:hover {
  color: #475569;
}

.filter-tab-btn {
  background-color: #f1f5f9;
  border: 1px solid #cbd5e1;
  color: #475569;
  font-size: 0.8125rem;
  font-weight: 600;
  padding: 8px 12px;
  border-radius: 8px;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s;
}

.filter-tab-btn.active {
  background-color: #fee2e2;
  border-color: #fca5a5;
  color: #b91c1c;
}

.selects-row {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.select-group {
  flex: 1;
  min-width: 140px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.select-label {
  font-size: 0.75rem;
  color: #64748b;
  white-space: nowrap;
}

.filter-select {
  flex: 1;
  padding: 6px 8px;
  font-size: 0.8125rem;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  background-color: #ffffff;
  color: #1e293b;
  outline: none;
  cursor: pointer;
  transition: border-color 0.15s;
}

.filter-select:focus {
  border-color: #2563eb;
}
</style>
