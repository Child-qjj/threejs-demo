import { MeshBasicMaterial, Mesh } from 'three'
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry'
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader'
import fonts from 'three/examples/fonts/helvetiker_regular.typeface.json'

export default function useText() {
  let cachedFont = null,
    font
  const loadFont = async () => {
    if (cachedFont) return cachedFont

    const loader = new FontLoader()
    try {
      cachedFont = await loader.parse(fonts)
      return cachedFont
    } catch (error) {
      console.error('加载字体失败:', error)
      return null
    }
  }
  loadFont().then((loadedFont) => {
    font = loadedFont
  })
  const addText = async (text, fontSize = 0.12, color = 0xffffff) => {
    try {
      if (!font) return null
      const now = performance.now()

      const textGeometry = new TextGeometry(text, {
        font: font,
        size: 0.08,
        height: 0.01,
        depth: 0.0001,
        bevelEnabled: true,
        bevelThickness: 0.005,
        bevelSize: 0.005,
        bevelSegments: 5,
        // size: fontSize,
        // depth: 1,
        // curveSegments: 10,

        // bevelThickness: 1,
        // bevelSize: 1.5,
        // bevelEnabled: true,
        // bevelSegments: 10,
      })
      const material = new MeshBasicMaterial({ color })
      const textMesh = new Mesh(textGeometry, material)
      // 居中文字
      textGeometry.computeBoundingBox()
      const centerOffset = -0.5 * (textGeometry.boundingBox.max.x - textGeometry.boundingBox.min.x)

      textMesh.position.x = centerOffset
      textMesh.position.y = 2
      textMesh.userData.text = text
      const end = performance.now()
      console.log('addText', end - now)
      return textMesh
    } catch (error) {
      console.log(error)
    }
    return null
  }

  const updateText = (textMesh, text) => {
    if (!textMesh || !textMesh.geometry) return
    textMesh.userData.text = text
    console.log(textMesh)

    const textGeometry = textMesh.geometry
    textGeometry.dispose()
    const newTextGeometry = new TextGeometry(text, {
      font: font,
      size: 0.08,
      height: 0.01,
      depth: 0.0001,
      bevelEnabled: true,
      bevelThickness: 0.005,
      bevelSize: 0.005,
      bevelSegments: 5, // 增加细分
    })
    textMesh.geometry = newTextGeometry
    // 居中文字
    newTextGeometry.computeBoundingBox()
    const centerOffset =
      -0.5 * (newTextGeometry.boundingBox.max.x - newTextGeometry.boundingBox.min.x)
    textMesh.position.x = centerOffset
  }
  return {
    addText,
    updateText,
  }
}
