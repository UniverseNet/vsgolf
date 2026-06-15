import AppKit
import CoreGraphics
import Foundation

struct SplashTarget {
  let filename: String
  let width: Int
  let height: Int
}

let rootURL = URL(fileURLWithPath: FileManager.default.currentDirectoryPath)
let splashURL = rootURL.appendingPathComponent("public/splash", isDirectory: true)
let illustrationURL = splashURL.appendingPathComponent("launch-illustration.png")
let iconURL = rootURL.appendingPathComponent("assets/icons/app-icon-1024.png")

guard let illustration = NSImage(contentsOf: illustrationURL) else {
  fatalError("launch-illustration.png 파일을 불러오지 못했습니다.")
}

guard let appIcon = NSImage(contentsOf: iconURL) else {
  fatalError("app-icon-1024.png 파일을 불러오지 못했습니다.")
}

let targets = [
  SplashTarget(filename: "apple-splash-640x1136.jpg", width: 640, height: 1136),
  SplashTarget(filename: "apple-splash-750x1334.jpg", width: 750, height: 1334),
  SplashTarget(filename: "apple-splash-828x1792.jpg", width: 828, height: 1792),
  SplashTarget(filename: "apple-splash-1125x2436.jpg", width: 1125, height: 2436),
  SplashTarget(filename: "apple-splash-1170x2532.jpg", width: 1170, height: 2532),
  SplashTarget(filename: "apple-splash-1179x2556.jpg", width: 1179, height: 2556),
  SplashTarget(filename: "apple-splash-1242x2208.jpg", width: 1242, height: 2208),
  SplashTarget(filename: "apple-splash-1242x2688.jpg", width: 1242, height: 2688),
  SplashTarget(filename: "apple-splash-1284x2778.jpg", width: 1284, height: 2778),
  SplashTarget(filename: "apple-splash-1290x2796.jpg", width: 1290, height: 2796),
  SplashTarget(filename: "apple-splash-1536x2048.jpg", width: 1536, height: 2048),
  SplashTarget(filename: "apple-splash-1668x2224.jpg", width: 1668, height: 2224),
  SplashTarget(filename: "apple-splash-1668x2388.jpg", width: 1668, height: 2388),
  SplashTarget(filename: "apple-splash-2048x2732.jpg", width: 2048, height: 2732),
]

func color(hex: String, alpha: CGFloat = 1) -> NSColor {
  let scanner = Scanner(string: hex.replacingOccurrences(of: "#", with: ""))
  var value: UInt64 = 0
  scanner.scanHexInt64(&value)

  return NSColor(
    calibratedRed: CGFloat((value >> 16) & 0xff) / 255,
    green: CGFloat((value >> 8) & 0xff) / 255,
    blue: CGFloat(value & 0xff) / 255,
    alpha: alpha
  )
}

func aspectFillSourceRect(sourceSize: NSSize, targetSize: NSSize) -> NSRect {
  let sourceRatio = sourceSize.width / sourceSize.height
  let targetRatio = targetSize.width / targetSize.height

  if targetRatio > sourceRatio {
    let cropHeight = sourceSize.width / targetRatio
    let focusY = sourceSize.height * 0.47
    let originY = min(max(0, focusY - cropHeight / 2), sourceSize.height - cropHeight)
    return NSRect(x: 0, y: originY, width: sourceSize.width, height: cropHeight)
  }

  let cropWidth = sourceSize.height * targetRatio
  let originX = min(max(0, (sourceSize.width - cropWidth) / 2), sourceSize.width - cropWidth)
  return NSRect(x: originX, y: 0, width: cropWidth, height: sourceSize.height)
}

func drawGradient(
  in rect: NSRect,
  colors: [NSColor],
  locations: [CGFloat],
  start: CGPoint,
  end: CGPoint
) {
  guard let context = NSGraphicsContext.current?.cgContext else {
    return
  }

  let colorSpace = CGColorSpaceCreateDeviceRGB()
  let cgColors = colors.map { $0.cgColor } as CFArray

  guard let gradient = CGGradient(colorsSpace: colorSpace, colors: cgColors, locations: locations) else {
    return
  }

  context.saveGState()
  context.clip(to: rect)
  context.drawLinearGradient(gradient, start: start, end: end, options: [])
  context.restoreGState()
}

func drawCenteredText(
  _ text: String,
  font: NSFont,
  textColor: NSColor,
  centerX: CGFloat,
  baselineY: CGFloat,
  letterSpacing: CGFloat = 0,
  shadowAlpha: CGFloat = 0.28
) {
  let paragraph = NSMutableParagraphStyle()
  paragraph.alignment = .center

  let shadow = NSShadow()
  shadow.shadowBlurRadius = font.pointSize * 0.16
  shadow.shadowOffset = NSSize(width: 0, height: -font.pointSize * 0.06)
  shadow.shadowColor = color(hex: "#03120f", alpha: shadowAlpha)

  let attributedText = NSAttributedString(
    string: text,
    attributes: [
      .font: font,
      .foregroundColor: textColor,
      .kern: letterSpacing,
      .paragraphStyle: paragraph,
      .shadow: shadow,
    ]
  )
  let size = attributedText.size()
  attributedText.draw(at: NSPoint(x: centerX - size.width / 2, y: baselineY))
}

func drawRoundedIcon(icon: NSImage, rect: NSRect, radius: CGFloat) {
  let path = NSBezierPath(roundedRect: rect, xRadius: radius, yRadius: radius)

  NSGraphicsContext.saveGraphicsState()
  let shadow = NSShadow()
  shadow.shadowBlurRadius = rect.width * 0.12
  shadow.shadowOffset = NSSize(width: 0, height: -rect.width * 0.035)
  shadow.shadowColor = color(hex: "#020b09", alpha: 0.34)
  shadow.set()
  color(hex: "#ffffff", alpha: 0.16).setFill()
  path.fill()
  NSGraphicsContext.restoreGraphicsState()

  NSGraphicsContext.saveGraphicsState()
  path.addClip()
  icon.draw(
    in: rect,
    from: NSRect(origin: .zero, size: icon.size),
    operation: .sourceOver,
    fraction: 1,
    respectFlipped: false,
    hints: [.interpolation: NSImageInterpolation.high]
  )
  NSGraphicsContext.restoreGraphicsState()

  color(hex: "#ffffff", alpha: 0.22).setStroke()
  path.lineWidth = max(1, rect.width * 0.006)
  path.stroke()
}

func drawBottomMark(canvas: NSRect, width: CGFloat, height: CGFloat) {
  let pillWidth = min(width * 0.62, 760)
  let pillHeight = max(width * 0.065, 52)
  let pillRect = NSRect(
    x: (width - pillWidth) / 2,
    y: height * 0.072,
    width: pillWidth,
    height: pillHeight
  )
  let pillPath = NSBezierPath(roundedRect: pillRect, xRadius: pillHeight / 2, yRadius: pillHeight / 2)

  color(hex: "#071f1a", alpha: 0.56).setFill()
  pillPath.fill()
  color(hex: "#f2c56b", alpha: 0.26).setStroke()
  pillPath.lineWidth = max(1, width * 0.002)
  pillPath.stroke()

  let fontSize = max(width * 0.024, 18)
  drawCenteredText(
    "라운드 부담 · 실시간 정산",
    font: .systemFont(ofSize: fontSize, weight: .semibold),
    textColor: color(hex: "#f6f0df", alpha: 0.92),
    centerX: canvas.midX,
    baselineY: pillRect.midY - fontSize * 0.38,
    shadowAlpha: 0.18
  )
}

func render(target: SplashTarget) throws {
  let width = CGFloat(target.width)
  let height = CGFloat(target.height)
  let canvas = NSRect(x: 0, y: 0, width: width, height: height)
  let output = NSImage(size: canvas.size)

  output.lockFocus()
  NSGraphicsContext.current?.imageInterpolation = .high

  color(hex: "#071e1a").setFill()
  canvas.fill()

  illustration.draw(
    in: canvas,
    from: aspectFillSourceRect(sourceSize: illustration.size, targetSize: canvas.size),
    operation: .sourceOver,
    fraction: 1,
    respectFlipped: false,
    hints: [.interpolation: NSImageInterpolation.high]
  )

  color(hex: "#061a16", alpha: 0.18).setFill()
  canvas.fill(using: .sourceOver)

  drawGradient(
    in: canvas,
    colors: [color(hex: "#04120f", alpha: 0.92), color(hex: "#071e1a", alpha: 0.58), color(hex: "#071e1a", alpha: 0)],
    locations: [0, 0.42, 1],
    start: CGPoint(x: width / 2, y: height),
    end: CGPoint(x: width / 2, y: height * 0.38)
  )
  drawGradient(
    in: canvas,
    colors: [color(hex: "#030c0a", alpha: 0.72), color(hex: "#030c0a", alpha: 0)],
    locations: [0, 1],
    start: CGPoint(x: width / 2, y: 0),
    end: CGPoint(x: width / 2, y: height * 0.34)
  )

  let iconSize = min(max(width * 0.17, 112), 220)
  let topMargin = max(height * 0.118, 108)
  let iconRect = NSRect(
    x: (width - iconSize) / 2,
    y: height - topMargin - iconSize,
    width: iconSize,
    height: iconSize
  )
  drawRoundedIcon(icon: appIcon, rect: iconRect, radius: iconSize * 0.24)

  let brandFontSize = min(max(width * 0.086, 54), 116)
  let titleFontSize = min(max(width * 0.043, 29), 62)
  let subtitleFontSize = min(max(width * 0.028, 20), 40)

  drawCenteredText(
    "VSGolf",
    font: .systemFont(ofSize: brandFontSize, weight: .heavy),
    textColor: color(hex: "#f7f2e7"),
    centerX: canvas.midX,
    baselineY: iconRect.minY - brandFontSize * 1.1,
    letterSpacing: 0.2,
    shadowAlpha: 0.34
  )
  drawCenteredText(
    "저녁내기 보드",
    font: .systemFont(ofSize: titleFontSize, weight: .bold),
    textColor: color(hex: "#c7f6e6"),
    centerX: canvas.midX,
    baselineY: iconRect.minY - brandFontSize * 1.68,
    shadowAlpha: 0.26
  )
  drawCenteredText(
    "스크린골프 라운드와 정산을 한 화면에",
    font: .systemFont(ofSize: subtitleFontSize, weight: .semibold),
    textColor: color(hex: "#f6f0df", alpha: 0.82),
    centerX: canvas.midX,
    baselineY: iconRect.minY - brandFontSize * 2.12,
    shadowAlpha: 0.24
  )

  drawBottomMark(canvas: canvas, width: width, height: height)

  output.unlockFocus()

  guard
    let tiffData = output.tiffRepresentation,
    let bitmap = NSBitmapImageRep(data: tiffData),
    let imageData = bitmap.representation(using: .jpeg, properties: [.compressionFactor: 0.86])
  else {
    fatalError("\(target.filename) JPEG 변환에 실패했습니다.")
  }

  try imageData.write(to: splashURL.appendingPathComponent(target.filename), options: .atomic)
}

try FileManager.default.createDirectory(at: splashURL, withIntermediateDirectories: true)

for target in targets {
  try render(target: target)
  print("Generated \(target.filename)")
}
