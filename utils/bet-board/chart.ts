import { PARTICIPANT_COLORS } from './constants'

const normalizeHexColor = (hexColor: string) => {
  const normalizedColor = hexColor.replace('#', '').trim()

  if (/^[0-9a-fA-F]{3}$/.test(normalizedColor)) {
    return normalizedColor
      .split('')
      .map((colorPart) => `${colorPart}${colorPart}`)
      .join('')
  }

  if (/^[0-9a-fA-F]{6}$/.test(normalizedColor)) {
    return normalizedColor
  }

  return null
}

/**
 * Chart.js 캔버스에서 사용할 수 있도록 hex 색상을 rgba 문자열로 변환합니다.
 */
export const getChartRgbaColor = (hexColor: string, alpha = 1) => {
  const normalizedHexColor = normalizeHexColor(hexColor)

  if (!normalizedHexColor) {
    return hexColor
  }

  const clampedAlpha = Math.min(1, Math.max(0, alpha))
  const red = Number.parseInt(normalizedHexColor.slice(0, 2), 16)
  const green = Number.parseInt(normalizedHexColor.slice(2, 4), 16)
  const blue = Number.parseInt(normalizedHexColor.slice(4, 6), 16)

  return `rgba(${red}, ${green}, ${blue}, ${clampedAlpha})`
}

/**
 * 참가자 순서에 맞는 차트 색상 팔레트를 반환합니다.
 */
export const getParticipantChartPalette = (index: number) => {
  const [startColor, endColor] = PARTICIPANT_COLORS[index % PARTICIPANT_COLORS.length]

  return {
    backgroundColor: getChartRgbaColor(startColor, 0.76),
    borderColor: startColor,
    hoverBackgroundColor: getChartRgbaColor(endColor, 0.86),
    softColor: getChartRgbaColor(startColor, 0.14),
  }
}
