<script setup lang="ts">
const route = useRoute()

const matchId = computed(() => route.params.id as string)

const tabs = computed(() => [
  {
    label: '개요',
    meta: '현황',
    to: `/match/${matchId.value}`,
    exact: true,
    iconPaths: [
      'M4 10.5 12 4l8 6.5',
      'M6.5 10v8.5h11V10',
      'M9.5 18.5v-5h5v5',
    ],
  },
  {
    label: '라운드',
    meta: '입력',
    to: `/match/${matchId.value}/play`,
    iconPaths: [
      'M5 18c4.5-6.5 9.5-6.5 14 0',
      'M8 14l3-7 2.5 5 2.5-3 2 5',
      'M5 18h14',
    ],
  },
  {
    label: '기록',
    meta: '로그',
    to: `/match/${matchId.value}/history`,
    iconPaths: [
      'M7 4.5h10',
      'M7 9h10',
      'M7 13.5h7',
      'M5 3.5h14v17H5z',
    ],
  },
  {
    label: '분석',
    meta: '비율',
    to: `/match/${matchId.value}/analysis`,
    iconPaths: [
      'M5 19V9',
      'M12 19V5',
      'M19 19v-7',
      'M4 19h16',
    ],
  },
  {
    label: '정산',
    meta: '공유',
    to: `/match/${matchId.value}/settlement`,
    iconPaths: [
      'M7 6.5h10',
      'M7 11.5h10',
      'M8.5 17.5h7',
      'M6 3.5h12v17H6z',
    ],
  },
  {
    label: '설정',
    meta: '참가자',
    to: `/match/${matchId.value}/setup`,
    iconPaths: [
      'M5 7h14',
      'M5 12h14',
      'M5 17h14',
      'M9 7v0',
      'M15 12v0',
      'M11 17v0',
    ],
  },
])

const isActiveTab = (to: string, exact = false) => {
  const currentPath = route.path.replace(/\/$/, '')
  const targetPath = to.replace(/\/$/, '')

  if (exact) {
    return currentPath === targetPath
  }

  return currentPath.startsWith(targetPath)
}
</script>

<template>
  <nav class="bottom-nav" aria-label="경기 메뉴">
    <div class="bottom-nav__inner">
      <NuxtLink
        v-for="tab in tabs"
        :key="tab.to"
        :to="tab.to"
        class="bottom-nav__item"
        :class="{
          'bottom-nav__item--active': isActiveTab(tab.to, tab.exact),
        }"
        :aria-current="isActiveTab(tab.to, tab.exact) ? 'page' : undefined"
      >
        <span class="bottom-nav__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" focusable="false">
            <path
              v-for="iconPath in tab.iconPaths"
              :key="iconPath"
              :d="iconPath"
              pathLength="1"
            />
          </svg>
        </span>
        <span class="bottom-nav__copy">
          <span class="bottom-nav__label">{{ tab.label }}</span>
          <span class="bottom-nav__meta">{{ tab.meta }}</span>
        </span>
      </NuxtLink>
    </div>
  </nav>
</template>

<style lang="scss" scoped>
.bottom-nav {
  position: fixed;
  inset: auto 0 10px;
  z-index: 60;
  display: flex;
  justify-content: center;
  height: var(--shell-nav-h);
  padding: 0 max(12px, env(safe-area-inset-left)) env(safe-area-inset-bottom)
    max(12px, env(safe-area-inset-right));
  pointer-events: none;

  &__inner {
    position: relative;
    display: grid;
    grid-template-columns: repeat(6, minmax(0, 1fr));
    gap: 6px;
    width: min(100%, 920px);
    min-height: 72px;
    padding: 10px;
    border: 1px solid rgba(247, 242, 231, 0.12);
    border-radius: 24px;
    background:
      linear-gradient(135deg, rgba(7, 30, 26, 0.96), rgba(13, 43, 37, 0.95)),
      radial-gradient(circle at 50% 0, rgba(56, 201, 141, 0.14), transparent 58%);
    box-shadow:
      0 18px 42px rgba(6, 18, 15, 0.24),
      0 6px 14px rgba(6, 18, 15, 0.16),
      inset 0 1px 0 rgba(255, 255, 255, 0.08);
    pointer-events: auto;
    backdrop-filter: blur(18px);
  }

  &__item {
    position: relative;
    display: grid;
    justify-items: center;
    align-content: center;
    gap: 4px;
    min-width: 0;
    min-height: 52px;
    padding: 6px 5px;
    border: 1px solid transparent;
    border-radius: 16px;
    color: rgba(246, 240, 223, 0.62);
    transition:
      border-color 180ms ease,
      background-color 180ms ease,
      box-shadow 180ms ease,
      color 180ms ease,
      transform 180ms var(--ease-out);

    &::after {
      position: absolute;
      inset: auto 12px 7px;
      height: 2px;
      border-radius: var(--radius-full);
      background: transparent;
      content: '';
      transition:
        background-color 180ms ease,
        box-shadow 180ms ease;
    }

    &:hover {
      color: #fff;
      border-color: rgba(255, 255, 255, 0.08);
      background: rgba(255, 255, 255, 0.055);
    }

    &--active {
      color: #fff;
      border-color: rgba(242, 197, 107, 0.24);
      background: linear-gradient(180deg, rgba(255, 255, 255, 0.115), rgba(255, 255, 255, 0.06));
      box-shadow:
        inset 0 1px 0 rgba(255, 255, 255, 0.12),
        0 8px 18px rgba(0, 0, 0, 0.12);

      &::after {
        background: var(--brass);
        box-shadow: 0 0 12px rgba(242, 197, 107, 0.46);
      }

      .bottom-nav__icon {
        color: #f7df95;
        background: rgba(255, 255, 255, 0.1);
      }
    }
  }

  &__icon {
    display: grid;
    place-items: center;
    width: 32px;
    height: 32px;
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.06);
    transition:
      background-color 180ms ease,
      color 180ms ease,
      box-shadow 180ms ease;

    svg {
      width: 21px;
      height: 21px;
      overflow: visible;
    }

    path {
      fill: none;
      stroke: currentColor;
      stroke-linecap: round;
      stroke-linejoin: round;
      stroke-width: 1.85;
    }
  }

  &__copy {
    display: grid;
    gap: 2px;
    justify-items: center;
    min-width: 0;
    line-height: 1.1;
  }

  &__label {
    font-size: 0.78rem;
    font-weight: 800;
    white-space: nowrap;
  }

  &__meta {
    display: none;
    color: rgba(246, 240, 223, 0.58);
    font-size: 0.68rem;
    font-weight: 700;
    white-space: nowrap;
  }
}

@media (min-width: 760px) {
  .bottom-nav {
    bottom: 18px;

    &__inner {
      gap: 8px;
      min-height: 78px;
      padding: 12px;
      border-radius: 26px;
    }

    &__item {
      grid-template-columns: auto minmax(0, auto);
      justify-content: center;
      justify-items: start;
      align-content: center;
      min-height: 54px;
      padding: 9px 14px;
      gap: 9px;
      border-radius: 18px;
    }

    &__icon {
      width: 38px;
      height: 38px;

      svg {
        width: 23px;
        height: 23px;
      }
    }

    &__copy {
      justify-items: start;
    }

    &__label {
      font-size: 0.86rem;
    }

    &__meta {
      display: block;
    }
  }
}

@media (max-width: 360px) {
  .bottom-nav {
    &__inner {
      gap: 4px;
      padding-inline: 8px;
    }

    &__label {
      font-size: 0.72rem;
    }

  }
}
</style>
