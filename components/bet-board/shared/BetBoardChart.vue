<script setup lang="ts">
import type { Chart, ChartConfiguration, ChartData, ChartOptions, ChartType } from 'chart.js'

interface ChartProps {
  ariaLabel: string
  data: ChartData
  emptyText?: string
  height?: number
  isEmpty?: boolean
  options?: ChartOptions
  type: ChartType
}

let isChartRegistered = false

const props = withDefaults(defineProps<ChartProps>(), {
  emptyText: '표시할 데이터가 없습니다.',
  height: 260,
})

let chartRenderId = 0
let isComponentMounted = false
const canvasElement = ref<HTMLCanvasElement | null>(null)
const chartInstance = shallowRef<Chart | null>(null)

const chartStyle = computed<Record<string, string>>(() => ({
  '--chart-height': `${props.height}px`,
}))

const hasChartData = computed(() =>
  props.data.datasets.some((dataset) => Array.isArray(dataset.data) && dataset.data.length > 0),
)

const shouldShowEmpty = computed(() => props.isEmpty ?? !hasChartData.value)

const resolveChartConstructor = async () => {
  const chartModule = await import('chart.js')

  if (!isChartRegistered) {
    chartModule.Chart.register(
      chartModule.ArcElement,
      chartModule.BarController,
      chartModule.BarElement,
      chartModule.CategoryScale,
      chartModule.DoughnutController,
      chartModule.Filler,
      chartModule.Legend,
      chartModule.LineController,
      chartModule.LineElement,
      chartModule.LinearScale,
      chartModule.PointElement,
      chartModule.Tooltip,
    )
    isChartRegistered = true
  }

  return chartModule.Chart
}

const getChartConfiguration = (): ChartConfiguration => ({
  data: props.data,
  options: props.options,
  type: props.type,
})

const destroyChart = () => {
  chartInstance.value?.destroy()
  chartInstance.value = null
}

const renderChart = async () => {
  const currentRenderId = ++chartRenderId

  if (!import.meta.client || shouldShowEmpty.value || !canvasElement.value) {
    destroyChart()
    return
  }

  const ChartConstructor = await resolveChartConstructor()

  if (currentRenderId !== chartRenderId || !isComponentMounted) {
    return
  }

  if (shouldShowEmpty.value || !canvasElement.value) {
    destroyChart()
    return
  }

  destroyChart()
  chartInstance.value = new ChartConstructor(canvasElement.value, getChartConfiguration())
}

watch(
  () => [props.type, props.data, props.options, props.isEmpty],
  () => {
    void renderChart()
  },
  { deep: true },
)

onMounted(() => {
  isComponentMounted = true
  void renderChart()
})

onBeforeUnmount(() => {
  isComponentMounted = false
  chartRenderId += 1
  destroyChart()
})
</script>

<template>
  <div class="bet-board-chart" :class="{ 'is-empty': shouldShowEmpty }" :style="chartStyle">
    <canvas
      v-show="!shouldShowEmpty"
      ref="canvasElement"
      :aria-label="ariaLabel"
      role="img"
    />

    <div v-if="shouldShowEmpty" class="bet-board-chart__empty">
      {{ emptyText }}
    </div>
  </div>
</template>

<style lang="scss" scoped>
.bet-board-chart {
  position: relative;
  width: 100%;
  height: var(--chart-height);
  min-height: var(--chart-height);

  canvas {
    width: 100% !important;
    height: 100% !important;
  }

  &.is-empty {
    display: grid;
    place-items: center;
  }
}

.bet-board-chart__empty {
  display: grid;
  place-items: center;
  width: 100%;
  min-height: 140px;
  padding: 18px;
  border: 1px dashed var(--border-strong);
  border-radius: 8px;
  color: var(--muted);
  font-size: 0.88rem;
  font-weight: 800;
  text-align: center;
  background: rgba(255, 255, 255, 0.5);
}
</style>
