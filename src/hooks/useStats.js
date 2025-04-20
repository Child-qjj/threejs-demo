import Stats from 'three/examples/jsm/libs/stats.module.js'

export default function useStats() {
  const stats = new Stats()
  // stats.showPanel() // 0: fps, 1: ms, 2: mb, 3+: custom
  document.body.appendChild(stats.dom)
  console.log(stats)

  return stats
}
