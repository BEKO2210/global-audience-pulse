export interface SolarPoint { latitude: number; longitude: number }

export function subsolarPoint(date: Date): SolarPoint {
  const start = Date.UTC(date.getUTCFullYear(), 0, 0)
  const day = (date.getTime() - start) / 86_400_000
  const gamma = 2 * Math.PI / 365 * (day - 1 + (date.getUTCHours() - 12) / 24)
  const decl = 0.006918 - 0.399912 * Math.cos(gamma) + 0.070257 * Math.sin(gamma) - 0.006758 * Math.cos(2 * gamma) + 0.000907 * Math.sin(2 * gamma) - 0.002697 * Math.cos(3 * gamma) + 0.00148 * Math.sin(3 * gamma)
  const equation = 229.18 * (0.000075 + 0.001868 * Math.cos(gamma) - 0.032077 * Math.sin(gamma) - 0.014615 * Math.cos(2 * gamma) - 0.040849 * Math.sin(2 * gamma))
  const utcMinutes = date.getUTCHours() * 60 + date.getUTCMinutes() + date.getUTCSeconds() / 60
  const longitude = ((720 - utcMinutes - equation) / 4 + 540) % 360 - 180
  return { latitude: decl * 180 / Math.PI, longitude }
}

export function solarElevation(latitude: number, longitude: number, date: Date) {
  const sub = subsolarPoint(date)
  const rad = Math.PI / 180
  return Math.asin(Math.sin(latitude * rad) * Math.sin(sub.latitude * rad) + Math.cos(latitude * rad) * Math.cos(sub.latitude * rad) * Math.cos((longitude - sub.longitude) * rad)) / rad
}
